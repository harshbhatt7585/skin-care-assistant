import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Pricing.css'

type PricingProps = {
  embedded?: boolean
}

const Pricing = ({ embedded = false }: PricingProps) => {
  const navigate = useNavigate()
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')

  const plans = useMemo(
    () => [
      {
        name: 'Essential',
        priceMonthly: 12,
        priceAnnual: 108,
        description: 'Daily skin tracking with AI highlights and product matches.',
        features: [
          'Unlimited scan history',
          'Morning + night routine guidance',
          'Ingredient compatibility alerts',
          'Weekly progress snapshots',
        ],
      },
      {
        name: 'Studio',
        priceMonthly: 26,
        priceAnnual: 234,
        description: 'Deeper diagnostics plus curated product plans and shareable reports.',
        features: [
          'Everything in Essential',
          'Derm-inspired AI scoring',
          'Pro routine builder',
          'Shareable care plan PDF',
        ],
        highlight: true,
      },
      {
        name: 'Concierge',
        priceMonthly: 54,
        priceAnnual: 486,
        description: 'White-glove care with specialist handoffs and priority insights.',
        features: [
          'Everything in Studio',
          'Priority product drops',
          'Specialist review within 24h',
          'Quarterly consultation call',
        ],
      },
    ],
    []
  )

  const handleStart = () => {
    navigate('/signin')
  }

  return (
    <div className={`pricing-page ${embedded ? 'pricing-page--embedded' : ''}`}>
      <header className="pricing-hero">
        {!embedded && (
          <nav className="pricing-nav">
            <button type="button" className="pricing-nav__logo" onClick={() => navigate('/')}>
              Glowly
            </button>
            <div className="pricing-nav__actions">
              <button type="button" className="pricing-nav__link" onClick={() => navigate('/signin')}>
                Sign in
              </button>
              <button type="button" className="pricing-nav__cta" onClick={handleStart}>
                Start free
              </button>
            </div>
          </nav>
        )}

        <div className="pricing-hero__content">
          <h1 className="pricing-hero__title">Find the ritual that fits your glow.</h1>
          <p className="pricing-hero__subtitle">
            Adaptive plans crafted for skin analytics, product intelligence, and daily care rituals.
            Switch anytime. No hidden fees.
          </p>
          <div className="billing-toggle" role="group" aria-label="Billing cadence">
            <button
              type="button"
              className={`billing-toggle__button ${billingCycle === 'monthly' ? 'is-active' : ''}`}
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`billing-toggle__button ${billingCycle === 'annual' ? 'is-active' : ''}`}
              onClick={() => setBillingCycle('annual')}
            >
              Annual
              <span className="billing-toggle__badge">Save 25%</span>
            </button>
          </div>
        </div>
      </header>

      <section className="pricing-grid" aria-label="Pricing plans">
        {plans.map((plan) => {
          const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceAnnual
          const cadenceLabel = billingCycle === 'monthly' ? 'per month' : 'per year'
          return (
            <article
              key={plan.name}
              className={`pricing-card ${plan.highlight ? 'pricing-card--highlight' : ''}`}
            >
              {plan.highlight && <span className="pricing-card__pill">Most loved</span>}
              <h2 className="pricing-card__title">{plan.name}</h2>
              <p className="pricing-card__description">{plan.description}</p>
              <div className="pricing-card__price">
                <span className="pricing-card__amount">${price}</span>
                <span className="pricing-card__cadence">{cadenceLabel}</span>
              </div>
              <button type="button" className="pricing-card__cta" onClick={handleStart}>
                Start with {plan.name}
              </button>
              <ul className="pricing-card__list">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </article>
          )
        })}
      </section>

      <section className="pricing-faq" aria-label="Pricing details">
        <div className="pricing-faq__card">
          <h3>What is included in the free trial?</h3>
          <p>
            Every plan starts with a 7-day trial that unlocks full scanning, routine insights, and
            product matches. We will remind you 48 hours before the trial ends.
          </p>
        </div>
        <div className="pricing-faq__card">
          <h3>Can I cancel or pause anytime?</h3>
          <p>
            Yes. You can cancel or pause your plan from the dashboard with one click. Your scan
            history stays saved so you can resume whenever you like.
          </p>
        </div>
        <div className="pricing-faq__card">
          <h3>Do you support teams or clinics?</h3>
          <p>
            We offer multi-user studio plans for estheticians and clinics. Contact us for custom
            onboarding and SLAs.
          </p>
        </div>
      </section>
    </div>
  )
}

export default Pricing
