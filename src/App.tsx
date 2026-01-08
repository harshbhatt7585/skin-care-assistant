import { useEffect, useRef, useState } from 'react'
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
      setStatus('Connecting with the cosmetist...')
      const initialHistory = await runAgentTurn(dataUrl, [])
      if (!initialHistory) return
      const autoPrompt = {
        role: 'user' as const,
        content: 'Please send product links and shopping options for this plan.',
      }
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: autoPrompt.content }])
      setStatus('Pulling live product matches...')
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
          <p className="hero__eyebrow">Skin Care Copilot</p>
          <h1>Drop a bare-face photo.</h1>
          <p>{status}</p>
        </div>
      </header>

      {status.startsWith('Analyzing face') && (
        <div className="analysis-banner">
          <span className="pulse-dot" />
          <p>{status}</p>
        </div>
      )}

      <main className="simple-main">
        {!photo ? (
          <section className="upload-panel">
            <h2>Upload a photo</h2>
            <p>Natural light, no heavy makeup. Everything stays on-device.</p>
            <label className="dropzone">
              <span>Choose photo</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} />
            </label>
            {error && <p className="text-error">{error}</p>}
          </section>
        ) : (
          <section className="analysis-stack">
            <div className="analysis-visual">
              <ScanVisualization photo={photo} isLoading={isLoading} />
              <p className="analysis-copy">
                {status}
              </p>
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

const formatAssistantContent = (content: string) => {
  const sanitized = content
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim()
      return !/^[-\s]*link:/i.test(trimmed) && !/^[-\s]*thumbnail:/i.test(trimmed)
    })
    .join('\n')
  return marked.parse(sanitized, { gfm: true })
}

type ProductEntry = {
  retailer: string
  link?: string
  thumbnail?: string
  alt?: string
}

type ProductSection = {
  title: string
  entries: ProductEntry[]
}

type ShoppingPayload = {
  knowledgeGraph?: {
    title?: string
    type?: string
    website?: string
    imageUrl?: string
    description?: string
    descriptionLink?: string
    attributes?: Record<string, string>
  }
  organic?: Array<{
    title?: string
    link?: string
    snippet?: string
    position?: number
  }>
}

