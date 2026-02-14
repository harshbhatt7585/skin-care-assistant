import { useEffect, useRef, type FormEvent } from 'react'
import ProductShowcase from './ProductShowcase'
import ShoppingPreview from './ShoppingPreview'
import Loader from './Loader/Loader'
import {
  parseConcernSummary,
  parseProductSections,
  parseShoppingPayload,
  stripToolArtifacts,
} from '../lib/parsers'
import './Chats/Chat.css'

const RATING_DESCRIPTIONS: Record<string, string> = {
  Hydration: 'Indicates how well your skin is holding water and staying supple.',
  'Oil Balance': 'Looks for shine or dry patches to judge sebum balance across your T-zone and cheeks.',
  Tone: 'Tracks uneven pigmentation, dark spots, or shadowing that affect overall tone.',
  'Barrier Strength':
    '“Barrier” refers to the outer skin layer that locks moisture in and keeps irritants out—healthy barrier looks calm and resilient.',
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type ChatInterfaceProps = {
  messages: ChatMessage[]
  inputValue: string
  isLoading: boolean
  onInputChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onNewScan: () => void
}

const ChatInterface = ({ messages, inputValue, isLoading, onInputChange, onSubmit, onNewScan }: ChatInterfaceProps) => {
  const bottomRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    window.scrollTo({ top: document.body.scrollHeight + 100000 })
  }, [messages, isLoading])

  return (
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

          const concernSummary = parseConcernSummary(message.content)
          if (concernSummary) {
            const { keywords, concerns, text, observations, ratings } = concernSummary
            return (
              <article key={message.id} className="bubble">
                {keywords.length > 0 && (
                  <div className="concern-summary__keywords-row">
                    <span className="concern-summary__keywords-label">Concerns detected:</span>
                    <div className="concern-summary__keywords-values">
                      {keywords.map((keyword, index) => {
                        const readable = keyword.replace(/_/g, ' ')
                        return (
                          <span key={`${keyword}-${index}`}>
                            {readable}
                            {index < keywords.length - 1 ? <span aria-hidden="true"> • </span> : null}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}
                {observations && (
                  <div
                    className="concern-summary__observations"
                    dangerouslySetInnerHTML={{
                      __html: formatAssistantContent(observations),
                    }}
                  />
                )}
                {concerns && concerns.length > 0 ? (
                  <div className="concern-summary__section">
                    <p className="concern-summary__section-title">Key concerns</p>
                    <ul className="concern-summary__list">
                      {concerns.map((entry, index) => (
                        <li key={`${entry}-${index}`}>{entry}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {!concerns?.length && text && (
                  <div
                    className="concern-summary__text"
                    dangerouslySetInnerHTML={{
                      __html: formatAssistantContent(text),
                    }}
                  />
                )}
                {ratings && ratings.length > 0 ? (
                  <div className="concern-summary__section">
                    <p className="concern-summary__section-title">Condition ratings</p>
                    <div className="concern-summary__ratings">
                      {ratings.map((rating) => {
                        const percentage = Math.min(100, Math.max(0, (rating.value / 5) * 100))
                        const tone = rating.value >= 4 ? 'positive' : rating.value <= 2 ? 'negative' : 'neutral'
                        const description = RATING_DESCRIPTIONS[rating.label]
                        return (
                          <div key={rating.label} className="concern-summary__rating" aria-label={`${rating.label} ${rating.value} out of 5`}>
                            <span>{rating.label}</span>
                            <div className="concern-summary__rating-bar">
                              <div
                                className={`concern-summary__rating-fill concern-summary__rating-fill--${tone}`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <strong className={`concern-summary__rating-score concern-summary__rating-score--${tone}`}>
                              {rating.value}/5
                            </strong>
                            {description && <p className="concern-summary__rating-description">{description}</p>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </article>
            )
          }

          const parsedShopping = parseShoppingPayload(message.content)
          if (parsedShopping) {
            const { payload, remainder } = parsedShopping
            return (
              <article key={message.id} className="bubble">
                {remainder && (
                  <div dangerouslySetInnerHTML={{ __html: formatAssistantContent(remainder) }} />
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
                  <div dangerouslySetInnerHTML={{ __html: formatAssistantContent(remainder) }} />
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
          <article className="bubble bubble--loader" aria-live="polite" aria-label="Assistant is replying">
            <Loader variant="inline" />
          </article>
        )}
        <div ref={bottomRef} aria-hidden />
      </div>

      <form className="chat-input" onSubmit={onSubmit}>
        <button type="button" className="new-scan-btn" aria-label="New Scan" onClick={onNewScan}>
          <span className="new-scan-btn__ring" />
          <svg className="new-scan-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </button>
        <input
          type="text"
          placeholder="Ask about substitutions, layering, travel routines..."
          value={inputValue}
          onChange={(event) => onInputChange(event.target.value)}
        />
        <button type="submit" disabled={isLoading || !inputValue.trim()}>
          Send
        </button>
      </form>
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

export default ChatInterface
