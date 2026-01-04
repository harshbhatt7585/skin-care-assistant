import { useRef, useState } from 'react'
import { marked } from 'marked'
import './App.css'
import type { SkinMetric } from './lib/types'
import { runChatTurn } from './lib/openai'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type AnalysisResult = {
  metrics: SkinMetric[]
  summary: string
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [analysisSummary, setAnalysisSummary] = useState('')
  const [metrics, setMetrics] = useState<SkinMetric[] | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [history, setHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [input, setInput] = useState('')
  const [status, setStatus] = useState('Upload a clear photo to begin.')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setLoading] = useState(false)

  const reset = () => {
    setPhoto(null)
    setAnalysisSummary('')
    setMetrics(null)
    setMessages([])
    setHistory([])
    setInput('')
    setStatus('Upload a clear photo to begin.')
    setError(null)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    setStatus('Analyzing face…')
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setError('Unable to read that file. Try another image.')
        setStatus('Upload a clear photo to begin.')
        return
      }

      const dataUrl = reader.result
      const image = new Image()
      image.onload = async () => {
        const canvas = canvasRef.current
        const context = canvas?.getContext('2d')
        if (!canvas || !context) {
          setError('Canvas not available for analysis.')
          return
        }
        canvas.width = image.width
        canvas.height = image.height
        context.drawImage(image, 0, 0)
        const imageData = context.getImageData(0, 0, image.width, image.height)
        const { metrics: computedMetrics, summary } = analyzeSkinSnapshot(imageData)
        setPhoto(dataUrl)
        setMetrics(computedMetrics)
        setAnalysisSummary(summary)
        setStatus('Connecting with the cosmetist...')
        await runAgentTurn(computedMetrics, summary, [])
      }
      image.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  const runAgentTurn = async (
    scanMetrics: SkinMetric[],
    summary: string,
    nextHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  ) => {
    try {
      setLoading(true)
      setStatus('Consulting the cosmetist...')
      const reply = await runChatTurn({
        payload: {
          metrics: scanMetrics,
          concerns: '',
          focusAreas: [],
          environment: 'temperate',
          routineIntensity: 3,
        },
        summary,
        history: nextHistory,
      })

      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: reply }])
      setHistory([...nextHistory, { role: 'assistant', content: reply }])
      setStatus('Done. Ask anything else or upload again to iterate.')
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

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!input.trim() || !metrics || !analysisSummary || isLoading) return

    const userTurn = { role: 'user' as const, content: input.trim() }
    const nextHistory = [...history, userTurn]
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: userTurn.content }])
    setHistory(nextHistory)
    setInput('')
    await runAgentTurn(metrics, analysisSummary, nextHistory)
  }

  return (
    <div className="page">
      <header className="hero">
        <div className="hero__text">
          <p className="hero__eyebrow">Skin ritual copilot</p>
          <h1>Drop a bare-face photo. Chat through rituals + products.</h1>
          <p>{status}</p>
        </div>
        {photo && (
          <button className="hero__reset" onClick={reset}>
            Start over
          </button>
        )}
      </header>

      {status.startsWith('Analyzing face') && (
        <div className="analysis-banner">
          <span className="pulse-dot" />
          <p>{status}</p>
        </div>
      )}

      <main className="surface">
        {!photo ? (
          <section className="panel upload-panel">
            <h2>Upload a photo</h2>
            <p className="panel__body">Natural light, no heavy makeup. Everything stays on-device.</p>
            <label className="dropzone">
              <span>Choose photo</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} />
            </label>
            {error && <p className="text-error">{error}</p>}
          </section>
        ) : (
          <section className="chat-layout">
            <div className="panel photo-card">
              <img src={photo} alt="Uploaded skin" />
              <p>{analysisSummary}</p>
            </div>

            <div className="panel chat-card">
              <div className="messages">
                {messages.map((message) => (
                  <article
                    key={message.id}
                    className={message.role === 'user' ? 'bubble bubble--user' : 'bubble'}
                    dangerouslySetInnerHTML={{
                      __html:
                        message.role === 'user'
                          ? escapeHtml(message.content)
                          : marked.parse(message.content, { gfm: true }),
                    }}
                  />
                ))}
                {isLoading && <p className="typing">Assistant is thinking…</p>}
              </div>

              <form className="chat-input" onSubmit={handleSend}>
                <input
                  type="text"
                  placeholder="Ask about substitutions, layering, travel routines..."
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  disabled={!messages.length}
                />
                <button type="submit" disabled={!messages.length || isLoading || !input.trim()}>
                  Send
                </button>
              </form>
              {error && <p className="text-error">{error}</p>}
            </div>
          </section>
        )}
      </main>

      <canvas ref={canvasRef} className="hidden" />
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

  const avgBrightness = brightnessSum / pixelCount
  const brightnessVariance = brightnessSqSum / pixelCount - avgBrightness ** 2
  const contrast = Math.min(1, Math.sqrt(Math.max(0, brightnessVariance)) * 1.6)
  const avgChroma = chromaSum / pixelCount
  const textureScore = Math.min(1, textureDelta / (pixelCount * 255 * 1.5))
  const smoothness = clamp01(1 - textureScore)
  const rednessTilt = clamp01((redSum / pixelCount / 255) - (greenSum / pixelCount / 255 + blueSum / pixelCount / 255) / 2)

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
          ? 'Feels cushioned. Keep humectants topped up.'
          : 'Looks thirsty — layer humectants and seal with emollients.',
    },
    {
      key: 'oil',
      label: 'Oil balance',
      value: Math.round(oilScore),
      summary:
        oilScore > 60
          ? 'Sebum is lively; gel textures keep things breathable.'
          : 'Oil flow looks calm. Cream textures are welcome.',
    },
    {
      key: 'sensitivity',
      label: 'Sensitivity',
      value: Math.round(sensitivityScore),
      summary:
        sensitivityScore > 55
          ? 'Barrier is reactive. Buffer actives and add soothing botanicals.'
          : 'Barrier looks calm; introduce actives gradually.',
    },
    {
      key: 'tone',
      label: 'Tone evenness',
      value: Math.round(toneScore),
      summary:
        toneScore > 60
          ? 'Tone reads even with gentle warmth.'
          : 'Some uneven tone — brighten with antioxidants + SPF.',
    },
    {
      key: 'barrier',
      label: 'Barrier strength',
      value: Math.round(barrierScore),
      summary:
        barrierScore > 65
          ? 'Barrier looks resilient; maintain with ceramides + peptides.'
          : 'Could use reinforcement — focus on lipids and barrier balms.',
    },
  ]

  return { metrics, summary: '' }
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const clamp100 = (value: number) => Math.min(100, Math.max(0, value))

const escapeHtml = (input: string) =>
  input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

export default App