const parseShoppingPayload = (
  content: string,
): { payload: ShoppingPayload; remainder: string } | null => {
  const codeMatch = content.match(/```json([\s\S]*?)```/i)
  const candidate = codeMatch ? codeMatch[1].trim() : content.trim()
  let parsed: ShoppingPayload | null = null
  const tryParse = (raw: string) => {
    try {
      parsed = JSON.parse(raw)
      return true
    } catch (error) {
      return false
    }
  }

  if (!tryParse(candidate)) {
    const start = candidate.indexOf('{')
    const end = candidate.lastIndexOf('}')
    if (start === -1 || end === -1 || end <= start) {
      return null
    }
    if (!tryParse(candidate.slice(start, end + 1))) {
      return null
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return null
  }

  if (!parsed.knowledgeGraph && !parsed.organic) {
    return null
  }

  const remainder = codeMatch
    ? content.replace(codeMatch[0], '').trim()
    : content.replace(candidate, '').trim()

  return {
    payload: parsed,
    remainder,
  }
}

type ParsedEntry = ProductEntry & { lineIndexes: number[] }
type SectionMeta = { startIndex: number; data: { title: string; entries: ParsedEntry[] } }

const parseProductSections = (
  content: string,
): { sections: ProductSection[]; remainder: string } | null => {
  const lines = content.split(/\r?\n/)
  const sections: SectionMeta[] = []
  let currentSection: SectionMeta | null = null
  let currentEntry: ParsedEntry | null = null

  const hasUpcomingBullet = (startIndex: number) =>
    lines.slice(startIndex, startIndex + 6).some((line) => line.trim().startsWith('- '))

  lines.forEach((line, index) => {
    const trimmed = line.trim()
    if (!trimmed) return

    const normalized = trimmed.replace(/^-+\s*/, '')
    const isLink = /^link:/i.test(normalized)
    const isThumb = /^thumbnail:/i.test(normalized)

    if (!trimmed.startsWith('-') && !isLink && !isThumb && hasUpcomingBullet(index + 1)) {
      currentSection = { startIndex: index, data: { title: trimmed, entries: [] } }
      sections.push(currentSection)
      currentEntry = null
      return
    }

    if (trimmed.startsWith('- ') && !isLink && !isThumb) {
      const entry: ParsedEntry = { retailer: normalized, lineIndexes: [index] }
      currentEntry = entry
      currentSection?.data.entries.push(entry)
      return
    }

    if (isLink && currentEntry) {
      const linkMatch = normalized.match(/^link:\s*(https?:\/\/\S+)/i)
      if (linkMatch) {
        currentEntry.link = linkMatch[1]
        currentEntry.lineIndexes.push(index)
      }
      return
    }

    if (isThumb && currentEntry) {
      const rest = normalized.replace(/^thumbnail:\s*/i, '')
      const explicit = rest.match(/\((https?:\/\/[^)]+)\)/)
      const fallback = rest.match(/https?:\/\/\S+/)
      currentEntry.thumbnail = explicit?.[1] ?? fallback?.[0]
      const altMatch = rest.match(/!\[([^\]]+)\]/)
      if (altMatch) currentEntry.alt = altMatch[1]
      currentEntry.lineIndexes.push(index)
    }
  })

  const filteredSections = sections
    .map((section) => ({
      startIndex: section.startIndex,
      data: {
        title: section.data.title,
        entries: section.data.entries.filter(
          (entry) => entry.retailer && (entry.link || entry.thumbnail),
        ),
      },
    }))
    .filter((section) => section.data.entries.length > 0)

  if (filteredSections.length === 0) {
    return null
  }

  const usedIndexes = new Set<number>()
  filteredSections.forEach((section) => {
    usedIndexes.add(section.startIndex)
    section.data.entries.forEach((entry) => entry.lineIndexes.forEach((idx) => usedIndexes.add(idx)))
  })

  const remainder = lines
    .map((line, idx) => (usedIndexes.has(idx) ? '' : line))
    .join('\n')
    .trim()

  return {
    sections: filteredSections.map((section) => ({
      title: section.data.title,
      entries: section.data.entries.map(({ lineIndexes, ...rest }) => rest),
    })),
    remainder,
  }
}

