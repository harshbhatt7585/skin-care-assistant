'use client'

import { useRouter } from 'next/navigation'
import type { User } from 'firebase/auth'
import './Landing.css'

type LandingProps = {
  user: User | null
}

const CATEGORY_SPOTLIGHT = [
  { title: 'Fashion', note: 'Tailored picks from daily fits to statement layers.' },
  { title: 'Beauty', note: 'High-performance skincare and makeup edits.' },
  { title: 'Accessories', note: 'Bags, jewelry, and finishing details that convert any look.' },
  { title: 'Footwear', note: 'Sneakers, heels, and comfort-first essentials in one feed.' },
]

const SHOWCASE_IMAGES = [
  '/images/lookbook/gshop-1-cutout.png',
  '/images/lookbook/gshop-2-cutout.png',
  '/images/lookbook/gshop-3-cutout.png',
  '/images/lookbook/gshop-4-cutout.png',
  '/images/lookbook/gshop-5-cutout.png',
  '/images/lookbook/gshop-6-cutout.png',
  '/images/lookbook/gshop-7-cutout.png',
]

const Landing = ({ user }: LandingProps) => {
  const router = useRouter()

  const handleStart = () => {
    router.push(user ? '/home' : '/signin')
  }

  return (
    <div className="landing-page">
      <header className="landing-nav">
        <button type="button" className="landing-nav__brand" onClick={() => router.push('/')}>
          Styra
        </button>
        <div className="landing-nav__actions">
          <button type="button" className="landing-nav__cta" onClick={handleStart}>
            Start shopping
          </button>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero__content">
          <p className="landing-hero__eyebrow">Fashion + beauty marketplace</p>
          <h1>
            One app for style discovery,
            <br />
            beauty essentials, and fast checkout.
          </h1>
          <p>
            Styra blends trend intelligence and curated products so you can move from inspiration
            to purchase in minutes.
          </p>
          <div className="landing-hero__actions">
          </div>
        </div>
      </section>

      <section className="landing-categories" aria-label="Category spotlight">
        {CATEGORY_SPOTLIGHT.map((category) => (
          <article key={category.title} className="landing-category">
            <h2>{category.title}</h2>
            <p>{category.note}</p>
          </article>
        ))}
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
