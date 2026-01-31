import { useEffect, useState } from 'react'
import type { InventoryItem } from '../../types/user'
import { addInventoryItem, fetchUser } from '../../api/user'
import './Inventory.css'

type InventoryItemInput = InventoryItem & { imageFile?: File }

function Inventory() {
  const [products, setProducts] = useState<InventoryItem[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const user = await fetchUser('demo')
        setProducts(user.inventory)
      } catch (err) {
        console.error(err)
      }
    }
    fetchProducts()
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim()) {
      setError('Please add a name first')
      return
    }
    const payload: InventoryItem = {
      name: name.trim(),
      description: description.trim() || undefined,
    }
    try {
      const item = await addInventoryItem(payload)
      setProducts((prev) => [item, ...prev])
      setName('')
      setDescription('')
      setImageFile(null)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save item')
    }
  }

  return (
    <aside className="inventory-panel">
      <div className="inventory-panel__header">
        <h2>Inventory</h2>
      </div>
      <div className="inventory-panel__body">
        <form className="inventory-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Product name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <textarea
            rows={2}
            placeholder="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <input type="file" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} />
          {error && <p className="inventory-form__error">{error}</p>}
          <button type="submit">Save</button>
        </form>
        {products.length === 0 ? (
          <div>No products found.</div>
        ) : (
          <ul>
            {products.map((product, idx) => (
              <li key={idx}>
                <div>{product.name}</div>
                {product.description && <div>{product.description}</div>}
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