const ProductShowcase = ({ sections }: { sections: ProductSection[] }) => (
  <div className="product-showcase">
    {sections.map((section, sectionIndex) => (
      <div className="product-showcase__section" key={`${section.title}-${sectionIndex}`}>
        <div className="product-showcase__heading">
          <span className="product-showcase__dot" />
          <h4>{section.title}</h4>
        </div>
        <div className="product-showcase__list">
          {section.entries.map((entry, entryIndex) => {
            const targetUrl = entry.link || entry.thumbnail
            const card = (
              <div className="product-card" style={{ animationDelay: `${entryIndex * 0.04}s` }}>
                {entry.thumbnail && (
                  <div className="product-card__thumb">
                    <img
                      src={entry.thumbnail}
                      alt={entry.alt || entry.retailer}
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="product-card__body">
                  <p className="product-card__retailer">{entry.retailer}</p>
                  {entry.link && <span className="product-card__cta">Open product ↗</span>}
                </div>
              </div>
            )

            return targetUrl ? (
              <a
                key={`${entry.retailer}-${entryIndex}`}
                href={targetUrl}
                className="product-card__link"
                target="_blank"
                rel="noreferrer"
              >
                {card}
              </a>
            ) : (
              <div key={`${entry.retailer}-${entryIndex}`} className="product-card__link">
                {card}
              </div>
            )
          })}
        </div>
      </div>
    ))}
  </div>
)

const ShoppingPreview = ({ data }: { data: ShoppingPayload }) => {
  const organic = data.organic?.slice(0, 6) ?? []
  const hero = data.knowledgeGraph

  if (!hero && organic.length === 0) {
    return null
  }

  return (
    <div className="shopping-preview">
      {hero && (
        <div className="shopping-hero">
          {hero.imageUrl && (
            <div className="shopping-hero__image">
              <img src={hero.imageUrl} alt={hero.title || 'Preview'} loading="lazy" />
            </div>
          )}
          <div className="shopping-hero__body">
            <p className="shopping-hero__eyebrow">Live shopping pulse</p>
            <h3>{hero.title}</h3>
            {hero.type && <span className="shopping-hero__type">{hero.type}</span>}
            {hero.description && (
              <p className="shopping-hero__description">{hero.description}</p>
            )}
            {hero.attributes && (
              <dl className="shopping-hero__attributes">
                {Object.entries(hero.attributes)
                  .slice(0, 4)
                  .map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
              </dl>
            )}
            {hero.website && (
              <a
                href={hero.website}
                className="shopping-hero__cta"
                target="_blank"
                rel="noreferrer"
              >
                Visit site ↗
              </a>
            )}
          </div>
        </div>
      )}

      {organic.length > 0 && (
        <div className="shopping-cards">
          {organic.map((item, index) => (
            <a
              key={`${item.link}-${index}`}
              href={item.link}
              target="_blank"
              rel="noreferrer"
              className="shopping-card"
              style={{ animationDelay: `${index * 0.03}s` }}
            >
              <div className="shopping-card__header">
                <span className="shopping-card__index">
                  {(item.position ?? index + 1).toString().padStart(2, '0')}
                </span>
                <p className="shopping-card__title">{item.title}</p>
              </div>
              {item.snippet && <p className="shopping-card__snippet">{item.snippet}</p>}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

const ScanVisualization = ({
  photo,
  isLoading,
}: {
  photo: string | null
  isLoading: boolean
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!photo) return
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number | null = null
    let stars: Array<{ x: number; y: number; r: number; a: number; tw: number }> = []

    const rand = (min: number, max: number) => Math.random() * (max - min) + min

    const resize = () => {
      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.floor(rect.width * dpr)
      canvas.height = Math.floor(rect.height * dpr)
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const makeStars = () => {
      const rect = container.getBoundingClientRect()
      const area = rect.width * rect.height
      const count = Math.max(40, Math.floor(area / 4500))
      stars = Array.from({ length: count }, () => ({
        x: rand(0, rect.width),
        y: rand(0, rect.height),
        r: rand(0.5, 1.4),
        a: rand(0.2, 0.9),
        tw: rand(0.003, 0.012),
      }))
    }

    const draw = (time: number) => {
      const rect = container.getBoundingClientRect()
      ctx.clearRect(0, 0, rect.width, rect.height)

      for (const star of stars) {
        const twinkle = 0.5 + 0.5 * Math.sin(time * star.tw)
        const alpha = star.a * twinkle * 0.65
        ctx.fillStyle = `rgba(114,255,230,${alpha})`
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2)
        ctx.fill()
      }

      animationFrameId = window.requestAnimationFrame(draw)
    }

    const handleResize = () => {
      resize()
      makeStars()
    }

    if (!isLoading) {
      resize()
      const rect = container.getBoundingClientRect()
      ctx.clearRect(0, 0, rect.width, rect.height)
      return
    }

    handleResize()
    animationFrameId = window.requestAnimationFrame(draw)
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId)
      }
    }
  }, [photo, isLoading])

  if (!photo) {
    return null
  }

  return (
    <div className="scan-visual" aria-live="polite">
      <div
        ref={containerRef}
        className="scan-visual__circle"
        style={{ backgroundImage: `url(${photo})` }}
      >
        <canvas ref={canvasRef} className="scan-visual__canvas" aria-hidden="true" />
        {isLoading && (
          <div className="scan-visual__status">
            <span className="scan-visual__dot" />
          </div>
        )}
      </div>
    </div>
  )
}

export default App
