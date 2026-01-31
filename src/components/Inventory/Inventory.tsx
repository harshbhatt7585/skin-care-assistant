import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import './Inventory.css'

export type InventoryItem = {
  id: string
  name: string
  note?: string
  image?: string
  addedAt: string
}

type InventoryItemInput = {
  name: string
  note?: string
  image?: string
}

type InventoryProps = {
  items: InventoryItem[]
  onAdd: (input: InventoryItemInput) => void
}

type Product = {
  name: string
  description?: string
  image?: string
}

const Inventory = ({ items, onAdd }: InventoryProps) => {
  const [mode, setMode] = useState<'photo' | 'text'>('photo')
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
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
      <div>
        <h2>Inventory</h2>
      </div>

      <div>
        
      </div>
    </aside>
  )
}

export type { InventoryItemInput }
export default Inventory
