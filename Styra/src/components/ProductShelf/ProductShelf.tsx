import type { CSSProperties } from 'react'
import type { ShoppingProduct } from '../../lib/parsers'
import './ProductShelf.css'

const formatRating = (value?: number): string | undefined => {
  if (typeof value !== 'number') return undefined
  return value.toFixed(1).replace(/\.0$/, '')
}

const ProductShelf = ({ products }: { products: ShoppingProduct[] }) => {
  const visibleProducts = products.slice(0, 8)
  if (visibleProducts.length === 0) return null

  return (
    <div className="shop-product-strip" role="list" aria-label="Recommended products">
      {visibleProducts.map((product, index) => {
        const rating = formatRating(product.rating)
        const ratingCount =
          typeof product.ratingCount === 'number' ? product.ratingCount : undefined
        const style = {
          '--product-pop-delay': `${index * 70}ms`,
        } as CSSProperties

        return (
          <a
            key={`${product.link}-${index}`}
            href={product.link}
            target="_blank"
            rel="noreferrer"
            className="shop-product-tile"
            style={style}
            role="listitem"
          >
            <div
              className={`shop-product-tile__image${
                product.imageUrl ? '' : ' shop-product-tile__image--placeholder'
              }`}
            >
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.title} loading="lazy" />
              ) : (
                <span>No image</span>
              )}
            </div>
            <div className="shop-product-tile__body">
              <h4>{product.title}</h4>
              <p className="shop-product-tile__source">{product.source || 'Online store'}</p>
              {(product.price || rating) && (
                <div className="shop-product-tile__stats">
                  {product.price ? (
                    <span className="shop-product-tile__price">{product.price}</span>
                  ) : null}
                  {rating ? (
                    <span className="shop-product-tile__rating">
                      ★ {rating}
                      {ratingCount ? (
                        <span className="shop-product-tile__rating-count">
                          {' '}
                          ({ratingCount})
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </div>
              )}
              <span className="shop-product-tile__cta">Open product ↗</span>
            </div>
          </a>
        )
      })}
    </div>
  )
}

export default ProductShelf
