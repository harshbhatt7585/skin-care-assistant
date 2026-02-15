import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuth, signOut, type User } from 'firebase/auth'
import { runFashionChatTurn } from './api/agent'
import { parseShoppingPayload, type ShoppingProduct } from './lib/parsers'
import type { ConversationTurn } from './types/conversation'
import './App.css'

type AppProps = {
  user: User | null
  embedded?: boolean
  showStartButton?: boolean
  startCaptureSignal?: number
}

const getLocaleCountryCode = (): string => {
  const locale = typeof navigator !== 'undefined' ? navigator.language : ''
  const region = locale.split('-')[1]
  return (region || 'US').toLowerCase()
}

const formatRating = (value?: number): string | undefined => {
  if (typeof value !== 'number') return undefined
  return value.toFixed(1).replace(/\.0$/, '')
}

const ProductCards = ({ products }: { products: ShoppingProduct[] }) => {
  const topProducts = products.slice(0, 8)
  if (topProducts.length === 0) return null

  return (
    <div className="shop-product-grid">
      {topProducts.map((product, index) => {
        const rating = formatRating(product.rating)
        const ratingCount = typeof product.ratingCount === 'number' ? product.ratingCount : undefined

        return (
          <a
            key={`${product.link}-${index}`}
            href={product.link}
            target="_blank"
            rel="noreferrer"
            className="shop-product-card"
          >
            <div className={`shop-product-card__image${product.imageUrl ? '' : ' is-placeholder'}`}>
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.title} loading="lazy" />
              ) : (
                <span>No image</span>
              )}
            </div>
            <div className="shop-product-card__body">
              <h4>{product.title}</h4>
              <p className="shop-product-card__source">{product.source || 'Online store'}</p>
              <div className="shop-product-card__stats">
                {product.price ? <span className="shop-product-card__price">{product.price}</span> : null}
                {rating ? (
                  <span className="shop-product-card__rating">
                    ★ {rating}
                    {ratingCount ? <span> ({ratingCount})</span> : null}
                  </span>
                ) : null}
              </div>
              <span className="shop-product-card__cta">Open product ↗</span>
            </div>
          </a>
        )
      })}
    </div>
  )
}

function App({ user, embedded = false }: AppProps) {
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [history, setHistory] = useState<ConversationTurn[]>([])
  const [assistantError, setAssistantError] = useState<string | null>(null)
  const [country, setCountry] = useState(getLocaleCountryCode)

  useEffect(() => {
    let cancelled = false

    const fetchCountryFromCoordinates = async (latitude: number, longitude: number) => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
        )
        if (!response.ok) return
        const data = (await response.json()) as { address?: { country_code?: string } }
        const detectedCountry = data.address?.country_code?.toLowerCase()
        if (detectedCountry && !cancelled) {
          setCountry(detectedCountry)
        }
      } catch (error) {
        console.warn('Reverse geocoding failed', error)
      }
    }

    if (!navigator.geolocation) {
      return () => {
        cancelled = true
      }
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void fetchCountryFromCoordinates(
          position.coords.latitude,
          position.coords.longitude
        )
      },
      (error) => {
        console.warn('Location detection failed', error)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )

    return () => {
      cancelled = true
    }
  }, [])

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

    setAssistantError(null)

    const userTurn: ConversationTurn = {
      role: 'user',
      content: trimmed,
    }

    const nextHistory = [...history, userTurn]
    setHistory(nextHistory)
    setPrompt('')
    setIsSubmitting(true)

    try {
      const response = await runFashionChatTurn({
        photoDataUrls: [],
        country,
        history: nextHistory,
      })
      setHistory(response.history)
    } catch (error) {
      console.error('Failed to run chat turn', error)
      const message =
        error instanceof Error ? error.message : 'I could not fetch a recommendation right now.'
      setAssistantError(message)
      setHistory((current) => [
        ...current,
        {
          role: 'assistant',
          content: 'I could not reach the assistant service. Please check backend connection and try again.',
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
        {assistantError ? (
          <p className="shop-error-state">{assistantError}</p>
        ) : null}

        {history.length === 0 ? (
          <p className="shop-empty-state">Start by describing what you want to buy, and I will suggest the best option.</p>
        ) : (
          history.map((message, index) => {
            const parsedShopping =
              message.role === 'assistant' ? parseShoppingPayload(message.content) : null
            const messageText = parsedShopping?.remainder || message.content

            return (
              <article
                key={`${message.role}-${index}`}
                className={`shop-message ${message.role === 'user' ? 'shop-message--user' : 'shop-message--assistant'}`}
              >
                <p className="shop-message__label">{message.role === 'user' ? 'You' : 'Styra Assistant'}</p>
                <div className="shop-message__bubble">
                  {messageText ? <p className="shop-message__text">{messageText}</p> : null}
                  {parsedShopping ? <ProductCards products={parsedShopping.payload.products} /> : null}
                </div>
              </article>
            )
          })
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
