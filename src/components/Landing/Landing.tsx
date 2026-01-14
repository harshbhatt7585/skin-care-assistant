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
        <p className="landing-hero__description">
          Get personalized skincare recommendations based on AI analysis of your skin.
          Discover the perfect products for your morning and evening routines.
        </p>
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

      <section className="landing-features">
        <div className="landing-feature">
          <div className="landing-feature__icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
          <h3>AI Skin Analysis</h3>
          <p>Advanced face detection analyzes your skin from multiple angles</p>
        </div>

        <div className="landing-feature">
          <div className="landing-feature__icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <h3>Personalized Products</h3>
          <p>Get curated product recommendations tailored to your skin needs</p>
        </div>

        <div className="landing-feature">
          <div className="landing-feature__icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <h3>AM/PM Routines</h3>
          <p>Receive complete morning and evening skincare routines</p>
        </div>
      </section>
    </div>
  )
}

export default Landing

