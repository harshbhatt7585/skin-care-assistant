import type { ShoppingPayload } from '../lib/parsers'

const stageLabel = (index: number) => (index % 2 === 0 ? 'AM ritual' : 'PM ritual')

const formatRating = (value?: number) => {
  if (typeof value !== 'number') return undefined
  const trimmed = value.toFixed(1).replace(/\.0$/, '')
  return trimmed
}

const ShoppingPreview = ({ data }: { data: ShoppingPayload }) => {
  const products = data.products?.slice(0, 8) ?? []
  if (products.length === 0) {
    return null
  }

  return (
    <div className="shopping-preview shopping-preview--products">
      <div className="shopping-preview__header">
        <div>
          <p className="shopping-preview__eyebrow">Curated kit</p>
        </div>
        <span className="shopping-preview__hint">Tap a tile to open the product</span>
      </div>

      <div className="shopping-products">
        {products.map((product, index) => {
          const stage = stageLabel(index)
          const rating = formatRating(product.rating)
          const ratingCount = typeof product.ratingCount === 'number' ? product.ratingCount : undefined
          const badgeValue = (product.position ?? index + 1).toString().padStart(2, '0')

          return (
            <a
              key={`${product.link}-${index}`}
              href={product.link}
              target="_blank"
              rel="noreferrer"
              className="shopping-product"
              style={{ animationDelay: `${index * 0.04}s` }}
            >
              <span className="shopping-product__badge">{badgeValue}</span>
              <div
                className={`shopping-product__thumb${product.imageUrl ? '' : ' shopping-product__thumb--placeholder'}`}
              >
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.title} loading="lazy" />
                ) : (
                  <span>No image</span>
                )}
              </div>
              <div className="shopping-product__meta">
                <p className="shopping-product__window">
                  {stage}
                  {product.source && <span className="shopping-product__source"> · {product.source}</span>}
                </p>
                <h4>{product.title}</h4>
                {(product.price || rating) && (
                  <div className="shopping-product__stats">
                    {product.price && <span className="shopping-product__price">{product.price}</span>}
                    {rating && (
                      <span className="shopping-product__rating">
                        ★ {rating}
                        {ratingCount ? <span className="shopping-product__rating-count"> ({ratingCount})</span> : null}
                      </span>
                    )}
                  </div>
                )}
                <span className="shopping-product__cta">View product ↗</span>
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}

export default ShoppingPreview
