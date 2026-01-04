import { useRef, useState } from 'react'
import { marked } from 'marked'
import './App.css'
import { runChatTurn } from './lib/openai'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [analysisSummary, setAnalysisSummary] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [history, setHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [input, setInput] = useState('')
  const [status, setStatus] = useState('Upload a clear photo to begin.')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setLoading] = useState(false)
  const streamingTimers = useRef<number[]>([])

  const reset = () => {
    streamingTimers.current.forEach((timer) => clearTimeout(timer))
    streamingTimers.current = []
    setPhoto(null)
    setAnalysisSummary('')
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
        const summary = analyzeSkinSnapshot(imageData)
        setPhoto(dataUrl)
        setAnalysisSummary(summary)
        setStatus('Connecting with the cosmetist...')
        await runAgentTurn(summary, [])
      }
      image.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  const runAgentTurn = async (
    summary: string,
    nextHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  ) => {
    try {
      setLoading(true)
      setStatus('Consulting the cosmetist...')
      const baseHistory =
        nextHistory.length === 0
          ? [
              {
                role: 'user' as const,
                content:
                  'Please analyze my scan and outline AM/PM rituals. Ask if I want shopping links before calling any tools.',
              },
            ]
          : nextHistory
      const reply = await runChatTurn({ summary, history: baseHistory })
      streamAssistantReply(reply, [...baseHistory, { role: 'assistant', content: reply }])
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
    if (!input.trim() || !analysisSummary || isLoading) return

    const userTurn = { role: 'user' as const, content: input.trim() }
    const nextHistory = [...history, userTurn]
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: userTurn.content }])
    setHistory(nextHistory)
    setInput('')
    await runAgentTurn(analysisSummary, nextHistory)
  }

  const streamAssistantReply = (
    text: string,
    nextHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  ) => {
    const id = crypto.randomUUID()
    setMessages((prev) => [...prev, { id, role: 'assistant', content: '' }])

    const tokens = text.length ? text.split(/(?<=\s)/) : []
    if (!tokens.length) {
      setHistory(nextHistory)
      return
    }

    let index = 0
    const step = () => {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === id
            ? { ...message, content: message.content + (tokens[index] ?? '') }
            : message,
        ),
      )
      index += 1
      if (index < tokens.length) {
        const timer = window.setTimeout(step, 18)
        streamingTimers.current.push(timer)
      } else {
        setHistory(nextHistory)
      }
    }

    step()
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
                />
                <button type="submit" disabled={isLoading || !input.trim()}>
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

const analyzeSkinSnapshot = (image: ImageData): string => {
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
  const summary = `Hydration: ${Math.round(hydrationScore)}/100 · Oil balance: ${Math.round(
    oilScore,
  )}/100 · Sensitivity: ${Math.round(sensitivityScore)}/100 · Tone: ${Math.round(
    toneScore,
  )}/100 · Barrier: ${Math.round(barrierScore)}/100`

  return summary
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
