'use client'

import { useMemo, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { generateTryOnModel } from '../../api/virtualTryOn'
import './ModelStudio.css'

type ModelStudioProps = {
  uid: string
}

const MODEL_PROMPTS = [
  {
    label: 'Runway Editorial',
    value:
      'Generate a high-fashion editorial model render from the uploaded full-body photo with clean posture and premium styling details.',
  },
  {
    label: 'Street Luxe',
    value:
      'Generate a modern street-style fashion model render with realistic body proportions and natural pose continuity.',
  },
  {
    label: 'Minimal Studio',
    value:
      'Generate a neutral studio model render optimized for virtual try-on garment overlays and clean silhouette extraction.',
  },
]

const BACKDROPS = ['Warm studio', 'Soft daylight', 'Neutral white', 'Urban mood'] as const

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }
      reject(new Error('Unable to read image file.'))
    }
    reader.onerror = () => reject(new Error('Failed to read the uploaded image.'))
    reader.readAsDataURL(file)
  })

const ModelStudio = ({ uid }: ModelStudioProps) => {
  const router = useRouter()
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null)
  const [photoName, setPhotoName] = useState<string>('')
  const [prompt, setPrompt] = useState<string>(MODEL_PROMPTS[0].value)
  const [backdrop, setBackdrop] = useState<string>(BACKDROPS[0])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedModelUrl, setGeneratedModelUrl] = useState<string | null>(null)
  const [generatedModelId, setGeneratedModelId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [endpoint, setEndpoint] = useState<string | null>(null)

  const stageLabel = useMemo(() => {
    if (isGenerating) return 'Generating model...'
    if (generatedModelUrl) return 'Model ready for virtual try-on'
    if (photoDataUrl) return 'Photo ready. Generate your model.'
    return 'Upload a full-body photo to begin'
  }, [generatedModelUrl, isGenerating, photoDataUrl])

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    setGeneratedModelUrl(null)
    setGeneratedModelId(null)
    setEndpoint(null)

    try {
      const dataUrl = await fileToDataUrl(file)
      setPhotoDataUrl(dataUrl)
      setPhotoName(file.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the selected image.')
    }
  }

  const handleGenerateModel = async () => {
    if (!photoDataUrl || isGenerating) return

    setIsGenerating(true)
    setError(null)
    setGeneratedModelUrl(null)
    setGeneratedModelId(null)
    setEndpoint(null)

    try {
      const result = await generateTryOnModel({
        uid,
        photoDataUrl,
        modelPrompt: prompt,
        backgroundStyle: backdrop,
      })
      setGeneratedModelUrl(result.modelImageUrl)
      setGeneratedModelId(result.modelId ?? null)
      setEndpoint(result.endpoint)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Model generation failed. Verify your image generation API endpoint.'
      )
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <main className="model-studio">
      <div className="model-studio__aura model-studio__aura--one" aria-hidden="true" />
      <div className="model-studio__aura model-studio__aura--two" aria-hidden="true" />
      <div className="model-studio__aura model-studio__aura--three" aria-hidden="true" />

      <header className="model-studio__header">
        <button type="button" className="model-studio__back" onClick={() => router.push('/home')}>
          Back
        </button>
        <p className="model-studio__eyebrow">Inventory AI Lab</p>
        <h1>Virtual Try-On Model Studio</h1>
        <p>
          Upload one full-body photo. We generate a model-ready base image that can be used for
          virtual try-on pipelines.
        </p>
      </header>

      <section className="model-studio__grid">
        <article className="model-studio__panel model-studio__panel--controls">
          <label className="model-studio__upload">
            <input type="file" accept="image/*" onChange={handleFileChange} />
            {photoDataUrl ? (
              <div className="model-studio__preview-wrap">
                <img src={photoDataUrl} alt={photoName || 'Uploaded full-body photo'} />
              </div>
            ) : (
              <div className="model-studio__upload-empty">
                <strong>Drop full-body photo</strong>
                <span>PNG or JPG, front-facing recommended</span>
              </div>
            )}
          </label>

          <div className="model-studio__controls">
            <label>
              <span>Model style</span>
              <select
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                disabled={isGenerating}
              >
                {MODEL_PROMPTS.map((preset) => (
                  <option key={preset.label} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Backdrop</span>
              <select
                value={backdrop}
                onChange={(event) => setBackdrop(event.target.value)}
                disabled={isGenerating}
              >
                {BACKDROPS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="button"
            className="model-studio__generate"
            onClick={handleGenerateModel}
            disabled={!photoDataUrl || isGenerating}
          >
            {isGenerating ? 'Generating model...' : 'Generate Model'}
          </button>

          <p className="model-studio__status">{stageLabel}</p>
          {error ? <p className="model-studio__error">{error}</p> : null}
        </article>

        <article className="model-studio__panel model-studio__panel--result" aria-live="polite">
          <div className="model-studio__result-head">
            <h2>Generated Model</h2>
            {generatedModelId ? <span className="model-studio__chip">ID: {generatedModelId}</span> : null}
          </div>

          {isGenerating ? (
            <div className="model-studio__loading" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
          ) : generatedModelUrl ? (
            <div className="model-studio__result-image">
              <img src={generatedModelUrl} alt="Generated virtual try-on model" />
            </div>
          ) : (
            <div className="model-studio__result-empty">
              <p>Your generated model will appear here.</p>
            </div>
          )}

          <div className="model-studio__actions">
            <button type="button" disabled={!generatedModelUrl || isGenerating}>
              Use for Try-On
            </button>
            <button
              type="button"
              className="ghost"
              disabled={!photoDataUrl || isGenerating}
              onClick={handleGenerateModel}
            >
              Regenerate
            </button>
          </div>

          {endpoint ? <p className="model-studio__endpoint">Generated via: {endpoint}</p> : null}
        </article>
      </section>
    </main>
  )
}

export default ModelStudio
