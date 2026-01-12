import { useState, useEffect, useRef } from 'react'
import './App.css'
import ScanVisualization from './components/ScanVisualization'
import ScanMetricsPanel, { type ScanMetrics } from './components/ScanMetricsPanel'
import ProductShowcase from './components/ProductShowcase'
import ShoppingPreview from './components/ShoppingPreview'
import { parseProductSections, parseShoppingPayload, stripToolArtifacts } from './lib/parsers'
import { runChatTurn, runInitialWorkflowSequenced, type AgentWorkflowStep } from './lib/openai'
import { detectFaceFromDataUrl } from './lib/faceDetection'


type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type ConversationTurn = { role: 'user' | 'assistant'; content: string }

const FACE_ERROR_MESSAGE = 'Face not detected, upload Face image'
const MIN_PHOTOS_REQUIRED = 3
const CAPTURE_INSTRUCTIONS = [
  'Capture front face',
  'Capture left side of the face',
  'Capture right side of the face',
]
const AGENT_STEP_COPY: Record<AgentWorkflowStep, string> = {
  verifying: 'Verifying required front + side angles…',
  scanning: 'Scanning photos for visible concerns…',
  analyzing: 'Scoring hydration, tone, and barrier health…',
  shopping: 'Finding matching AM/PM products…',
}

