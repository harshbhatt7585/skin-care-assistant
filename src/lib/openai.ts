import OpenAI from 'openai'
import type {
  AdviceRequestPayload,
  FormulaAgentResult,
  ProductRecommendation,
  ProductSearchHit,
  SkinMetric,
} from './types'

let cachedClient: OpenAI | null = null

const getClient = () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY

  if (!apiKey) {
    throw new Error(
      'Missing VITE_OPENAI_API_KEY. Add it to your .env.local before requesting advice.',
    )
  }

  if (!cachedClient) {
    cachedClient = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
  }

  return cachedClient
}

const extractResponseText = (response: { output_text?: string; output?: unknown[] }): string => {
  if (response.output_text && response.output_text.trim().length > 0) {
    return response.output_text.trim()
  }

  const aggregated: string[] = []
  response.output?.forEach((item) => {
    if (typeof item !== 'object' || !item) return
    const candidate = item as { content?: Array<{ type?: string; text?: string }> }
    candidate.content?.forEach((content) => {
      if (content?.type === 'output_text' && content.text) {
        aggregated.push(content.text)
      }
    })
  })

  return aggregated.join('\n').trim()
}

export const requestProductAdvice = async (
  payload: AdviceRequestPayload,
): Promise<string> => {
  const client = getClient()

  const metricNarrative = payload.metrics
    .map((metric) => `${metric.label}: ${metric.value}/100 — ${metric.summary}`)
    .join('\n')

  const focusNarrative = payload.focusAreas.length
    ? payload.focusAreas.join(', ')
    : 'Balance and barrier support'

  const userBrief = `Skin scan insights\n${metricNarrative}\n\nClient-noted concerns: ${
    payload.concerns || 'Not shared'
  }\nPriority focus: ${focusNarrative}\nEnvironment: ${payload.environment}\nRoutine intensity preference (1=fast, 5=clinical): ${
    payload.routineIntensity
  }`

  const response = await client.responses.create({
    model: 'gpt-4o-mini',
    input: [
      {
        role: 'system',
        content:
          'You are a licensed aesthetician and cosmetic chemist. Keep plans actionable, explain what each step does, cite hero ingredients, and remind the user to patch test. Use rich but concise markdown headings.',
      },
      {
        role: 'user',
        content: `${userBrief}\n\nDeliver: 1) a diagnostic overview, 2) AM ritual (≤4 steps), 3) PM ritual (≤5 steps), 4) spotlight on 3 hero ingredients with over-the-counter product suggestions. Close with gentle reminders.`,
      },
    ],
  })

  const textOutput = extractResponseText(response)
  if (textOutput.length > 0) {
    return textOutput
  }

  throw new Error('OpenAI did not return any text output.')
}

const sanitizeHits = (hits: ProductSearchHit[]) =>
  hits.map((hit) => ({
    name: hit.title,
    url: hit.link,
    price: hit.price,
    retailer: hit.source,
    snippet: hit.snippet,
    rating: hit.rating,
    reviews: hit.reviews,
  }))

export const summarizeFormulaHits = async (
  formula: string,
  hits: ProductSearchHit[],
): Promise<FormulaAgentResult> => {
  if (!hits.length) {
    throw new Error('Need at least one product hit to summarize.')
  }

  const client = getClient()
  const condensed = sanitizeHits(hits)
  const jsonShape = `{"summary":"string","recommendations":[{"name":"string","rationale":"string","url":"string","retailer":"string","price":"string"}]}`

  const response = await client.responses.create({
    model: 'gpt-4o-mini',
    input: [
      {
        role: 'system',
        content:
          'You are a formulation scout that compares ingredient briefs to publicly available products. Only recommend widely available, over-the-counter items and always remind users to patch test.',
      },
      {
        role: 'user',
        content: `Formula or ingredient focus:\n${formula}\n\nCandidate products from web search:\n${JSON.stringify(
          condensed,
          null,
          2,
        )}\n\nSelect the closest 3 matches, mention hero ingredients, and explain how each maps to the requested formula. Respond ONLY with JSON that matches this shape: ${jsonShape}.`,
      },
    ],
  })

  const textOutput = extractResponseText(response)
  if (!textOutput) {
    throw new Error('OpenAI returned an empty response for the formula agent.')
  }

  try {
    const parsed = JSON.parse(textOutput) as FormulaAgentResult
    if (!Array.isArray(parsed.recommendations) || !parsed.recommendations.length) {
      throw new Error('Agent response missing recommendations.')
    }
    parsed.recommendations = parsed.recommendations.map((rec) => sanitizeRecommendation(rec))
    return parsed
  } catch (error) {
    console.error('Failed to parse agent response', error)
    throw new Error('Unable to parse AI recommendations. Try again in a moment.')
  }
}

const sanitizeRecommendation = (rec: ProductRecommendation): ProductRecommendation => ({
  name: rec.name.trim(),
  rationale: rec.rationale.trim(),
  url: rec.url.trim(),
  retailer: rec.retailer?.trim(),
  price: rec.price?.trim(),
})

export type { SkinMetric }
