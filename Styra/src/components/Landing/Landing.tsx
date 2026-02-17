'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from 'firebase/auth'
import PromptForm from '../PromptForm/PromptForm'
import '../../App.css'
import './Landing.css'

type LandingProps = {
  user: User | null
}

const SHOWCASE_IMAGES = [
  '/images/lookbook/gshop-2-cutout.png',

  '/images/lookbook/gshop-8-cutout.png',
  '/images/lookbook/gshop-9-cutout.png',
  '/images/lookbook/gshop-10-cutout.png',
  '/images/lookbook/gshop-11-cutout.png',
  '/images/lookbook/gshop-12-cutout.png',
  '/images/lookbook/gshop-6-cutout.png',
]

const Landing = ({ user }: LandingProps) => {
  const router = useRouter()
  const [prompt, setPrompt] = useState('')

  const handleStart = (input?: string) => {
    const trimmed = input?.trim()
    if (trimmed) {
      const query = new URLSearchParams({ prompt: trimmed }).toString()
      router.push(user ? `/home?${query}` : `/signin?${query}`)
      return
    }

    router.push(user ? '/home' : '/signin')
  }

  return (
    <div className="landing-page">
      <header className="landing-nav">
        <button type="button" className="landing-nav__brand" onClick={() => router.push('/')}>
          Styra
        </button>
        <div className="landing-nav__actions">
          <button type="button" className="landing-nav__cta" onClick={() => handleStart()}>
            Start shopping
          </button>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero__content">
          <h1>
            Buy fashion through <span className="landing-hero__accent">Personalised</span>{' '}
            conversation
          </h1>
          <PromptForm
            inputId="landing-prompt"
            label="Describe what you want to buy"
            prompt={prompt}
            placeholder="Describe product, budget, and use case"
            onPromptChange={setPrompt}
            onSubmit={handleStart}
            submitLabel="Ask assistant"
            formClassName="landing-hero__prompt"
          />
        </div>
      </section>

      <section className="landing-showcase" aria-label="Fashion and beauty showcase">
        <div className="landing-showcase__rail">
          {SHOWCASE_IMAGES.map((image, index) => (
            <div key={`${image}-${index}`} className="landing-showcase__image">
              <img src={image} alt="Fashion and beauty product" loading="lazy" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default Landing
