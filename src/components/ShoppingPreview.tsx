import type { ShoppingPayload } from '../lib/parsers'

const ShoppingPreview = ({ data }: { data: ShoppingPayload }) => {
  const organic = data.organic?.slice(0, 6) ?? []
  const hero = data.knowledgeGraph

  if (!hero && organic.length === 0) {
    return null
  }

  return (
    <div className="shopping-preview">
      {hero && (
        <div className="shopping-hero">
          {hero.imageUrl && (
            <div className="shopping-hero__image">
              <img src={hero.imageUrl} alt={hero.title || 'Preview'} loading="lazy" />
            </div>
          )}
          <div className="shopping-hero__body">
            <p className="shopping-hero__eyebrow">Live shopping pulse</p>
            <h3>{hero.title}</h3>
            {hero.type && <span className="shopping-hero__type">{hero.type}</span>}
            {hero.description && (
              <p className="shopping-hero__description">{hero.description}</p>
            )}
            {hero.attributes && (
              <dl className="shopping-hero__attributes">
                {Object.entries(hero.attributes)
                  .slice(0, 4)
                  .map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
              </dl>
            )}
            {hero.website && (
              <a
                href={hero.website}
                className="shopping-hero__cta"
                target="_blank"
                rel="noreferrer"
              >
                Visit site ↗
              </a>
            )}
          </div>
        </div>
      )}

      {organic.length > 0 && (
        <div className="shopping-cards">
          {organic.map((item, index) => (
            <a
              key={`${item.link}-${index}`}
              href={item.link}
              target="_blank"
              rel="noreferrer"
              className="shopping-card"
              style={{ animationDelay: `${index * 0.03}s` }}
            >
              <div className="shopping-card__header">
                <span className="shopping-card__index">
                  {(item.position ?? index + 1).toString().padStart(2, '0')}
                </span>
                <p className="shopping-card__title">{item.title}</p>
              </div>
              {item.snippet && <p className="shopping-card__snippet">{item.snippet}</p>}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

export default ShoppingPreview
