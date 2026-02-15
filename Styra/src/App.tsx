import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuth, signOut, type User } from 'firebase/auth'
import './App.css'

type AppProps = {
  user: User | null
  embedded?: boolean
  showStartButton?: boolean
  startCaptureSignal?: number
}

function App({ user, embedded = false }: AppProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const handleAccountAction = async () => {
    if (!user) {
      navigate('/signin')
      return
    }

    try {
      await signOut(getAuth())
      navigate('/')
    } catch (error) {
      console.error('Unable to sign out', error)
    }
  }

  return (
    <div className={`shop-page ${embedded ? 'shop-page--embedded' : ''}`}>
      <header className="shop-topbar">
        <div className="shop-brand">
          <p className="shop-brand__eyebrow">Ultimate fashion + beauty app</p>
          <h1>Styra</h1>
        </div>
        <div className="shop-topbar__actions">
          <button type="button" className="shop-link" onClick={() => navigate('/pricing')}>
            Membership
          </button>
          <button type="button" className="shop-account" onClick={handleAccountAction}>
            {user ? 'Sign out' : 'Sign in'}
          </button>
        </div>
      </header>

      <section className="shop-hero">
        <div className="shop-hero__content">
          <p className="shop-hero__eyebrow">Find products fast</p>
          <h2>What do you want to buy today?</h2>
          <label className="shop-search shop-search--hero" htmlFor="catalog-search">
            <span>Search products</span>
            <input
              id="catalog-search"
              type="search"
              placeholder="Try serum, blazer, sneaker, tote bag..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="shop-placeholder" aria-live="polite">
        <p>{query.trim() ? `Searching for "${query.trim()}"` : 'Start typing to search products.'}</p>
      </section>
    </div>
  )
}

export default App
