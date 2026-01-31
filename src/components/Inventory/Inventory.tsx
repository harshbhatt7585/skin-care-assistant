import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import type { InventoryItem } from '../../types/user'
import { addInventoryItem, fetchUser } from '../../api/user'
import './Inventory.css'

type InventoryProps = {
  uid: string | null
}

type Mode = 'photo' | 'text'

const DEFAULT_UID = 'demo'

const Inventory = ({ uid }: InventoryProps) => {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [mode, setMode] = useState<Mode>('photo')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const resolvedUid = uid || DEFAULT_UID

  useEffect(() => {
    let cancelled = false
    const loadInventory = async () => {
      try {
        setLoading(true)
        const user = await fetchUser(resolvedUid)
        if (!cancelled) {
          setItems(user.inventory)
        }
      } catch (error) {
        console.error('Failed to load inventory', error)
        if (!cancelled) {
          setItems([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    loadInventory()
    return () => {
      cancelled = true
    }
  }, [resolvedUid])

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setImagePreview(null)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImagePreview(reader.result)
        if (!name.trim()) {
          setName(file.name.replace(/\.[^.]+$/, ''))
        }
      }
    }
    reader.readAsDataURL(file)
  }

  const resetForm = () => {
    setName('')
    setDescription('')
    setImagePreview(null)
    setFormError(null)
    setShowForm(false)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim()) {
      setFormError('Add the product name first.')
      return
    }
    if (mode === 'photo' && !imagePreview) {
      setFormError('Upload a photo to save this entry.')
      return
    }
    try {
      setSaving(true)
      const payload: InventoryItem = {
        name: name.trim(),
        description: description.trim() || undefined,
        image: mode === 'photo' ? imagePreview ?? undefined : undefined,
      }
      const saved = await addInventoryItem(payload)
      setItems((prev) => [saved, ...prev])
      resetForm()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not save item.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <aside className="inventory-panel">
      <header className="inventory-panel__header">
        <div>
          <p className="inventory-panel__eyebrow">Current cabinet</p>
          <h2>Skin care inventory</h2>
          <p className="inventory-panel__meta">{items.length} products logged</p>
        </div>
        <button
          type="button"
          className="inventory-panel__add"
          onClick={() => setShowForm((prev) => !prev)}
          aria-expanded={showForm}
        >
          <span aria-hidden="true">+</span>
          <span>{showForm ? 'Hide form' : 'Add product'}</span>
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

      {showForm && (
        <div className="inventory-modal" role="dialog" aria-modal="true" aria-label="Add product">
          <div className="inventory-modal__content">
            <button type="button" className="inventory-modal__close" onClick={resetForm} aria-label="Close">
              ×
            </button>
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
                Just type
              </button>
            </div>

            <form className="inventory-form" onSubmit={handleSubmit}>
              <label className="inventory-form__field">
                <span>Product name</span>
                <input
                  type="text"
                  placeholder="e.g., Minimalist B5 Gel"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>

              <label className="inventory-form__field">
                <span>{mode === 'photo' ? 'Notes' : 'Details'}</span>
                <textarea
                  rows={mode === 'photo' ? 2 : 3}
                  placeholder="Texture, usage slot, how it feels..."
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>

              {mode === 'photo' && (
                <label className="inventory-form__field">
                  <span>Upload photo</span>
                  <div className="inventory-form__upload">
                    <input type="file" accept="image/*" onChange={handleFileChange} />
                    <p>Drop a product shot or browse files</p>
                    {imagePreview && (
                      <div className="inventory-form__preview">
                        <img src={imagePreview} alt={name || 'Product preview'} />
                      </div>
                    )}
                  </div>
                </label>
              )}

              {formError && <p className="inventory-form__error">{formError}</p>}
              <div className="inventory-form__actions">
                <button type="button" className="inventory-form__cancel" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="inventory-form__submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save to cabinet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  )
}

export default Inventory
