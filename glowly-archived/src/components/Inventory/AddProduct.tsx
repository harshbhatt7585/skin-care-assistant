import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import Inventory from './Inventory'
import type { InventoryItem } from '../../types/user'
import { fetchUser, addInventoryItem } from '../../api/user'

const DEFAULT_UID = 'demo'

type AddProductProps = {
  uid: string | null
  isOpen: boolean
  onClose: () => void
}

const AddProduct = ({ uid, isOpen, onClose }: AddProductProps) => {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [mode, setMode] = useState<'photo' | 'text'>('photo')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    const loadInventory = async () => {
      try {
        setLoading(true)
        const data = await fetchUser(uid ?? DEFAULT_UID)
        if (!cancelled) setItems(data.inventory ?? [])
      } catch (err) {
        console.error('Failed to load inventory', err)
        if (!cancelled) setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadInventory()
    return () => {
      cancelled = true
    }
  }, [isOpen, uid])

  const resetForm = () => {
    setName('')
    setDescription('')
    setImagePreview(null)
    setError(null)
    setMode('photo')
    setSaving(false)
    setShowForm(false)
  }

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim()) {
      setError('Add the product name first.')
      return
    }
    if (mode === 'photo' && !imagePreview) {
      setError('Upload a photo first.')
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save item')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <>
      <div className="inventory-drawer" role="dialog" aria-label="Skin care inventory">
        <button className="inventory-drawer__close" aria-label="Close inventory" onClick={onClose}>
          ×
        </button>
        <Inventory items={items} loading={loading} onAddClick={() => setShowForm(true)} />
      </div>

      {showForm && (
        <div className="inventory-overlay" role="dialog" aria-modal="true" aria-label="Add inventory item">
          <div className="inventory-overlay__backdrop" onClick={resetForm} />
          <div className="inventory-overlay__content">
            <button className="inventory-overlay__close" onClick={resetForm} aria-label="Close">
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

              {error && <p className="inventory-form__error">{error}</p>}
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
    </>
  )
}

export default AddProduct
