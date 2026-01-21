import type { FormEvent } from 'react'
import ProductShowcase from './ProductShowcase'
import ShoppingPreview from './ShoppingPreview'
import { parseProductSections, parseShoppingPayload, stripToolArtifacts } from '../lib/parsers'
import './Chats/Chat.css'

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
          <div className="typing" aria-live="polite" aria-label="Assistant is replying">
            <span />
            <span />
            <span />
          </div>
        )}
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
