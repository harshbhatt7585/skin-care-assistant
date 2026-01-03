import type { AdviceRequestPayload, ProductSuggestion, SkinMetric } from './types'
import { createCosmetistAgent } from './agent'

const buildMetricNarrative = (metrics: SkinMetric[]) =>
  metrics.map((metric) => `${metric.label}: ${metric.value}/100 — ${metric.summary}`).join('\n')

export const runRitualAgent = async (
  payload: AdviceRequestPayload,
  summary: string,
): Promise<{ planMarkdown: string; products: ProductSuggestion[] }> => {
  const agent = createCosmetistAgent()
  const prompt = `Skin summary: ${summary}\n\nDetailed metrics:\n${buildMetricNarrative(payload.metrics)}\n\nReturn JSON with:\n{\n  "plan_markdown": string,\n  "products": [\n    {"name": string, "url": string, "price"?: string, "retailer"?: string, "snippet"?: string}\n  ]\n}\nRemember to call the serper tool before producing the final JSON so the products list references real listings.`

  const response = await agent.respond([
    { role: 'user', content: prompt },
  ])

  try {
    const parsed = JSON.parse(response) as {
      plan_markdown: string
      products?: ProductSuggestion[]
    }
    return {
      planMarkdown: parsed.plan_markdown?.trim() ?? 'Plan unavailable.',
      products: parsed.products ?? [],
    }
  } catch (error) {
    console.error('Failed to parse agent response', error)
    throw new Error('Agent returned an invalid response. Try again in a moment.')
  }
}
