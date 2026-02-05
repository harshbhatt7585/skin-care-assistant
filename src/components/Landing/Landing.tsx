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
