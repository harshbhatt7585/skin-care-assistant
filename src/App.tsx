import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import './App.css'
import { requestProductAdvice, type SkinMetric } from './lib/openai'

const FOCUS_OPTIONS = [
  'Hydration cushion',
  'Barrier repair',
  'Calm inflammation',
  'Clarify breakouts',
  'Fade spots + brighten',
  'Smooth texture',
] as const

const ENVIRONMENT_OPTIONS = [
  { label: 'Temperate / mixed climates', value: 'temperate' },
  { label: 'Dry or desert air', value: 'dry' },
  { label: 'Humid / tropical', value: 'humid' },
  { label: 'Cold + indoor heat', value: 'cold' },
] as const

type AnalysisResult = {
  metrics: SkinMetric[]
  summary: string
}

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const [isCameraActive, setCameraActive] = useState(false)
  const [snapshot, setSnapshot] = useState<string | null>(null)
  const [analysisSummary, setAnalysisSummary] = useState('')
  const [metrics, setMetrics] = useState<SkinMetric[]>([])
  const [statusMessage, setStatusMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [concerns, setConcerns] = useState('')
  const [focusAreas, setFocusAreas] = useState<string[]>(['Hydration cushion'])
  const [environment, setEnvironment] = useState('temperate')
  const [routineIntensity, setRoutineIntensity] = useState(3)

  const [isGenerating, setGenerating] = useState(false)
  const [advice, setAdvice] = useState('')

  const cleanupCamera = useCallback(() => {
    const stream = videoRef.current?.srcObject as MediaStream | null
    stream?.getTracks().forEach((track) => track.stop())
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
  }, [])

  useEffect(() => () => cleanupCamera(), [cleanupCamera])

  const handleStartCamera = async () => {
    try {
      setError(null)
      setStatusMessage('Connecting to camera...')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCameraActive(true)
        setStatusMessage('Camera ready. Hold still, then capture a frame.')
      }
    } catch (err) {
      console.error(err)
      setError('Unable to access your camera. Try uploading a clear selfie instead.')
      setStatusMessage('')
    }
  }

  const analyzeFromContext = (context: CanvasRenderingContext2D, width: number, height: number) => {
    const imageData = context.getImageData(0, 0, width, height)
    const { metrics: newMetrics, summary } = analyzeSkinSnapshot(imageData)
    setMetrics(newMetrics)
    setAnalysisSummary(summary)
    setAdvice('')
    return { metrics: newMetrics, summary }
  }

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) {
      setError('Camera not ready yet.')
      return
    }

    const { videoWidth, videoHeight } = videoRef.current
    if (!videoWidth || !videoHeight) {
      setError('Waiting on the camera feed. Try again in a second.')
      return
    }

    canvasRef.current.width = videoWidth
    canvasRef.current.height = videoHeight
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) {
      setError('Could not access drawing context for analysis.')
      return
    }

    ctx.drawImage(videoRef.current, 0, 0, videoWidth, videoHeight)
    const screenshot = canvasRef.current.toDataURL('image/png')
    setSnapshot(screenshot)
    setError(null)
    setStatusMessage('Scan captured. Scroll for insights below.')
    analyzeFromContext(ctx, videoWidth, videoHeight)
  }

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const image = new Image()
      image.onload = () => {
        if (!canvasRef.current) return
        canvasRef.current.width = image.width
        canvasRef.current.height = image.height
        const ctx = canvasRef.current.getContext('2d')
        if (!ctx) return
        ctx.drawImage(image, 0, 0)
        const screenshot = canvasRef.current.toDataURL('image/png')
        setSnapshot(screenshot)
        setStatusMessage('Photo uploaded. Preview + AI readout below.')
        analyzeFromContext(ctx, image.width, image.height)
      }
      if (typeof reader.result === 'string') {
        image.src = reader.result
      }
    }
    reader.readAsDataURL(file)
  }

  const toggleFocusArea = (focus: string) => {
    setFocusAreas((prev) =>
      prev.includes(focus) ? prev.filter((item) => item !== focus) : [...prev, focus],
    )
  }

  const handleGenerateAdvice = async () => {
    if (!metrics.length) {
      setError('Capture or upload a scan before asking for guidance.')
      return
    }

    try {
      setGenerating(true)
      setError(null)
      setStatusMessage('Consulting the cosmetist...')
      const response = await requestProductAdvice({
        metrics,
        concerns,
        focusAreas,
        environment,
        routineIntensity,
      })
      setAdvice(response)
      setStatusMessage('Routine ready — personalize further if needed.')
    } catch (err) {
      console.error(err)
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong while talking to OpenAI. Double-check your API key.',
      )
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Skin & Cosmetist Copilot</p>
          <h1>Scan, decode, and build rituals with AI clarity.</h1>
          <p>
            Capture a live snapshot or upload a clear photo, let the assistant interpret tone,
            hydration, and flare signals, then receive ingredient-forward routines powered by
            OpenAI.
          </p>
          <div className="status-row">
            {statusMessage && <span className="status">{statusMessage}</span>}
            {error && <span className="status error">{error}</span>}
          </div>
        </div>
      </header>

      <main className="layout">
        <section className="panel scan-panel">
          <div className="panel-header">
            <div>
              <h2>1 · Capture your skin snapshot</h2>
              <p>Natural light works best. Remove heavy filters and keep the frame steady.</p>
            </div>
            <div className="actions">
              {!isCameraActive ? (
                <button className="ghost" onClick={handleStartCamera}>
                  Enable live scan
                </button>
              ) : (
                <button className="ghost" onClick={cleanupCamera}>
                  Stop camera
                </button>
              )}
              <label className="ghost upload">
                Upload photo
                <input type="file" accept="image/*" onChange={handleFileUpload} />
              </label>
            </div>
          </div>

          <div className="scanner">
            <div className="viewer">
              {isCameraActive ? (
                <video ref={videoRef} playsInline muted />
              ) : (
                <div className="placeholder">
                  <p>Camera idle. Enable live scan or upload a recent, makeup-free photo.</p>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="viewer">
              {snapshot ? (
                <img src={snapshot} alt="Captured skin" />
              ) : (
                <div className="placeholder">
                  <p>Your capture will appear here for comparison.</p>
                </div>
              )}
            </div>
          </div>

          <div className="scanner-cta">
            <button onClick={handleCapture} disabled={!isCameraActive}>
              Capture frame
            </button>
          </div>

          {metrics.length > 0 && (
            <div className="insights">
              <div>
                <p className="eyebrow">AI skin read</p>
                <h3>{analysisSummary}</h3>
                <p>
                  These metrics look at color, tone, and contrast data from the snapshot. They act
                  as signals for the LLM cosmetist — not a medical diagnosis.
                </p>
              </div>
              <div className="metric-grid">
                {metrics.map((metric) => (
                  <article key={metric.key} className="metric-card">
                    <div className="metric-header">
                      <span>{metric.label}</span>
                      <strong>{metric.value}</strong>
                    </div>
                    <div className="meter">
                      <div style={{ width: `${metric.value}%` }} />
                    </div>
                    <p>{metric.summary}</p>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="panel plan-panel">
          <div className="panel-header">
            <div>
              <h2>2 · Tell the AI what matters</h2>
              <p>Share flare triggers, lifestyle notes, or hero ingredients you love.</p>
            </div>
          </div>

          <div className="preferences">
            <label className="field">
              <span>Concerns, triggers, lifestyle notes</span>
              <textarea
                placeholder="Maskne, SPF sensitivity, post-travel dehydration, etc."
                rows={4}
                value={concerns}
                onChange={(event) => setConcerns(event.target.value)}
              />
            </label>

            <div className="field">
              <span>Focus areas</span>
              <div className="chips">
                {FOCUS_OPTIONS.map((focus) => {
                  const isActive = focusAreas.includes(focus)
                  return (
                    <button
                      type="button"
                      key={focus}
                      className={isActive ? 'chip active' : 'chip'}
                      onClick={() => toggleFocusArea(focus)}
                    >
                      {focus}
                    </button>
                  )
                })}
              </div>
            </div>

            <label className="field">
              <span>Climate / environment</span>
              <select value={environment} onChange={(event) => setEnvironment(event.target.value)}>
                {ENVIRONMENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Routine intensity: {routineIntensity}/5</span>
              <input
                type="range"
                min={1}
                max={5}
                value={routineIntensity}
                onChange={(event) => setRoutineIntensity(Number(event.target.value))}
              />
              <p className="hint">
                1 = minimalist essentials, 5 = treatment-heavy ritual. We will always keep it safe
                and patch-test friendly.
              </p>
            </label>
          </div>

          <div className="scanner-cta">
            <button onClick={handleGenerateAdvice} disabled={isGenerating}>
              {isGenerating ? 'Drafting your ritual...' : 'Build my ritual'}
            </button>
          </div>

          {advice && (
            <article className="ai-response">
              <p className="eyebrow">AI ritual blueprint</p>
              <pre>{advice}</pre>
            </article>
          )}

          <p className="disclaimer">
            This assistant is not a dermatologist. Use the plan as education, patch test everything,
            and speak with a professional for medical advice.
          </p>
        </section>
      </main>
    </div>
  )
}

const analyzeSkinSnapshot = (image: ImageData): AnalysisResult => {
  const { data, width, height } = image
  const pixelCount = width * height
  let redSum = 0
  let greenSum = 0
  let blueSum = 0
  let brightnessSum = 0
  let brightnessSqSum = 0
  let chromaSum = 0
  let textureDelta = 0

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    redSum += r
    greenSum += g
    blueSum += b

    const brightness = (r + g + b) / 3 / 255
    brightnessSum += brightness
    brightnessSqSum += brightness * brightness

    const maxChannel = Math.max(r, g, b)
    const minChannel = Math.min(r, g, b)
    chromaSum += (maxChannel - minChannel) / 255

    const neutral = (r + g + b) / 3
    textureDelta += Math.abs(r - neutral) + Math.abs(g - neutral) + Math.abs(b - neutral)
  }

  const avgRed = redSum / pixelCount / 255
  const avgGreen = greenSum / pixelCount / 255
  const avgBlue = blueSum / pixelCount / 255
  const avgBrightness = brightnessSum / pixelCount
  const brightnessVariance = brightnessSqSum / pixelCount - avgBrightness ** 2
  const contrast = Math.min(1, Math.sqrt(Math.max(0, brightnessVariance)) * 1.6)
  const avgChroma = chromaSum / pixelCount
  const textureScore = Math.min(1, textureDelta / (pixelCount * 255 * 1.5))
  const smoothness = clamp01(1 - textureScore)
  const rednessTilt = clamp01(avgRed - (avgGreen + avgBlue) / 2)

  const hydrationScore = clamp100((1 - avgBrightness) * 115 + smoothness * 20)
  const oilScore = clamp100(avgBrightness * 120 + avgChroma * 25)
  const sensitivityScore = clamp100(rednessTilt * 160 + contrast * 25)
  const toneScore = clamp100((1 - contrast) * 120 - rednessTilt * 30)
  const barrierScore = clamp100(smoothness * 130 - contrast * 20)

  const metrics: SkinMetric[] = [
    {
      key: 'hydration',
      label: 'Hydration support',
      value: Math.round(hydrationScore),
      summary:
        hydrationScore > 65
          ? 'Feels cushioned. Maintain with humectants and breathable occlusives.'
          : 'Skin looks thirsty — layer humectants then seal with emollients.',
    },
    {
      key: 'oil',
      label: 'Oil balance',
      value: Math.round(oilScore),
      summary:
        oilScore > 60
          ? 'Sebum is more active — think balancing cleansers and light gel textures.'
          : 'Oil flow looks calm. Cream textures are safe.',
    },
    {
      key: 'sensitivity',
      label: 'Sensitivity risk',
      value: Math.round(sensitivityScore),
      summary:
        sensitivityScore > 55
          ? 'Redness shows up, so buffer actives and add soothing botanicals.'
          : 'Barrier looks calm. Introduce actives gradually to keep it that way.',
    },
    {
      key: 'tone',
      label: 'Tone evenness',
      value: Math.round(toneScore),
      summary:
        toneScore > 60
          ? 'Tone reads uniform with subtle warmth.'
          : 'Some uneven tone — think gentle exfoliation + brightening antioxidants.',
    },
    {
      key: 'barrier',
      label: 'Barrier strength',
      value: Math.round(barrierScore),
      summary:
        barrierScore > 65
          ? 'Barrier looks resilient; maintain with ceramides + peptides.'
          : 'Could use reinforcement — focus on ceramides, cholesterol, fatty acids.',
    },
  ]

  const summary = buildNarrative({
    hydrationScore,
    oilScore,
    sensitivityScore,
    toneScore,
    barrierScore,
  })

  return { metrics, summary }
}

const buildNarrative = ({
  hydrationScore,
  oilScore,
  sensitivityScore,
  toneScore,
  barrierScore,
}: {
  hydrationScore: number
  oilScore: number
  sensitivityScore: number
  toneScore: number
  barrierScore: number
}): string => {
  const hydrationNote = hydrationScore > 70 ? 'well cushioned' : hydrationScore > 50 ? 'balanced' : 'dehydrated'
  const oilNote = oilScore > 65 ? 'luminous' : oilScore < 40 ? 'velvety-matte' : 'even'
  const sensitivityNote = sensitivityScore > 60 ? 'easily triggered' : 'mostly calm'
  const toneNote = toneScore > 60 ? 'even' : 'slightly patchy'
  const barrierNote = barrierScore > 60 ? 'supported' : 'needing more reinforcement'

  return `Complexion looks ${hydrationNote}, ${oilNote}, and ${toneNote} with a ${sensitivityNote} barrier that is ${barrierNote}.`
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const clamp100 = (value: number) => Math.min(100, Math.max(0, value))

export default App
