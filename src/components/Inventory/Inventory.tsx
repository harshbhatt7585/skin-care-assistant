import { useState, type ChangeEvent, type FormEvent } from 'react'
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

const Inventory = ({ items, onAdd }: InventoryProps) => {
  const [mode, setMode] = useState<'photo' | 'text'>('photo')
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setName('')
    setNote('')
    setImagePreview(null)
    setError(null)
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setImagePreview(null)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null
      setImagePreview(result)
      if (!name.trim()) {
        setName(file.name.replace(/\.[^.]+$/, ''))
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim()) {
      setError('Add a product name first.')
      return
    }
    if (mode === 'photo' && !imagePreview) {
      setError('Upload a product photo to save this entry.')
      return
    }
    onAdd({
      name: name.trim(),
      note: note.trim() || undefined,
      image: mode === 'photo' ? imagePreview ?? undefined : undefined,
    })
    resetForm()
  }

  return (
    <aside className="inventory-panel">
    </aside>
  )
}

export type { InventoryItemInput }
export default Inventory
