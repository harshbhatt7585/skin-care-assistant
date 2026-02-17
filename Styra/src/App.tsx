'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAuth, signOut, type User } from 'firebase/auth'
import { runFashionChatTurn } from './api/agent'
import { parseShoppingPayload, type ShoppingProduct } from './lib/parsers'
import PromptForm from './components/PromptForm/PromptForm'
import type { ConversationTurn } from './types/conversation'
import { detectCountryCode, getLocaleCountryCode } from './utils/location'
import './App.css'

type AppProps = {
  user: User | null
  embedded?: boolean
  showStartButton?: boolean
  startCaptureSignal?: number
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
  const router = useRouter()
  const [prompt, setPrompt] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [history, setHistory] = useState<ConversationTurn[]>([])
  const [assistantError, setAssistantError] = useState<string | null>(null)
  const [country, setCountry] = useState(getLocaleCountryCode)
  const hasConsumedInitialPrompt = useRef(false)

  useEffect(() => {
    let cancelled = false
    void detectCountryCode().then((detectedCountry) => {
      if (detectedCountry && !cancelled) {
        setCountry(detectedCountry)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  const handleAccountAction = async () => {
    if (!user) {
      router.push('/signin')
      return
    }

    try {
      await signOut(getAuth())
      router.push('/')
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

  useEffect(() => {
    if (hasConsumedInitialPrompt.current) return
    if (history.length > 0 || isSubmitting) return

    const promptFromUrl =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('prompt')?.trim() ?? ''
        : ''
    if (!promptFromUrl) return

    hasConsumedInitialPrompt.current = true
    void submitPrompt(promptFromUrl)
    router.replace('/home')
  }, [history.length, isSubmitting, router])

  const hasConversationStarted = history.length > 0

  return (
    <div className={`shop-page ${embedded ? 'shop-page--embedded' : ''}`}>
      <header className="shop-topbar">
        <div className="shop-brand">
          <h1>Styra</h1>
        </div>
        <div className="shop-topbar__actions">
          <button type="button" className="shop-account" onClick={handleAccountAction}>
            {user ? 'Sign out' : 'Sign in'}
          </button>
        </div>
      </header>

      {!hasConversationStarted ? (
        <section className="shop-hero">
          <div className="shop-hero__content">
            <h2>What do you want to buy today?</h2>
            <PromptForm
              inputId="landing-prompt"
              label="Describe what you want to buy"
              prompt={prompt}
              placeholder="Describe product, budget, and use case"
              onPromptChange={setPrompt}
              onSubmit={submitPrompt}
              submitLabel="Ask assistant"
              formClassName="landing-hero__prompt"
            />
          </div>
        </section>
      ) : null}

      <section className="shop-chat" aria-live="polite">
        {assistantError ? (
          <p className="shop-error-state">{assistantError}</p>
        ) : null}

        {history.map((message, index) => {
          const parsedShopping =
            message.role === 'assistant' ? parseShoppingPayload(message.content) : null
          const messageText = parsedShopping?.remainder || message.content

          return (
            <article
              key={`${message.role}-${index}`}
              className={`shop-message ${message.role === 'user' ? 'shop-message--user' : 'shop-message--assistant'}`}
            >
              <div className="shop-message__bubble">
                {messageText ? <p className="shop-message__text">{messageText}</p> : null}
                {parsedShopping ? <ProductCards products={parsedShopping.payload.products} /> : null}
              </div>
            </article>
          )
        })}

        {isSubmitting ? (
          <article className="shop-responding" aria-live="polite" aria-label="Assistant is responding">
            <span className="shop-responding__dots" aria-hidden="true">
              <span className="shop-responding__dot" />
              <span className="shop-responding__dot" />
              <span className="shop-responding__dot" />
            </span>
          </article>
        ) : null}
      </section>

      {hasConversationStarted ? (
        <PromptForm
          inputId="landing-prompt"
          label="Describe what you want to buy"
          prompt={prompt}
          placeholder="Describe product, budget, and use case"
          onPromptChange={setPrompt}
          onSubmit={submitPrompt}
          submitLabel="Ask assistant"
          formClassName="landing-hero__prompt"
        />
      ) : null}
    </div>
  )
}

export default App
