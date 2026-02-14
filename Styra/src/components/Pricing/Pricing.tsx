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
        name: 'Style Pass',
        priceMonthly: 9,
        priceAnnual: 81,
        description: 'Better prices and faster delivery for daily beauty and fashion shopping.',
        features: [
          'Free shipping over $49',
          'Members-only weekly deals',
          'Early access to launches',
          'Unified wishlist + restock alerts',
        ],
      },
      {
        name: 'Insider Edit',
        priceMonthly: 19,
        priceAnnual: 171,
        description: 'Curated styling and beauty recommendations powered by your shopping profile.',
        features: [
          'Everything in Style Pass',
          'Personalized beauty routine picks',
          'Monthly capsule wardrobe suggestions',
          'Priority support chat',
        ],
        highlight: true,
      },
      {
        name: 'Studio Elite',
        priceMonthly: 39,
        priceAnnual: 351,
        description: 'Premium tier for frequent shoppers and creators managing multiple collections.',
        features: [
          'Everything in Insider Edit',
          'Complimentary express delivery',
          'Quarterly 1:1 style concierge session',
          'Advanced bundle and gifting tools',
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
              Styra
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
          <h1 className="pricing-hero__title">Pick the membership that matches how you shop.</h1>
          <p className="pricing-hero__subtitle">
            Unlock faster delivery, personalized recommendations, and exclusive fashion and beauty
            drops with flexible monthly or annual plans.
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
            <article key={plan.name} className={`pricing-card ${plan.highlight ? 'pricing-card--highlight' : ''}`}>
              {plan.highlight && <span className="pricing-card__pill">Most chosen</span>}
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

      <section className="pricing-faq" aria-label="Membership details">
        <div className="pricing-faq__card">
          <h3>What does the free trial include?</h3>
          <p>
            Every plan starts with a 7-day trial, including personalized recommendations, member
            pricing, and early access drops.
          </p>
        </div>
        <div className="pricing-faq__card">
          <h3>Can I cancel anytime?</h3>
          <p>
            Yes. Cancel in one click from your account settings. Your saved products and preferences
            remain available whenever you return.
          </p>
        </div>
        <div className="pricing-faq__card">
          <h3>Do you support gifting?</h3>
          <p>
            Yes. Insider Edit and Studio Elite include curated gift bundles and scheduled delivery
            options for special occasions.
          </p>
        </div>
      </section>
    </div>
  )
}

export default Pricing
