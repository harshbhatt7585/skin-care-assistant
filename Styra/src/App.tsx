import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuth, signOut, type User } from 'firebase/auth'
import { runBackendChatTurn } from './api/agent'
import type { ConversationTurn } from './types/conversation'
import './App.css'

type AppProps = {
  user: User | null
  embedded?: boolean
  showStartButton?: boolean
  startCaptureSignal?: number
}

const getCountryCode = (): string => {
  const locale = typeof navigator !== 'undefined' ? navigator.language : ''
  const region = locale.split('-')[1]
  return (region || 'US').toLowerCase()
}

function App({ user, embedded = false }: AppProps) {
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [history, setHistory] = useState<ConversationTurn[]>([])
  const [country] = useState(getCountryCode)

  const handleAccountAction = async () => {
    if (!user) {
      navigate('/signin')
      return
    }

    try {
      await signOut(getAuth())
      navigate('/')
    } catch (error) {
      console.error('Unable to sign out', error)
    }
  }

  const submitPrompt = async (input: string) => {
    const trimmed = input.trim()
    if (!trimmed || isSubmitting) return

    const userTurn: ConversationTurn = {
      role: 'user',
      content: trimmed,
    }

    let nextHistory: ConversationTurn[] = []
    setHistory((current) => {
      nextHistory = [...current, userTurn]
      return nextHistory
    })
    setPrompt('')
    setIsSubmitting(true)

    try {
      const response = await runBackendChatTurn({
        photoDataUrls: [],
        country,
        history: nextHistory,
      })
      setHistory(response.history)
    } catch (error) {
      console.error('Failed to run chat turn', error)
      setHistory((current) => [
        ...current,
        {
          role: 'assistant',
          content: 'I could not fetch a recommendation right now. Please try again.',
        },
      ])
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={`shop-page ${embedded ? 'shop-page--embedded' : ''}`}>
      <header className="shop-topbar">
        <div className="shop-brand">
          <p className="shop-brand__eyebrow">AI shopping assistant</p>
          <h1>Styra</h1>
        </div>
        <div className="shop-topbar__actions">
          <button type="button" className="shop-link" onClick={() => navigate('/pricing')}>
            Membership
          </button>
          <button type="button" className="shop-account" onClick={handleAccountAction}>
            {user ? 'Sign out' : 'Sign in'}
          </button>
        </div>
      </header>

      <section className="shop-hero">
        <div className="shop-hero__content">
          <p className="shop-hero__eyebrow">Find products fast</p>
          <h2>What do you want to buy today?</h2>
          <form
            className="shop-prompt-form"
            onSubmit={(event) => {
              event.preventDefault()
              void submitPrompt(prompt)
            }}
          >
            <label className="sr-only" htmlFor="assistant-prompt">
              Describe what you want to buy
            </label>
            <input
              id="assistant-prompt"
              type="text"
              className="shop-prompt-input"
              placeholder="Describe product, budget, and use case"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              disabled={isSubmitting}
            />
            <button type="submit" className="shop-prompt-submit" disabled={isSubmitting || prompt.trim().length === 0}>
              {isSubmitting ? 'Thinking...' : 'Ask assistant'}
            </button>
          </form>
        </div>
      </section>

      <section className="shop-chat" aria-live="polite">
        {history.length === 0 ? (
          <p className="shop-empty-state">Start by describing what you want to buy, and I will suggest the best option.</p>
        ) : (
          history.map((message, index) => (
            <article
              key={`${message.role}-${index}`}
              className={`shop-message ${message.role === 'user' ? 'shop-message--user' : 'shop-message--assistant'}`}
            >
              <p className="shop-message__label">{message.role === 'user' ? 'You' : 'Styra Assistant'}</p>
              <div className="shop-message__bubble">
                <p>{message.content}</p>
              </div>
            </article>
          ))
        )}

        {isSubmitting ? (
          <article className="shop-message shop-message--assistant">
            <p className="shop-message__label">Styra Assistant</p>
            <div className="shop-message__bubble shop-message__bubble--pending">
              <p>Working on your request...</p>
            </div>
          </article>
        ) : null}
      </section>
    </div>
  )
}

export default App
