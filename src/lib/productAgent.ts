import { summarizeFormulaHits } from './openai'
import type { FormulaAgentResult, ProductSearchHit } from './types'

const SERP_ENDPOINT = 'https://serpapi.com/search.json'

const normalizeShoppingResult = (item: Record<string, unknown>): ProductSearchHit | null => {
  const title = typeof item.title === 'string' ? item.title : typeof item.name === 'string' ? item.name : null
  const link =
    typeof item.product_link === 'string'
      ? item.product_link
      : typeof item.link === 'string'
        ? item.link
        : null
  if (!title || !link) return null

  return {
    title,
    link,
    price: typeof item.price === 'string' ? item.price : undefined,
    snippet: typeof item.snippet === 'string' ? item.snippet : undefined,
    source: typeof item.source === 'string' ? item.source : typeof item.store === 'string' ? item.store : undefined,
    rating: typeof item.rating === 'number' ? item.rating : undefined,
    reviews: typeof item.reviews === 'number' ? item.reviews : undefined,
    delivery: typeof item.shipping === 'string' ? item.shipping : undefined,
    image: typeof item.thumbnail === 'string' ? item.thumbnail : undefined,
  }
}

const normalizeOrganicResult = (item: Record<string, unknown>): ProductSearchHit | null => {
  const title = typeof item.title === 'string' ? item.title : null
  const link = typeof item.link === 'string' ? item.link : null
  if (!title || !link) return null

  return {
    title,
    link,
    snippet: typeof item.snippet === 'string' ? item.snippet : undefined,
    source: typeof item.source === 'string' ? item.source : undefined,
  }
}

const fetchProductHits = async (formula: string): Promise<ProductSearchHit[]> => {
  const serpKey = import.meta.env.VITE_SERP_API_KEY
  if (!serpKey) {
    throw new Error('Add VITE_SERP_API_KEY to enable the formula agent web search.')
  }

  const url = new URL(SERP_ENDPOINT)
  url.searchParams.set('engine', 'google_shopping')
  url.searchParams.set('q', `${formula} skincare product`)
  url.searchParams.set('gl', 'us')
  url.searchParams.set('hl', 'en')
  url.searchParams.set('api_key', serpKey)

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error('Product search failed. Check your SerpAPI key or quota.')
  }

  const payload = (await response.json()) as Record<string, unknown>
  const shopping = Array.isArray(payload.shopping_results) ? payload.shopping_results : []
  const shoppingHits = shopping
    .map((item) => normalizeShoppingResult(item as Record<string, unknown>))
    .filter((hit): hit is ProductSearchHit => Boolean(hit))
    .slice(0, 8)

  if (shoppingHits.length) {
    return shoppingHits
  }

  const organic = Array.isArray(payload.organic_results) ? payload.organic_results : []
  const organicHits = organic
    .map((item) => normalizeOrganicResult(item as Record<string, unknown>))
    .filter((hit): hit is ProductSearchHit => Boolean(hit))
    .slice(0, 6)

  return organicHits
}

export const runFormulaAgent = async (formula: string): Promise<FormulaAgentResult> => {
  const brief = formula.trim()
  if (!brief) {
    throw new Error('Describe the hero ingredients or formula you want to match first.')
  }

  const hits = await fetchProductHits(brief)
  if (!hits.length) {
    throw new Error('Search API did not return any relevant products. Refine the formula and retry.')
  }

  return summarizeFormulaHits(brief, hits)
}
