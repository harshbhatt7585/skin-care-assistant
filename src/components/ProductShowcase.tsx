import type { ProductSection } from '../lib/parsers'

const ProductShowcase = ({ sections }: { sections: ProductSection[] }) => (
  <div className="product-showcase">
    {sections.map((section, sectionIndex) => (
      <div className="product-showcase__section" key={`${section.title}-${sectionIndex}`}>
        <div className="product-showcase__heading">
          <span className="product-showcase__dot" />
          <h4>{section.title}</h4>
        </div>
        <div className="product-showcase__list">
          {section.entries.map((entry, entryIndex) => {
            const targetUrl = entry.link || entry.thumbnail
            const card = (
              <div className="product-card" style={{ animationDelay: `${entryIndex * 0.04}s` }}>
                {entry.thumbnail && (
                  <div className="product-card__thumb">
                    <img
                      src={entry.thumbnail}
                      alt={entry.alt || entry.retailer}
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="product-card__body">
                  <p className="product-card__retailer">{entry.retailer}</p>
                  {entry.reason && <p className="product-card__reason">{entry.reason}</p>}
                </div>
              </div>
            )

            return targetUrl ? (
              <a
                key={`${entry.retailer}-${entryIndex}`}
                href={targetUrl}
                className="product-card__link"
                target="_blank"
                rel="noreferrer"
              >
                {card}
              </a>
            ) : (
              <div key={`${entry.retailer}-${entryIndex}`} className="product-card__link">
                {card}
              </div>
            )
          })}
        </div>
      </div>
    ))}
  </div>
)

export default ProductShowcase
