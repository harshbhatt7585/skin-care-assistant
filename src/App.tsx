import { useState, useEffect, useRef } from 'react'
import './App.css'
import ScanVisualization from './components/ScanVisualization'
import ScanMetricsPanel, { type ScanMetrics } from './components/ScanMetricsPanel'
import CaptureGuidance from './components/CaptureGuidance'
import Chats, { type ChatsHandle } from './components/Chats'
import { runInitialWorkflowSequenced, type AgentWorkflowStep } from './lib/openai'
import { detectFaceFromDataUrl } from './lib/faceDetection'
import { getAuth, signOut, type User } from 'firebase/auth'
import { getMessages } from './api/chats'
import type { ChatMessage as PersistedChatMessage } from './types/chats'


type AppProps = {
  user: User | null
}

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

function App({ user }: AppProps) {
  const [photos, setPhotos] = useState<string[]>([])
  const [status, setStatus] = useState('Upload a clear photo to begin.')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setLoading] = useState(false)
  const [scanMetrics, setScanMetrics] = useState<ScanMetrics | null>(null)
  const [country, setCountry] = useState<string | null>(null)
  const [persistedMessages, setPersistedMessages] = useState<PersistedChatMessage[] | null>(null)
  const [isCaptureActive, setCaptureActive] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [captureStep, setCaptureStep] = useState(0)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chatsRef = useRef<ChatsHandle | null>(null)
  const [agentStep, setAgentStep] = useState<AgentWorkflowStep | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
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

  useEffect(() => {
    chatsRef.current?.reset()
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid) {
      setPersistedMessages([])
      return
    }

    setPersistedMessages(null)
    let cancelled = false

    const fetchMessages = async () => {
      try {
        const messages = await getMessages(user.uid)
        if (!cancelled) {
          setPersistedMessages(messages)
        }
      } catch (err) {
        console.error('Failed to fetch chat messages', err)
        if (!cancelled) {
          setPersistedMessages([])
        }
      }
    }

    fetchMessages()

    return () => {
      cancelled = true
    }
  }, [user?.uid])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showUserMenu) {
        const target = event.target as HTMLElement
        if (!target.closest('.account-menu')) {
          setShowUserMenu(false)
        }
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showUserMenu])

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
            chatsRef.current?.replaceWithAssistantMessages([analysis], historySnapshot)
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
            chatsRef.current?.appendAssistantMessage(shopping, historySnapshot)
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

  const handleSignOut = async () => {
    try {
      const auth = getAuth()
      await signOut(auth)
    } catch (err) {
      console.error('Sign out error:', err)
    }
  }

  const getUserDisplayName = () => {
    if (!user) return ''
    return user.displayName || user.email?.split('@')[0] || 'User'
  }

  const hasPersistedChat = (persistedMessages?.length ?? 0) > 0
  const shouldShowChatExperience = photos.length >= MIN_PHOTOS_REQUIRED || hasPersistedChat
  const isLoadingPersistedMessages = Boolean(user?.uid) && persistedMessages === null

  return (
    <div className="page">
      <header className="hero">
        <div className="hero__text">
          <h1 className="brand-logo">
            <span className="brand-logo__glow" aria-hidden="true">Glowly</span>
            <span className="brand-logo__text">Glowly</span>
          </h1>
          <p className="hero__tagline">Your AI-powered skin care companion</p>
        </div>
        <div className="account-menu">
          <button
            className="account-button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-label="Account menu"
          >
            <span className="account-button__avatar">
              {getUserDisplayName().charAt(0).toUpperCase()}
            </span>
          </button>
          {showUserMenu && (
            <div className="account-dropdown">
              <div className="account-dropdown__info">
                <p className="account-dropdown__name">{getUserDisplayName()}</p>
                {user?.email && (
                  <p className="account-dropdown__email">{user.email}</p>
                )}
              </div>
              <button
                className="account-dropdown__signout"
                onClick={handleSignOut}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {status.startsWith('Analyzing face') && (
        <div className="analysis-banner">
          <span className="pulse-dot" />
          <p>{status}</p>
        </div>
      )}

      <main className="simple-main">
        {isLoadingPersistedMessages ? (
          <section className="messages-loader" aria-busy="true" aria-live="polite">
            <div className="messages-loader__visual">
              <div className="messages-loader__shimmer" />
            </div>
          </section>
        ) : !shouldShowChatExperience ? (
          <section className="upload-panel">
            <button
              type="button"
              className="cta-elegant"
              onClick={activateCapture}
              disabled={isLoading}
            >
              <span className="cta-elegant__text">Get Started</span>
              <span className="cta-elegant__icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </span>
            </button>

            {error && <p className="face-error">{error}</p>}

            {isCaptureActive && (
              <div className="camera-panel">
                {captureStep < CAPTURE_INSTRUCTIONS.length && (
                  <p className="capture-instruction">
                    Step {captureStep + 1} of {CAPTURE_INSTRUCTIONS.length}: {CAPTURE_INSTRUCTIONS[captureStep]}
                  </p>
                )}
                <div className="camera-preview__wrapper">
                  <video
                    ref={videoRef}
                    className="camera-preview"
                    autoPlay
                    playsInline
                    muted
                    onLoadedMetadata={() => setCameraReady(true)}
                  />
                  {captureStep < CAPTURE_INSTRUCTIONS.length && (
                    <CaptureGuidance
                      videoRef={videoRef}
                      instruction={CAPTURE_INSTRUCTIONS[captureStep]}
                      isActive={isCaptureActive}
                    />
                  )}
                </div>
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

            <Chats
              ref={chatsRef}
              photos={photos}
              country={country}
              isLoading={isLoading}
              setLoading={setLoading}
              setStatus={setStatus}
              setError={setError}
              minPhotosRequired={MIN_PHOTOS_REQUIRED}
              initialMessages={persistedMessages ?? undefined}
              uid={user?.uid ?? null}
            />
          </section>
        )}
      </main>
    </div>
  )
}

export default App
