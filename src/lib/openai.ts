import type { AdviceRequestPayload, SkinMetric } from './types'
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
      content: `${userBrief}\n\nDeliver: 1) a diagnostic overview, 2) AM ritual (≤4 steps), 3) PM ritual (≤5 steps), 4) spotlight on 3 hero ingredients. This is the first response, so keep it conversational and do not call any external tools yet—just outline the routine and mention you can fetch shopping links if the user asks next.`,
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
  const context = `Skin summary: ${summary}\nKey metrics:\n${buildMetricNarrative(metrics)}\nRespond as a supportive cosmetist, reference the scan when useful, and keep patch-test reminders. Only call the serper tool when the user explicitly asks for product links or where to buy items.`

  return agent.respond([
    { role: 'user', content: context },
    ...history,
  ])
}
