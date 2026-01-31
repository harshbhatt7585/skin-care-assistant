import { useEffect, useState } from 'react'
import './Inventory.css'

type Product = {
  name: string
  description?: string
  image?: string
}

type InventoryItemInput = {
  name: string
  description?: string
  image?: string
}

async function getProducts(): Promise<Product[]> {
  // Placeholder async function; replace with actual API call if needed
  return [
    { name: 'Example Item', description: 'An example item.', image: undefined }
  ]
}

function Inventory() {
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    const fetchProducts = async () => {
      const products = await getProducts()
      setProducts(products)
    }
    fetchProducts()
  }, [])

  return (
    <aside className="inventory-panel">
      <div className="inventory-panel__header">
        <h2>Inventory</h2>
      </div>
      <div className="inventory-panel__body">
        {products.length === 0 ? (
          <div>No products found.</div>
        ) : (
          <ul>
            {products.map((product, idx) => (
              <li key={idx}>
                <div>{product.name}</div>
                {product.description && <div>{product.description}</div>}
                {/* Display image if available */}
                {product.image && <img src={product.image} alt={product.name} />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}

export type { InventoryItemInput }
export default Inventory
