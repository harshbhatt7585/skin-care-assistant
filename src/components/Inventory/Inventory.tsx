import type { InventoryItem } from '../../types/user'
import './Inventory.css'

type InventoryProps = {
  items: InventoryItem[]
  loading: boolean
  onAddClick: () => void
}

const Inventory = ({ items, loading, onAddClick }: InventoryProps) => {
  return (
    <aside className="inventory-panel">
      <header className="inventory-panel__header">
        <div>
          <p className="inventory-panel__eyebrow">Current cabinet</p>
          <h2>Skin care inventory</h2>
          <p className="inventory-panel__meta">{items.length} products logged</p>
        </div>
        <button type="button" className="inventory-panel__add" onClick={onAddClick}>
          <span aria-hidden="true">+</span>
          <span>Add product</span>
        </button>
      </header>

      <div className="inventory-panel__body">
        <section className="inventory-list" aria-live="polite">
          <h3>In rotation</h3>
          {loading ? (
            <p className="inventory-list__empty">Loading your products…</p>
          ) : items.length === 0 ? (
            <p className="inventory-list__empty">
              No products logged yet. Tap the + to add your cleanser, serum, or moisturizer.
            </p>
          ) : (
            <ul>
              {items.map((product, idx) => (
                <li key={`${product.name}-${idx}`}>
                  {product.image && (
                    <span className="inventory-list__thumb">
                      <img src={product.image} alt={product.name} />
                    </span>
                  )}
                  <p className="inventory-list__name">{product.name}</p>
                  {product.description && (
                    <p className="inventory-list__note">{product.description}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

    </aside>
  )
}

export default Inventory
