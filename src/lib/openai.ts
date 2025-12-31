import OpenAI from 'openai'
import type { AdviceRequestPayload, SkinMetric } from './types'

type ChatTurn = {
  role: 'user' | 'assistant'
  content: string
}

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

const buildMetricNarrative = (metrics: SkinMetric[]) =>
  metrics.map((metric) => `${metric.label}: ${metric.value}/100 — ${metric.summary}`).join('\n')

export const requestProductAdvice = async (payload: AdviceRequestPayload): Promise<string> => {
  const client = getClient()

  const userBrief = `Skin scan insights\n${buildMetricNarrative(payload.metrics)}\n\nClient-noted concerns: ${
    payload.concerns || 'Not shared'
  }\nPriority focus: ${payload.focusAreas.length ? payload.focusAreas.join(', ') : 'Balance and barrier support'}\nEnvironment: ${payload.environment}\nRoutine intensity preference (1=fast, 5=clinical): ${payload.routineIntensity}`

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

  const client = getClient()
  const context = `Skin summary: ${summary}\nKey metrics:\n${buildMetricNarrative(metrics)}\nRespond as a supportive cosmetist, reference the scan when useful, and keep patch-test reminders.`

  const response = await client.responses.create({
    model: 'gpt-4o-mini',
    input: [
      { role: 'system', content: 'You are a licensed skin therapist chatting in a warm, concise tone.' },
      { role: 'user', content: context },
      ...history.map((turn) => ({ role: turn.role, content: turn.content })),
    ],
  })

  const textOutput = extractResponseText(response)
  if (textOutput.length > 0) {
    return textOutput
  }

  throw new Error('OpenAI did not return any text output for this chat turn.')
}

export type { SkinMetric }
