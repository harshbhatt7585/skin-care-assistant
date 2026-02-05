import { useNavigate } from 'react-router-dom'
import Pricing from '../Pricing/Pricing'
import App from '../../App'
import type { User } from 'firebase/auth'
import './Landing.css'

type LandingProps = {
  user: User | null
}

const Landing = ({ user }: LandingProps) => {
  const navigate = useNavigate()

  const handleGetStarted = () => {
    document.getElementById('capture')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handlePricing = () => {
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="landing-page">
      <header className="landing-hero">
        <h1 className="brand-logo">
          <span className="brand-logo__glow" aria-hidden="true">Glowly</span>
          <span className="brand-logo__text">Glowly</span>
        </h1>
        <p className="landing-hero__tagline">Your AI-powered skin care companion</p>
        <button
          type="button"
          className="cta-elegant"
          onClick={handleGetStarted}
        >
          <span className="cta-elegant__text">Get Started</span>
          <span className="cta-elegant__icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </span>
        </button>
      </header>
      <section id="capture" className="landing-capture" aria-label="Capture">
        <App user={user} embedded />
      </section>
      <section id="pricing" className="landing-pricing" aria-label="Pricing">
        <Pricing embedded />
      </section>
    </div>
  )
}

export default Landing
