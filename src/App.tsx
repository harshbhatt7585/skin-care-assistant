import { useRef, useState } from 'react'
import { marked } from 'marked'
import './App.css'
import { requestProductAdvice, continueProductChat } from './lib/openai'
import type { SkinMetric } from './lib/types'

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
  const [metrics, setMetrics] = useState<SkinMetric[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isProcessing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetExperience = () => {
    setPhoto(null)
    setAnalysisSummary('')
    setMetrics([])
    setMessages([])
    setInput('')
    setProcessing(false)
    setError(null)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setError('Unable to read that file. Try a different image.')
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
        const { metrics: newMetrics, summary } = analyzeSkinSnapshot(imageData)

        setPhoto(dataUrl)
        setMetrics(newMetrics)
        setAnalysisSummary(summary)
        setMessages([
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: 'Scan received. Give me a moment to read your skin and build a plan.',
          },
        ])

        await kickoffAssistant(newMetrics)
      }
      image.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  const kickoffAssistant = async (scanMetrics: SkinMetric[]) => {
    try {
      setProcessing(true)
      const plan = await requestProductAdvice({
        metrics: scanMetrics,
        concerns: '',
        focusAreas: [],
        environment: 'temperate',
        routineIntensity: 3,
      })
      setMessages([
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: plan,
        },
      ])
    } catch (err) {
      console.error(err)
      setError(
        err instanceof Error
          ? err.message
          : 'Could not reach the cosmetist. Double-check your API key.',
      )
    } finally {
      setProcessing(false)
    }
  }

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!input.trim() || !photo || !metrics.length || isProcessing) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
    }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInput('')

    try {
      setProcessing(true)
      const assistantReply = await continueProductChat({
        metrics,
        summary: analysisSummary,
        history: nextMessages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      })

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: assistantReply,
        },
      ])
    } catch (err) {
      console.error(err)
      setError(
        err instanceof Error
          ? err.message
          : 'The chat assistant hit a snag. Try again in a moment.',
      )
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="intro">
        <div>
          <p className="eyebrow">Skin ritual copilot</p>
          <h1>Upload a bare-face photo and chat through product picks.</h1>
          <p>
            We read tone, luminosity, and texture cues locally, then a licensed cosmetist agent chats
            you through AM/PM rituals and follow-up questions.
          </p>
        </div>
        {photo && (
          <button className="text-button" onClick={resetExperience}>
            Start over
          </button>
        )}
      </header>

      {!photo ? (
        <section className="upload-card">
          <div className="dashed">
            <p>Drop a clear photo here or click to upload.</p>
            <span>PNG or JPG · natural light · no heavy makeup</span>
            <label>
              Choose photo
              <input type="file" accept="image/*" onChange={handleFileUpload} />
            </label>
          </div>
          {error && <p className="error-text">{error}</p>}
        </section>
      ) : (
        <section className="chat-shell">
          <div className="photo-pane">
            <img src={photo} alt="Uploaded skin" />
            <p className="summary">{analysisSummary}</p>
          </div>

          <div className="chat-pane">
            <div className="messages">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={message.role === 'user' ? 'bubble user' : 'bubble'}
                  dangerouslySetInnerHTML={{
                    __html:
                      message.role === 'user'
                        ? escapeHtml(message.content)
                        : renderMarkdown(message.content),
                  }}
                />
              ))}
              {isProcessing && <p className="typing">Assistant is thinking…</p>}
            </div>

            <form className="chat-input" onSubmit={handleSend}>
              <input
                type="text"
                placeholder="Ask about substitutions, ingredient layering, etc."
                value={input}
                onChange={(event) => setInput(event.target.value)}
                disabled={!messages.length}
              />
              <button type="submit" disabled={!messages.length || isProcessing || !input.trim()}>
                Send
              </button>
            </form>
            {error && <p className="error-text">{error}</p>}
          </div>
        </section>
      )}

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
      label: 'Hydration',
      value: Math.round(hydrationScore),
      summary:
        hydrationScore > 65
          ? 'Well cushioned — keep humectants topped up.'
          : 'Looks thirsty; layer humectants and seal with emollients.',
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
          : 'Some uneven tone — brighten with antioxidants and SPF.',
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
  const hydrationNote = hydrationScore > 70 ? 'plump' : hydrationScore > 50 ? 'balanced' : 'dehydrated'
  const oilNote = oilScore > 65 ? 'luminous' : oilScore < 40 ? 'velvety-matte' : 'even'
  const sensitivityNote = sensitivityScore > 60 ? 'easily triggered' : 'calm'
  const toneNote = toneScore > 60 ? 'even' : 'slightly varied'
  const barrierNote = barrierScore > 60 ? 'supported' : 'needing more reinforcement'

  return `Complexion looks ${hydrationNote} and ${oilNote} with ${toneNote} tone. Barrier is ${barrierNote} and ${sensitivityNote}.`
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

const renderMarkdown = (input: string) => marked.parse(input, { gfm: true })

export default App