function App() {
  const [photos, setPhotos] = useState<string[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [history, setHistory] = useState<ConversationTurn[]>([])
  const [input, setInput] = useState('')
  const [status, setStatus] = useState('Upload a clear photo to begin.')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setLoading] = useState(false)
  const [scanMetrics, setScanMetrics] = useState<ScanMetrics | null>(null)
  const [country, setCountry] = useState<string | null>(null)
  const [isCaptureActive, setCaptureActive] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [captureStep, setCaptureStep] = useState(0)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [agentStep, setAgentStep] = useState<AgentWorkflowStep | null>(null)
  const activateCapture = () => {
    setCaptureStep(0)
    setCaptureActive(true)
  }

  const deactivateCapture = () => {
    setCaptureActive(false)
    setCaptureStep(0)
  }

  const formatRemainingPhotosMessage = (remaining: number) =>
    `upload (${remaining}) more photo${remaining === 1 ? '' : 's'}`

  function getLocation() {
    if (!navigator.geolocation) {
      console.log("Geolocation is not supported by this browser.");
        "Geolocation is not supported by this browser.";
      return;
    }
  
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;

          // Reverse geocode (OpenStreetMap Nominatim)
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`
          );

          if (!res.ok) throw new Error("Reverse geocoding failed");

          const data = await res.json();
          const foundCountry = data?.address?.country_code;
          console.log('foundCountry', foundCountry)
          if (!foundCountry) {
            setCountry('us');
            return;
          }

          setCountry(foundCountry);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Something went wrong");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLoading(false);
        // Helpful error messages
        if (err.code === 1) setError("Permission denied. Please allow location access.");
        else if (err.code === 2) setError("Position unavailable.");
        else if (err.code === 3) setError("Location request timed out.");
        else setError("Failed to get location.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

  }

  useEffect(() => {
    getLocation()
  }, [])

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraReady(false)
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  useEffect(() => {
    if (!isCaptureActive) {
      stopCamera()
      setCaptureStep(0)
      return
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Camera capture is not supported in this browser.')
      deactivateCapture()
      return
    }

    let cancelled = false

    const enableCamera = async () => {
      try {
        setCameraReady(false)
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to access the camera. Please check permissions.',
          )
          deactivateCapture()
        }
      }
    }

    enableCamera()

    return () => {
      cancelled = true
      stopCamera()
    }
  }, [isCaptureActive])

  useEffect(() => {
    if (isCaptureActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [isCaptureActive, photos.length])

  const processPhotoDataUrl = async (
    dataUrl: string,
  ): Promise<{ stored: boolean; completed: boolean }> => {
    setError(null)
    setStatus('Analyzing face…')
    setLoading(true)

    try {
      const faceDetected = await detectFaceFromDataUrl(dataUrl)
      console.log(`[mediapipe] Face detected: ${faceDetected}`)
      if (!faceDetected) {
        setError(FACE_ERROR_MESSAGE)
        setStatus('Upload a clear photo to begin.')
        return { stored: false, completed: false }
      }
      const nextPhotos = [...photos, dataUrl]
      setPhotos((prev) => [...prev, dataUrl])

      if (nextPhotos.length < MIN_PHOTOS_REQUIRED) {
        const remaining = MIN_PHOTOS_REQUIRED - nextPhotos.length
        const message = formatRemainingPhotosMessage(remaining)
        setError(message)
        setStatus('Add front and side photos for a better analysis.')
        return { stored: true, completed: false }
      }


      setError(null)
      setStatus('Consulting the cosmetist...')
      await runInitialWorkflowSequenced({
        photoDataUrls: nextPhotos,
        country: country ?? 'us',
        callbacks: {
          onStepChange: setAgentStep,
          onAnalysis: (analysis, historySnapshot) => {
            setMessages([{ id: crypto.randomUUID(), role: 'assistant', content: analysis }])
            setHistory(historySnapshot)
            setStatus('Reviewing concerns…')
          },
          onRatings: (ratings) => {
            try {
              const parsed = JSON.parse(ratings)
              setScanMetrics({
                hydration: Number(parsed.hydration),
                oilBalance: Number(parsed.oilBalance),
                tone: Number(parsed.tone),
                barrierStrength: Number(parsed.barrierStrength),
                sensitivity: Number(parsed.sensitivity),
              })
            } catch (error) {
              console.warn('Could not parse scan metrics JSON', error)
            }
          },
          onShopping: (shopping, historySnapshot) => {
            setMessages((prev) => [
              ...prev,
              { id: crypto.randomUUID(), role: 'assistant', content: shopping },
            ])
            setHistory(historySnapshot)
          },
        },
      })
      setStatus('Done. Ask anything else or upload again to iterate.')
      return { stored: true, completed: true }
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Could not process that image. Try another one.')
      setStatus('Upload a clear photo to begin.')
      return { stored: false, completed: false }
    } finally {
      setAgentStep(null)
      setLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files?.length) return

    try {
      for (const file of Array.from(files)) {
        const dataUrl = await readFileAsDataUrl(file)
        await processPhotoDataUrl(dataUrl)
      }
    } finally {
      event.target.value = ''
    }
  }

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error('Unable to read that file.'))
      reader.onload = () => {
        if (typeof reader.result !== 'string') {
          reject(new Error('Unexpected file format.'))
          return
        }
        resolve(reader.result)
      }
      reader.readAsDataURL(file)
    })

  const runAgentTurn = async (
    photoDataUrls: string[],
    nextHistory: ConversationTurn[],
  ): Promise<ConversationTurn[] | undefined> => {
    try {
      setLoading(true)
      setStatus('Consulting the cosmetist...')
      const baseHistory: ConversationTurn[] =
        nextHistory.length === 0
          ? [
              {
                role: 'user' as const,
                content:
                  'Please analyze my bare-face photo and outline AM/PM rituals. Write analysis in points, Write concerns if acne, pigmentation, dark spots, redness, wrinkles, etc. and give rating on these conditions: Hydration, Oil Balance, Tone, Barrier Strength, Sensitivity. Dont explain anything, just the points and ratings.',
              },
            ]
          : nextHistory

      const reply = await runChatTurn({
        photoDataUrls,
        history: baseHistory,
        country: country ?? 'us',
      })
      console.log('reply', reply)
      const finalHistory: ConversationTurn[] = [...baseHistory, { role: 'assistant', content: reply }]
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: reply }])
      setHistory(finalHistory)
      setStatus('Done. Ask anything else or upload again to iterate.')
      return finalHistory
    } catch (err) {
      console.error(err)
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong while generating your plan. Try again.',
      )
      setStatus('Unable to finish. Fix the issue and retry.')
    } finally {
      setLoading(false)
    }
  }

  const handleCapture = async () => {
    if (!videoRef.current || !cameraReady || isLoading) return

    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const context = canvas.getContext('2d')
    if (!context) {
      setError('Unable to capture that frame. Please try again.')
      return
    }

    context.save()
    context.translate(canvas.width, 0)
    context.scale(-1, 1)
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    context.restore()
    const dataUrl = canvas.toDataURL('image/png')
    const result = await processPhotoDataUrl(dataUrl)
    if (result.stored) {
      setCaptureStep((prev) => Math.min(prev + 1, CAPTURE_INSTRUCTIONS.length))
    }
    if (result.completed) {
      stopCamera()
      deactivateCapture()
    }
  }

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!input.trim() || photos.length < MIN_PHOTOS_REQUIRED || isLoading) return

    const userTurn = { role: 'user' as const, content: input.trim() }
    const nextHistory = [...history, userTurn]
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: userTurn.content }])
    setHistory(nextHistory)
    setInput('')
    await runAgentTurn(photos, nextHistory)
  }

  return (
    <div className="page">
      <header className="hero">
        <div className="hero__text">
          <p className="hero__eyebrow">Skin Care Copilot</p>
          <h1>Drop a bare-face photo.</h1>
        </div>
      </header>

      {status.startsWith('Analyzing face') && (
        <div className="analysis-banner">
          <span className="pulse-dot" />
          <p>{status}</p>
        </div>
      )}

      <main className="simple-main">
        {photos.length < MIN_PHOTOS_REQUIRED ? (
          <section className="upload-panel">
            <h2>Upload a photo</h2>
            <p>Natural light, no heavy makeup. Everything stays on-device.</p>
            <div className="input-actions">
              <label className="dropzone">
                <span>Upload photo</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} />
              </label>
              <button
                type="button"
                className="capture-button"
                onClick={activateCapture}
                disabled={isLoading}
              >
                Capture
              </button>
            </div>

            {error && <p className="face-error">{error}</p>}

            {isCaptureActive && (
              <div className="camera-panel">
                {captureStep < CAPTURE_INSTRUCTIONS.length && (
                  <p className="capture-instruction">
                    Step {captureStep + 1} of {CAPTURE_INSTRUCTIONS.length}: {CAPTURE_INSTRUCTIONS[captureStep]}
                  </p>
                )}
                <video
                  ref={videoRef}
                  className="camera-preview"
                  autoPlay
                  playsInline
                  muted
                  onLoadedMetadata={() => setCameraReady(true)}
                />
                <div className="camera-actions">
                  <button type="button" onClick={handleCapture} disabled={!cameraReady || isLoading}>
                    {cameraReady ? 'Capture photo' : 'Initializing camera…'}
                  </button>
                  <button type="button" onClick={deactivateCapture}>
                    Close camera
                  </button>
                </div>
              </div>
            )}
          </section>
        ) : (
          <section className="analysis-stack">
            {error && <p className="face-error">{error}</p>}
            <div className="analysis-visual">
              <ScanVisualization photos={photos} isLoading={isLoading} />
              {agentStep && (
                <p className="agent-step" aria-live="assertive">
                  <span className="agent-step__flash" aria-hidden="true" />
                  {AGENT_STEP_COPY[agentStep]}
                </p>
              )}
              {scanMetrics && <ScanMetricsPanel metrics={scanMetrics} />}
            </div>

            <div className="chat-thread">
              <div className="messages">
                {messages.map((message) => {
                  if (message.role === 'user') {
                    return (
                      <article
                        key={message.id}
                        className="bubble bubble--user"
                        dangerouslySetInnerHTML={{ __html: escapeHtml(message.content) }}
                      />
                    )
                  }

                  const parsedShopping = parseShoppingPayload(message.content)
                  if (parsedShopping) {
                    const { payload, remainder } = parsedShopping
                    return (
                      <article key={message.id} className="bubble">
                        {remainder && (
                          <div
                            dangerouslySetInnerHTML={{
                              __html: formatAssistantContent(remainder),
                            }}
                          />
                        )}
                        <ShoppingPreview data={payload} />
                      </article>
                    )
                  }

                  const parsedProducts = parseProductSections(message.content)
                  if (parsedProducts) {
                    const { sections, remainder } = parsedProducts
                    return (
                      <article key={message.id} className="bubble">
                        {remainder && (
                          <div
                            dangerouslySetInnerHTML={{
                              __html: formatAssistantContent(remainder),
                            }}
                          />
                        )}
                        <ProductShowcase sections={sections} />
                      </article>
                    )
                  }

                  return (
                    <article
                      key={message.id}
                      className="bubble"
                      dangerouslySetInnerHTML={{
                        __html: formatAssistantContent(message.content),
                      }}
                    />
                  )
                })}
                {isLoading && (
                  <div className="typing" aria-live="polite" aria-label="Assistant is replying">
                    <span />
                    <span />
                    <span />
                  </div>
                )}
              </div>

              <form className="chat-input" onSubmit={handleSend}>
                <input
                  type="text"
                  placeholder="Ask about substitutions, layering, travel routines..."
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                />
                <button type="submit" disabled={isLoading || !input.trim()}>
                  Send
                </button>
              </form>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

const escapeHtml = (input: string) =>
  input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const formatAssistantContent = (content: string) => stripToolArtifacts(content)

export default App
