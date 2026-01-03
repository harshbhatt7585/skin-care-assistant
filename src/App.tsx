import { useRef, useState } from 'react'
import { marked } from 'marked'
import './App.css'
import { generatePlanWithQuery, searchRetailProducts } from './lib/openai'
import type { ProductSuggestion, SkinMetric } from './lib/types'

type AnalysisResult = {
  metrics: SkinMetric[]
  summary: string
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [analysisSummary, setAnalysisSummary] = useState('')
  const [planMarkdown, setPlanMarkdown] = useState('')
  const [products, setProducts] = useState<ProductSuggestion[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [status, setStatus] = useState('Upload a clear photo to begin.')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setLoading] = useState(false)

  const reset = () => {
    setPhoto(null)
    setAnalysisSummary('')
    setPlanMarkdown('')
    setProducts([])
    setSearchQuery('')
    setStatus('Upload a clear photo to begin.')
    setError(null)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setError('Unable to read that file. Try another image.')
        return
      }

      const dataUrl = reader.result
      const image = new Image()
      image.onload = async () => {
        const canvas = canvasRef.current
        const context = canvas?.getContext('2d')
        if (!canvas || !context) {
          setError('Canvas not available for analysis.')
          return
        }
        canvas.width = image.width
        canvas.height = image.height
        context.drawImage(image, 0, 0)
        const imageData = context.getImageData(0, 0, image.width, image.height)
        const { metrics: newMetrics, summary } = analyzeSkinSnapshot(imageData)
        setPhoto(dataUrl)
        setAnalysisSummary(summary)
        await runAgent(newMetrics)
      }
      image.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  const runAgent = async (scanMetrics: SkinMetric[]) => {
    try {
      setLoading(true)
      setStatus('Reading your scan...')
      const { planMarkdown: plan, searchQuery: query } = await generatePlanWithQuery({
        metrics: scanMetrics,
        concerns: '',
        focusAreas: [],
        environment: 'temperate',
        routineIntensity: 3,
      })
      setPlanMarkdown(plan)
      setSearchQuery(query)
      setStatus('Searching for products...')
      const suggestions = await searchRetailProducts(query)
      setProducts(suggestions)
      setStatus('Done. Adjust anything you like and upload again to iterate.')
    } catch (err) {
      console.error(err)
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong while generating your plan. Try again.',
      )
      setStatus('Unable to finish. Fix the issue and retry.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <div className="hero__text">
          <p className="hero__eyebrow">Skin ritual copilot</p>
          <h1>Drop a bare-face photo. Get a ritual plus real products.</h1>
          <p>{status}</p>
        </div>
        {photo && (
          <button className="hero__reset" onClick={reset}>
            Start over
          </button>
        )}
      </header>

      <main className="surface">
        {!photo ? (
          <section className="panel upload-panel">
            <h2>Upload a photo</h2>
            <p className="panel__body">Natural light, no heavy makeup. Everything stays on-device.</p>
            <label className="dropzone">
              <span>Choose photo</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} />
            </label>
            {error && <p className="text-error">{error}</p>}
          </section>
        ) : (
          <section className="results-grid">
            <div className="panel plan-card">
              <h2>Your AI ritual</h2>
              <p className="plan-summary">{analysisSummary}</p>
              {isLoading && <p className="typing">Working...</p>}
              {planMarkdown && (
                <div
                  className="plan-markdown"
                  dangerouslySetInnerHTML={{ __html: marked.parse(planMarkdown, { gfm: true }) }}
                />
              )}
            </div>

            <div className="panel products-card">
              <h2>Shopable picks</h2>
              {searchQuery && <p className="search-query">Search query: {searchQuery}</p>}
              {products.length === 0 && !isLoading && <p>No live listings yet. Ask again after a moment.</p>}
              <div className="product-list">
                {products.map((product) => (
                  <article key={product.url} className="product-card">
                    <div>
                      <a href={product.url} target="_blank" rel="noreferrer">
                        {product.name}
                      </a>
                      {product.retailer && <span>{product.retailer}</span>}
                    </div>
                    {product.price && <p className="price">{product.price}</p>}
                    {product.snippet && <p className="snippet">{product.snippet}</p>}
                  </article>
                ))}
              </div>
              {error && <p className="text-error">{error}</p>}
            </div>
          </section>
        )}
      </main>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}

const analyzeSkinSnapshot = (image: ImageData): AnalysisResult => {
  const { data, width, height } = image
  const pixelCount = width * height
  let redSum = 0
  let greenSum = 0
  let blueSum = 0
  let brightnessSum = 0
  let brightnessSqSum = 0
  let chromaSum = 0
  let textureDelta = 0

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    redSum += r
    greenSum += g
    blueSum += b

    const brightness = (r + g + b) / 3 / 255
    brightnessSum += brightness
    brightnessSqSum += brightness * brightness

    const maxChannel = Math.max(r, g, b)
    const minChannel = Math.min(r, g, b)
    chromaSum += (maxChannel - minChannel) / 255

    const neutral = (r + g + b) / 3
    textureDelta += Math.abs(r - neutral) + Math.abs(g - neutral) + Math.abs(b - neutral)
  }

  const avgBrightness = brightnessSum / pixelCount
  const brightnessVariance = brightnessSqSum / pixelCount - avgBrightness ** 2
  const contrast = Math.min(1, Math.sqrt(Math.max(0, brightnessVariance)) * 1.6)
  const avgChroma = chromaSum / pixelCount
  const textureScore = Math.min(1, textureDelta / (pixelCount * 255 * 1.5))
  const smoothness = clamp01(1 - textureScore)
  const rednessTilt = clamp01((redSum / pixelCount / 255) - (greenSum / pixelCount / 255 + blueSum / pixelCount / 255) / 2)

  const hydrationScore = clamp100((1 - avgBrightness) * 115 + smoothness * 20)
  const oilScore = clamp100(avgBrightness * 120 + avgChroma * 25)
  const sensitivityScore = clamp100(rednessTilt * 160 + contrast * 25)
  const toneScore = clamp100((1 - contrast) * 120 - rednessTilt * 30)
  const barrierScore = clamp100(smoothness * 130 - contrast * 20)

  const metrics: SkinMetric[] = [
    {
      key: 'hydration',
      label: 'Hydration',
      value: Math.round(hydrationScore),
      summary:
        hydrationScore > 65
          ? 'Well cushioned — keep humectants topped up.'
          : 'Looks thirsty; layer humectants and seal with emollients.',
    },
    {
      key: 'oil',
      label: 'Oil balance',
      value: Math.round(oilScore),
      summary:
        oilScore > 60
          ? 'Sebum is lively; gel textures keep things breathable.'
          : 'Oil flow looks calm. Cream textures are welcome.',
    },
    {
      key: 'sensitivity',
      label: 'Sensitivity',
      value: Math.round(sensitivityScore),
      summary:
        sensitivityScore > 55
          ? 'Barrier is reactive. Buffer actives and add soothing botanicals.'
          : 'Barrier looks calm; introduce actives gradually.',
    },
    {
      key: 'tone',
      label: 'Tone evenness',
      value: Math.round(toneScore),
      summary:
        toneScore > 60
          ? 'Tone reads even with gentle warmth.'
          : 'Some uneven tone — brighten with antioxidants and SPF.',
    },
    {
      key: 'barrier',
      label: 'Barrier strength',
      value: Math.round(barrierScore),
      summary:
        barrierScore > 65
          ? 'Barrier looks resilient; maintain with ceramides + peptides.'
          : 'Could use reinforcement — focus on lipids and barrier balms.',
    },
  ]

  const summary = buildNarrative({
    hydrationScore,
    oilScore,
    sensitivityScore,
    toneScore,
    barrierScore,
  })

  return { metrics, summary }
}

const buildNarrative = ({
  hydrationScore,
  oilScore,
  sensitivityScore,
  toneScore,
  barrierScore,
}: {
  hydrationScore: number
  oilScore: number
  sensitivityScore: number
  toneScore: number
  barrierScore: number
}): string => {
  const hydrationNote = hydrationScore > 70 ? 'plump' : hydrationScore > 50 ? 'balanced' : 'dehydrated'
  const oilNote = oilScore > 65 ? 'luminous' : oilScore < 40 ? 'velvety-matte' : 'even'
  const sensitivityNote = sensitivityScore > 60 ? 'easily triggered' : 'calm'
  const toneNote = toneScore > 60 ? 'even' : 'slightly varied'
  const barrierNote = barrierScore > 60 ? 'supported' : 'needing more reinforcement'

  return `Complexion looks ${hydrationNote} and ${oilNote} with ${toneNote} tone. Barrier is ${barrierNote} and ${sensitivityNote}.`
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const clamp100 = (value: number) => Math.min(100, Math.max(0, value))

export default App
