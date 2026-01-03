import OpenAI from 'openai'
import type { AdviceRequestPayload, ProductSuggestion, SkinMetric } from './types'

const getClient = () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('Missing VITE_OPENAI_API_KEY. Add it to your .env.local before requesting advice.')
  }
  return new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
}

const extractResponseText = (response: { output_text?: string; output?: unknown[] }) => {
  if (response.output_text && response.output_text.trim()) {
    return response.output_text.trim()
  }
  const parts: string[] = []
  response.output?.forEach((item) => {
    if (typeof item !== 'object' || !item) return
    const candidate = item as { content?: Array<{ type?: string; text?: string }> }
    candidate.content?.forEach((content) => {
      if (content?.type === 'output_text' && content.text) {
        parts.push(content.text)
      }
    })
  })
  return parts.join('\n').trim()
}

const buildMetricNarrative = (metrics: SkinMetric[]) =>
  metrics.map((metric) => `${metric.label}: ${metric.value}/100 — ${metric.summary}`).join('\n')

export const generatePlanMarkdown = async (payload: AdviceRequestPayload): Promise<string> => {
  const client = getClient()
  const prompt = `Skin scan insights\n${buildMetricNarrative(payload.metrics)}\n\nClient-noted concerns: ${
    payload.concerns || 'Not shared'
  }\nFocus areas: ${payload.focusAreas.length ? payload.focusAreas.join(', ') : 'Balance and barrier support'}\nEnvironment: ${payload.environment}\nRoutine intensity preference (1=fast, 5=clinical): ${
    payload.routineIntensity
  }`

  const response = await client.responses.create({
    model: 'gpt-4o-mini',
    input: [
      {
        role: 'system',
        content:
          'You are a licensed aesthetician. Provide a concise markdown analysis with AM/PM routines and patch-test reminders.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const text = extractResponseText(response)
  if (!text) {
    throw new Error('OpenAI did not return a plan. Try again in a moment.')
  }
  return text
}

export const generateProductQuery = async (planMarkdown: string): Promise<string> => {
  const client = getClient()
  const response = await client.responses.create({
    model: 'gpt-4o-mini',
    input: [
      {
        role: 'system',
        content:
          'You are a shopping assistant. Given a markdown ritual, produce a single concise search query to find over-the-counter products that match the recommended ingredients and concerns. Respond with the query only.',
      },
      {
        role: 'user',
        content: planMarkdown,
      },
    ],
  })

  const text = extractResponseText(response)
  if (!text) {
    throw new Error('OpenAI did not return a search query. Try again in a moment.')
  }
  return text.trim()
}

export const searchRetailProducts = async (query: string): Promise<ProductSuggestion[]> => {
  const apiKey = import.meta.env.VITE_SERPER_API_KEY
  if (!apiKey) {
    throw new Error('Missing VITE_SERPER_API_KEY for product lookup.')
  }

  const response = await fetch('https://google.serper.dev/shopping', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify({ q: query, gl: 'us' }),
  })

  if (!response.ok) {
    throw new Error('Product search failed. Check your Serper API key or quota.')
  }

  const payload = (await response.json()) as Record<string, unknown>
  console.log('payload', payload)
  const shopping = Array.isArray(payload.shopping_results)
    ? payload.shopping_results
    : Array.isArray(payload.shopping)
      ? payload.shopping
      : []
  const suggestions = shopping
    .map((item) => normalizeShopping(item as Record<string, unknown>))
    .filter((item): item is ProductSuggestion => Boolean(item))
    .slice(0, 4)

  if (suggestions.length) {
    return suggestions
  }

  const organic = Array.isArray(payload.organic_results)
    ? payload.organic_results
    : Array.isArray(payload.organic)
      ? payload.organic
      : []
  return organic
    .map((item) => normalizeOrganic(item as Record<string, unknown>))
    .filter((item): item is ProductSuggestion => Boolean(item))
    .slice(0, 4)
}

const normalizeShopping = (item: Record<string, unknown>): ProductSuggestion | null => {
  const name = typeof item.title === 'string' ? item.title : undefined
  const url = typeof item.link === 'string' ? item.link : undefined
  if (!name || !url) return null
  return {
    name,
    url,
    price: typeof item.price === 'string' ? item.price : undefined,
    retailer: typeof item.source === 'string' ? item.source : undefined,
    snippet: typeof item.snippet === 'string' ? item.snippet : undefined,
  }
}

const normalizeOrganic = (item: Record<string, unknown>): ProductSuggestion | null => {
  const name = typeof item.title === 'string' ? item.title : undefined
  const url = typeof item.link === 'string' ? item.link : undefined
  if (!name || !url) return null
  return {
    name,
    url,
    snippet: typeof item.snippet === 'string' ? item.snippet : undefined,
    retailer: typeof item.source === 'string' ? item.source : undefined,
  }
}
