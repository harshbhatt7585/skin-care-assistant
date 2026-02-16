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

const SHOWCASE_ITEMS = [
  { title: 'Tailored Rack', price: '$89', image: '/images/lookbook/clothes-rack-1.jpg' },
  { title: 'Capsule Layers', price: '$72', image: '/images/lookbook/clothes-rack-2.jpg' },
  { title: 'Studio Wardrobe', price: '$95', image: '/images/lookbook/clothes-rack-3.jpg' },
  { title: 'Glow Serum Set', price: '$48', image: '/images/lookbook/beauty-flatlay-1.jpg' },
  { title: 'Matte Lip Duo', price: '$36', image: '/images/lookbook/beauty-flatlay-2.jpg' },
  { title: 'Clean Skin Kit', price: '$52', image: '/images/lookbook/beauty-flatlay-3.jpg' },
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
            <button type="button" className="landing-hero__primary" onClick={handleStart}>
              Enter the app
            </button>
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
        <p className="landing-showcase__eyebrow">Styra Edit</p>
        <h2>fashion + beauty product showcase</h2>
        <div className="landing-showcase__rail">
          {SHOWCASE_ITEMS.map((item) => (
            <article key={item.title} className="landing-showcase__card">
              <img src={item.image} alt={item.title} loading="lazy" />
              <div className="landing-showcase__meta">
                <h3>{item.title}</h3>
                <p>{item.price}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

    </div>
  )
}

export default Landing
