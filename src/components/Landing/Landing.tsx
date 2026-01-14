import { useNavigate } from 'react-router-dom'
import './Landing.css'

const Landing = () => {
  const navigate = useNavigate()

  const handleGetStarted = () => {
    navigate('/signin')
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
    </div>
  )
}

export default Landing

