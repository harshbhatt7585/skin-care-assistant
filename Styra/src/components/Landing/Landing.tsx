import { useNavigate } from 'react-router-dom'
import type { User } from 'firebase/auth'
import Pricing from '../Pricing/Pricing'
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

const Landing = ({ user }: LandingProps) => {
  const navigate = useNavigate()

  const handleStart = () => {
    navigate(user ? '/home' : '/signin')
  }

  return (
    <div className="landing-page">
      <header className="landing-nav">
        <button type="button" className="landing-nav__brand" onClick={() => navigate('/')}>
          Styra
        </button>
        <div className="landing-nav__actions">
          <button type="button" className="landing-nav__link" onClick={() => navigate('/pricing')}>
            Membership
          </button>
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
            <button type="button" className="landing-hero__ghost" onClick={() => navigate('/pricing')}>
              View plans
            </button>
          </div>
        </div>
        <aside className="landing-hero__panel" aria-label="Key numbers">
          <article>
            <span>15k+</span>
            <p>Products curated weekly</p>
          </article>
          <article>
            <span>4.9/5</span>
            <p>Average customer rating</p>
          </article>
          <article>
            <span>24/7</span>
            <p>Personalized shopping guidance</p>
          </article>
        </aside>
      </section>

      <section className="landing-categories" aria-label="Category spotlight">
        {CATEGORY_SPOTLIGHT.map((category) => (
          <article key={category.title} className="landing-category">
            <h2>{category.title}</h2>
            <p>{category.note}</p>
          </article>
        ))}
      </section>

      <section className="landing-pricing" aria-label="Membership plans">
        <Pricing embedded />
      </section>
    </div>
  )
}

export default Landing
