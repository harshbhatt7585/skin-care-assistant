import { useMemo, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuth, signOut, type User } from 'firebase/auth'
import './App.css'

type AppProps = {
  user: User | null
  embedded?: boolean
  showStartButton?: boolean
  startCaptureSignal?: number
}

type Department = 'All' | 'Fashion' | 'Beauty' | 'Accessories' | 'Footwear'
type SortBy = 'trending' | 'price-low' | 'price-high' | 'rating'

type Product = {
  id: string
  name: string
  brand: string
  department: Exclude<Department, 'All'>
  price: number
  originalPrice?: number
  rating: number
  reviews: number
  badge?: string
  description: string
  palette: [string, string]
  icon: string
}

const DEPARTMENTS: Department[] = ['All', 'Fashion', 'Beauty', 'Accessories', 'Footwear']

const PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Sculpt Knit Blazer',
    brand: 'Atelier North',
    department: 'Fashion',
    price: 168,
    originalPrice: 220,
    rating: 4.8,
    reviews: 218,
    badge: 'Editor pick',
    description: 'Soft stretch tailoring with a cropped silhouette for day-to-night styling.',
    palette: ['#ffe8d4', '#f5b26f'],
    icon: '🧥',
  },
  {
    id: 'p2',
    name: 'Radiance Vitamin C Serum',
    brand: 'Lumen Lab',
    department: 'Beauty',
    price: 42,
    rating: 4.9,
    reviews: 1328,
    badge: 'Top rated',
    description: '15% vitamin C formula for brighter tone and lightweight hydration.',
    palette: ['#fff0bc', '#ffca63'],
    icon: '✨',
  },
  {
    id: 'p3',
    name: 'Satin Arc Crossbody',
    brand: 'Mode Finch',
    department: 'Accessories',
    price: 124,
    rating: 4.6,
    reviews: 440,
    description: 'Convertible strap and structured interior with polished hardware.',
    palette: ['#d4ddff', '#7992ff'],
    icon: '👜',
  },
  {
    id: 'p4',
    name: 'Cloudstep Platform Sneaker',
    brand: 'Vela Run',
    department: 'Footwear',
    price: 98,
    originalPrice: 129,
    rating: 4.7,
    reviews: 612,
    badge: 'Flash deal',
    description: 'Air-cushioned sole, breathable knit upper, and all-day comfort support.',
    palette: ['#d7fff4', '#4fd8ab'],
    icon: '👟',
  },
  {
    id: 'p5',
    name: 'Gloss Lock Lip Oil Set',
    brand: 'Mysa Beauty',
    department: 'Beauty',
    price: 36,
    rating: 4.5,
    reviews: 850,
    description: 'Three non-sticky shades infused with jojoba and squalane.',
    palette: ['#ffd8de', '#ff8498'],
    icon: '💄',
  },
  {
    id: 'p6',
    name: 'Pleatline Wide Trousers',
    brand: 'Atelier North',
    department: 'Fashion',
    price: 112,
    rating: 4.4,
    reviews: 195,
    description: 'High-rise drape fit with wrinkle-resistant performance fabric.',
    palette: ['#f4f0df', '#d1bd87'],
    icon: '👖',
  },
  {
    id: 'p7',
    name: 'Aura Mesh Hoop Set',
    brand: 'Mika Form',
    department: 'Accessories',
    price: 58,
    rating: 4.7,
    reviews: 311,
    description: 'Gold-plated geometric hoops designed for lightweight daily wear.',
    palette: ['#fff5db', '#f4c04f'],
    icon: '💍',
  },
  {
    id: 'p8',
    name: 'Barrier Reset Night Cream',
    brand: 'Lumen Lab',
    department: 'Beauty',
    price: 54,
    rating: 4.8,
    reviews: 522,
    description: 'Ceramide-rich overnight moisturizer for resilient skin by morning.',
    palette: ['#e0e8ff', '#91a6ff'],
    icon: '🧴',
  },
  {
    id: 'p9',
    name: 'Nova Heel Sandal',
    brand: 'Vela Run',
    department: 'Footwear',
    price: 146,
    rating: 4.3,
    reviews: 178,
    description: 'Squared toe with sculpted heel in a minimalist evening-ready shape.',
    palette: ['#fce6da', '#f5a473'],
    icon: '👠',
  },
  {
    id: 'p10',
    name: 'Contour Denim Jacket',
    brand: 'Mode Finch',
    department: 'Fashion',
    price: 138,
    rating: 4.6,
    reviews: 304,
    description: 'Structured seams and soft-washed cotton denim for layered fits.',
    palette: ['#dde6ff', '#96a9f8'],
    icon: '🪡',
  },
]

const PRODUCT_BY_ID = new Map(PRODUCTS.map((product) => [product.id, product]))
const CURRENCY = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const formatPrice = (value: number) => CURRENCY.format(value)

