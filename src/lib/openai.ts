import type { AdviceRequestPayload, SkinMetric } from './types'
import { createCosmetistAgent } from './agent'

type ConversationTurn = {
  role: 'user' | 'assistant'
  content: string
}

const buildMetricNarrative = (metrics: SkinMetric[]) =>
  metrics.map((metric) => `${metric.label}: ${metric.value}/100 — ${metric.summary}`).join('\n')

export const runChatTurn = async ({
  payload,
  summary,
  history,
}: {
  payload: AdviceRequestPayload
  summary: string
  history: ConversationTurn[]
}): Promise<string> => {
  const context = `Skin summary: ${summary}\nDetailed metrics:\n${buildMetricNarrative(payload.metrics)}`
  const agent = createCosmetistAgent(context)
  const conversation = history.length
    ? history
    : [
        {
          role: 'user' as const,
          content:
            'Please analyze my scan and outline AM/PM rituals. Ask if I want shopping links before calling any tools.',
        },
      ]
  return agent.respond(conversation)
}
