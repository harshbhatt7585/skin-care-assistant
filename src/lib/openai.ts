import OpenAI from 'openai'

export type SkinMetric = {
  key: string
  label: string
  value: number
  summary: string
}

export type AdviceRequestPayload = {
  metrics: SkinMetric[]
  concerns: string
  focusAreas: string[]
  environment: string
  routineIntensity: number
}

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

  if (response.output_text) {
    return response.output_text.trim()
  }

  type OutputWithContent = {
    content: Array<{ type: string; text?: string }>
  }

  const fallback = response.output
    ?.map((item) => {
      if ('content' in item) {
        return (item as OutputWithContent).content
          .map((content) => (content.type === 'output_text' ? content.text ?? '' : ''))
          .join('\n')
      }
      return ''
    })
    .join('\n')
    .trim()

  if (fallback && fallback.length > 0) {
    return fallback
  }

  throw new Error('OpenAI did not return any text output.')
}
