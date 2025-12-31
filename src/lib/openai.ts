import type { AdviceRequestPayload, ProductSuggestion, SkinMetric } from './types'
import { Agent, buildMetricNarrative, createCosmetistAgent } from './agent'

type ChatTurn = {
  role: 'user' | 'assistant'
  content: string
}

let cachedAgent: Agent | null = null
const getAgent = () => {
  if (!cachedAgent) {
    cachedAgent = createCosmetistAgent()
  }
  return cachedAgent
}

export const requestProductAdvice = async (payload: AdviceRequestPayload): Promise<string> => {
  const userBrief = `Skin scan insights\n${buildMetricNarrative(payload.metrics)}\n\nClient-noted concerns: ${
    payload.concerns || 'Not shared'
  }\nPriority focus: ${payload.focusAreas.length ? payload.focusAreas.join(', ') : 'Balance and barrier support'}\nEnvironment: ${payload.environment}\nRoutine intensity preference (1=fast, 5=clinical): ${payload.routineIntensity}`

  const agent = getAgent()
  return agent.respond([
    {
      role: 'user',
      content: `${userBrief}\n\nDeliver: 1) a diagnostic overview, 2) AM ritual (≤4 steps), 3) PM ritual (≤5 steps), 4) spotlight on 3 hero ingredients with over-the-counter product suggestions. Close with gentle reminders.`,
    },
  ])
}

export const continueProductChat = async ({
  metrics,
  summary,
  history,
}: {
  metrics: SkinMetric[]
  summary: string
  history: ChatTurn[]
}): Promise<string> => {
  if (!history.length) {
    throw new Error('Conversation history is empty. Upload a scan to start chatting.')
  }

  const agent = getAgent()
  const context = `Skin summary: ${summary}\nKey metrics:\n${buildMetricNarrative(metrics)}\nRespond as a supportive cosmetist, reference the scan when useful, and keep patch-test reminders.`

  return agent.respond([
    { role: 'user', content: context },
    ...history,
  ])
}

export const searchRetailProducts = async (query: string): Promise<ProductSuggestion[]> => {
  const agent = getAgent()
  const raw = await agent.callTool('serper', { q: query, gl: 'us' })
  return parseSerperResults(raw)
}

const parseSerperResults = (payload: string): ProductSuggestion[] => {
  try {
    const data = JSON.parse(payload) as Record<string, unknown>
    const shopping = Array.isArray(data.shopping_results) ? data.shopping_results : []
    if (shopping.length) {
      return shopping
        .map((item) => normalizeShopping(item as Record<string, unknown>))
        .filter((item): item is ProductSuggestion => Boolean(item))
        .slice(0, 4)
    }

    const organic = Array.isArray(data.organic) ? data.organic : Array.isArray(data.organic_results) ? data.organic_results : []
    return organic
      .map((item) => normalizeOrganic(item as Record<string, unknown>))
      .filter((item): item is ProductSuggestion => Boolean(item))
      .slice(0, 4)
  } catch (error) {
    console.error('Unable to parse Serper payload', error)
    return []
  }
}

const normalizeShopping = (item: Record<string, unknown>): ProductSuggestion | null => {
  const name = typeof item.title === 'string' ? item.title : undefined
  const url = typeof item.link === 'string' ? item.link : typeof item.product_link === 'string' ? item.product_link : undefined
  if (!name || !url) return null
  return {
    name,
    url,
    price: typeof item.price === 'string' ? item.price : undefined,
    retailer: typeof item.source === 'string' ? item.source : typeof item.store === 'string' ? item.store : undefined,
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