function App({ user, embedded = false }: AppProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState<Department>('All')
  const [sortBy, setSortBy] = useState<SortBy>('trending')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [favorites, setFavorites] = useState<string[]>([])

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const filtered = PRODUCTS.filter((product) => {
      const matchesDepartment = department === 'All' || product.department === department
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [product.name, product.brand, product.description, product.department]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery)
      return matchesDepartment && matchesQuery
    })

    const sorted = [...filtered]
    if (sortBy === 'price-low') {
      sorted.sort((a, b) => a.price - b.price)
    } else if (sortBy === 'price-high') {
      sorted.sort((a, b) => b.price - a.price)
    } else if (sortBy === 'rating') {
      sorted.sort((a, b) => b.rating - a.rating)
    }
    return sorted
  }, [department, query, sortBy])

  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .map(([productId, quantity]) => {
          const product = PRODUCT_BY_ID.get(productId)
          if (!product) return null
          return {
            product,
            quantity,
            lineTotal: product.price * quantity,
          }
        })
        .filter((item): item is { product: Product; quantity: number; lineTotal: number } => item !== null),
    [cart]
  )

  const cartItemCount = useMemo(
    () => cartItems.reduce((total, item) => total + item.quantity, 0),
    [cartItems]
  )

  const subtotal = useMemo(
    () => cartItems.reduce((total, item) => total + item.lineTotal, 0),
    [cartItems]
  )

  const estimatedShipping = subtotal >= 120 || subtotal === 0 ? 0 : 8
  const total = subtotal + estimatedShipping

  const addToCart = (productId: string) => {
    setCart((current) => ({
      ...current,
      [productId]: (current[productId] ?? 0) + 1,
    }))
  }

  const updateCartQuantity = (productId: string, change: number) => {
    setCart((current) => {
      const nextQuantity = (current[productId] ?? 0) + change
      if (nextQuantity <= 0) {
        const { [productId]: _removed, ...rest } = current
        return rest
      }
      return {
        ...current,
        [productId]: nextQuantity,
      }
    })
  }

  const toggleFavorite = (productId: string) => {
    setFavorites((current) =>
      current.includes(productId)
        ? current.filter((entry) => entry !== productId)
        : [...current, productId]
    )
  }

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

      <section className="shop-controls" aria-label="Catalog controls">
        <div className="shop-controls__row">
          <div className="shop-chips" role="tablist" aria-label="Department filter">
            {DEPARTMENTS.map((option) => (
              <button
                key={option}
                type="button"
                className={`shop-chip ${department === option ? 'is-active' : ''}`}
                onClick={() => setDepartment(option)}
              >
                {option}
              </button>
            ))}
          </div>

          <label className="shop-sort" htmlFor="catalog-sort">
            <span>Sort</span>
            <select
              id="catalog-sort"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortBy)}
            >
              <option value="trending">Trending</option>
              <option value="rating">Highest rated</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
            </select>
          </label>
        </div>
      </section>

      <div className="shop-layout">
        <section className="catalog-grid" aria-label="Product catalog">
          {visibleProducts.map((product) => {
            const isFavorite = favorites.includes(product.id)
            const mediaStyle = {
              '--tone-a': product.palette[0],
              '--tone-b': product.palette[1],
            } as CSSProperties

            return (
              <article key={product.id} className="catalog-card">
                <button
                  type="button"
                  className={`catalog-card__favorite ${isFavorite ? 'is-active' : ''}`}
                  onClick={() => toggleFavorite(product.id)}
                  aria-label={isFavorite ? 'Remove from wishlist' : 'Save to wishlist'}
                >
                  {isFavorite ? '♥' : '♡'}
                </button>

                <div className="catalog-card__media" style={mediaStyle}>
                  <span aria-hidden="true">{product.icon}</span>
                </div>

                <div className="catalog-card__body">
                  <p className="catalog-card__brand">{product.brand}</p>
                  <h3>{product.name}</h3>
                  <p className="catalog-card__description">{product.description}</p>

                  <div className="catalog-card__meta">
                    <p>
                      <strong>{formatPrice(product.price)}</strong>
                      {product.originalPrice ? <span>{formatPrice(product.originalPrice)}</span> : null}
                    </p>
                    <p>
                      ★ {product.rating.toFixed(1)} <span>({product.reviews})</span>
                    </p>
                  </div>

                  <div className="catalog-card__footer">
                    <span className="catalog-card__department">{product.department}</span>
                    {product.badge ? <span className="catalog-card__badge">{product.badge}</span> : null}
                  </div>

                  <button type="button" className="catalog-card__cta" onClick={() => addToCart(product.id)}>
                    Add to bag
                  </button>
                </div>
              </article>
            )
          })}

          {visibleProducts.length === 0 ? (
            <p className="catalog-empty">No products found for your filters. Try another search term.</p>
          ) : null}
        </section>

        <aside className="cart-panel" aria-label="Shopping cart">
          <header className="cart-panel__header">
            <h3>Your bag</h3>
            <p>{cartItemCount} item(s)</p>
          </header>

          {cartItems.length === 0 ? (
            <p className="cart-empty">Add products from the catalog to start checkout.</p>
          ) : (
            <ul className="cart-list">
              {cartItems.map(({ product, quantity, lineTotal }) => (
                <li key={product.id} className="cart-item">
                  <div>
                    <p className="cart-item__name">{product.name}</p>
                    <p className="cart-item__brand">{product.brand}</p>
                  </div>
                  <p className="cart-item__price">{formatPrice(lineTotal)}</p>
                  <div className="cart-item__qty">
                    <button type="button" onClick={() => updateCartQuantity(product.id, -1)}>
                      -
                    </button>
                    <span>{quantity}</span>
                    <button type="button" onClick={() => updateCartQuantity(product.id, 1)}>
                      +
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <footer className="cart-panel__summary">
            <div>
              <span>Subtotal</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>
            <div>
              <span>Shipping</span>
              <strong>{estimatedShipping === 0 ? 'Free' : formatPrice(estimatedShipping)}</strong>
            </div>
            <div className="cart-panel__total">
              <span>Total</span>
              <strong>{formatPrice(total)}</strong>
            </div>
            <button type="button" className="cart-panel__checkout" disabled={cartItems.length === 0}>
              Checkout securely
            </button>
          </footer>
        </aside>
      </div>
    </div>
  )
}

export default App
