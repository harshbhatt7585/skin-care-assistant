import { useRef, useState } from 'react'
import { marked } from 'marked'
import './App.css'
import { runChatTurn } from './lib/openai'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type ConversationTurn = { role: 'user' | 'assistant'; content: string }

function App() {
  const [photo, setPhoto] = useState<string | null>(null)
  const [analysisSummary, setAnalysisSummary] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [history, setHistory] = useState<ConversationTurn[]>([])
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    setStatus('Analyzing face…')

    try {
      const dataUrl = await readFileAsDataUrl(file)
      setPhoto(dataUrl)
      setAnalysisSummary('Photo uploaded — reading your skin profile...')
      setStatus('Connecting with the cosmetist...')
      const initialHistory = await runAgentTurn(dataUrl, [])
      if (!initialHistory) return
      const autoPrompt = {
        role: 'user' as const,
        content: 'Please send product links and shopping options for this plan.',
      }
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: autoPrompt.content }])
      setStatus('Pulling live product matches...')
      setAnalysisSummary('Gathering live shopping picks...')
      const secondHistory: ConversationTurn[] = [...initialHistory, autoPrompt]
      setHistory(secondHistory)
      await runAgentTurn(dataUrl, secondHistory)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Could not process that image. Try another one.')
      setStatus('Upload a clear photo to begin.')
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
    photoDataUrl: string,
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
                  'Please analyze my bare-face photo and outline AM/PM rituals. Ask if I want shopping links before calling any tools.',
              },
            ]
          : nextHistory

      const reply = await runChatTurn({ photoDataUrl, history: baseHistory })
      const finalHistory: ConversationTurn[] = [...baseHistory, { role: 'assistant', content: reply }]
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: reply }])
      setHistory(finalHistory)
      setStatus('Done. Ask anything else or upload again to iterate.')
      setAnalysisSummary('Response delivered — keep the chat going or upload again.')
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

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!input.trim() || !photo || isLoading) return

    const userTurn = { role: 'user' as const, content: input.trim() }
    const nextHistory = [...history, userTurn]
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: userTurn.content }])
    setHistory(nextHistory)
    setInput('')
    await runAgentTurn(photo, nextHistory)
  }

  const streamAssistantReply = async () => {
    streamingTimers.current.forEach((timer) => clearTimeout(timer))
    streamingTimers.current = []
  }

  return (
    <div className="page">
      <header className="hero">
        <div className="hero__text">
          <p className="hero__eyebrow">Skin ritual copilot</p>
          <h1>Drop a bare-face photo. Chat through rituals + products.</h1>
          <p>{status}</p>
          {photo && (
            <div className="hero__summary">
              <span>Live scan status</span>
              <p>{analysisSummary || 'Photo ready — chatting through details.'}</p>
            </div>
          )}
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

export default App
