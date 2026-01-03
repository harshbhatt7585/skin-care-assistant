import OpenAI from 'openai'
import type { AdviceRequestPayload, ProductSuggestion, SkinMetric } from './types'

let cachedClient: OpenAI | null = null

const getClient = () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('Missing VITE_OPENAI_API_KEY. Add it to your .env.local before requesting advice.')
  }
  if (!cachedClient) {
    cachedClient = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
  }
  return cachedClient
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

export const generatePlanWithQuery = async (
  payload: AdviceRequestPayload,
): Promise<{ planMarkdown: string; searchQuery: string }> => {
  const client = getClient()
  const planSchema = {
    type: 'object',
    properties: {
      plan_markdown: { type: 'string' },
      search_query: { type: 'string' },
    },
    required: ['plan_markdown', 'search_query'],
    additionalProperties: false,
  } as const

  const instructions = `Skin scan insights\n${buildMetricNarrative(payload.metrics)}\n\nClient-noted concerns: ${
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
          'You are a licensed aesthetician and cosmetic chemist. Provide confident, friendly markdown routines and include reminders to patch test.',
      },
      {
        role: 'user',
        content: `${instructions}\n\nReturn JSON with: plan_markdown (the AM/PM plan written in markdown) and search_query (a concise search phrase I can send to a shopping API to locate suitable products).`,
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'skin_plan_schema',
        schema: planSchema,
        strict: true,
      },
    },
  } as any)

  const text = extractResponseText(response)
  if (!text) {
    throw new Error('OpenAI did not return a plan. Try again in a moment.')
  }

  const parsed = JSON.parse(text) as { plan_markdown: string; search_query: string }
  return { planMarkdown: parsed.plan_markdown.trim(), searchQuery: parsed.search_query.trim() }
}

export const searchRetailProducts = async (query: string): Promise<ProductSuggestion[]> => {
  const apiKey = import.meta.env.VITE_SERPER_API_KEY
  if (!apiKey) {
    throw new Error('Missing VITE_SERPER_API_KEY for product lookup.')
  }

  const response = await fetch('https://google.serper.dev/search', {
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
  const shopping = Array.isArray(payload.shopping_results) ? payload.shopping_results : []
  const suggestions = shopping
    .map((item) => normalizeShopping(item as Record<string, unknown>))
    .filter((item): item is ProductSuggestion => Boolean(item))
    .slice(0, 4)

  if (suggestions.length) {
    return suggestions
  }

  const organic = Array.isArray(payload.organic_results) ? payload.organic_results : []
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
