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
      <header className="inventory-panel__header">
        <div>
          <p className="inventory-panel__eyebrow">Current cabinet</p>
          <h2>Skin care inventory</h2>
        </div>
      </header>

      <div className="inventory-panel__body">
        <div className="inventory-panel__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'photo'}
            className={mode === 'photo' ? 'is-active' : ''}
            onClick={() => setMode('photo')}
          >
            Upload photo
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'text'}
            className={mode === 'text' ? 'is-active' : ''}
            onClick={() => setMode('text')}
          >
            Type it in
          </button>
        </div>

        <form className="inventory-form" onSubmit={handleSubmit}>
          <label className="inventory-form__field">
            <span>Product name</span>
            <input
              type="text"
              placeholder="e.g., CeraVe PM Facial Lotion"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          {mode === 'photo' ? (
            <label className="inventory-form__field">
              <span>Upload a picture</span>
              <div className="inventory-form__upload">
                <input type="file" accept="image/*" onChange={handleFileChange} />
                <p>Drag a product photo or click to browse</p>
              </div>
              {imagePreview && (
                <div className="inventory-form__preview">
                  <img src={imagePreview} alt={name || 'Product preview'} />
                </div>
              )}
            </label>
          ) : (
            <label className="inventory-form__field">
              <span>Details</span>
              <textarea
                rows={3}
                placeholder="Write texture notes, when you like to use it..."
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
          )}

          {mode === 'photo' && (
            <label className="inventory-form__field">
              <span>Notes</span>
              <textarea
                rows={2}
                placeholder="Optional: how it feels, AM/PM placement, etc."
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
          )}

          {error && <p className="inventory-form__error">{error}</p>}
          <button type="submit" className="inventory-form__submit">
            Save to cabinet
          </button>
        </form>

        <section className="inventory-list" aria-live="polite">
          <h3>In rotation</h3>
          {items.length === 0 ? (
            <p className="inventory-list__empty">No products logged yet. Add your current cleanser, serum, or moisturizer to start tracking.</p>
          ) : (
            <ul>
              {items.map((item) => (
                <li key={item.id}>
                  {item.image && (
                    <span className="inventory-list__thumb" aria-hidden="true">
                      <img src={item.image} alt={item.name} />
                    </span>
                  )}
                  <div>
                    <p className="inventory-list__name">{item.name}</p>
                    {item.note && <p className="inventory-list__note">{item.note}</p>}
                    <p className="inventory-list__meta">Added {new Date(item.addedAt).toLocaleDateString()}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </aside>
  )
}

export type { InventoryItemInput }
export default Inventory
