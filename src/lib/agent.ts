import OpenAI from 'openai'
import type { SkinMetric } from './types'

type AgentMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type ToolHandler = (input: string) => Promise<string>

type AgentOptions = {
  systemPrompt?: string
  tools?: Record<string, ToolHandler>
}

const createClient = () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('Missing VITE_OPENAI_API_KEY. Add it to your .env.local before requesting advice.')
  }
  return new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
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

const serperTool: ToolHandler = async (input: string) => {
  const apiKey = import.meta.env.VITE_SERPER_API_KEY
  if (!apiKey) {
    throw new Error('Missing VITE_SERPER_API_KEY for serper tool call.')
  }

  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify({ q: input, gl: 'us' }),
  })

  if (!response.ok) {
    throw new Error('Serper search failed. Check your API key or quota.')
  }

  const payload = (await response.json()) as Record<string, unknown>
  return JSON.stringify(payload, null, 2)
}

export class Agent {
  private client: OpenAI
  private systemPrompt?: string
  private tools: Record<string, ToolHandler>

  constructor(options: AgentOptions = {}) {
    this.client = createClient()
    this.systemPrompt = options.systemPrompt
    this.tools = options.tools ?? {}
  }

  async respond(messages: AgentMessage[], overrideSystemPrompt?: string): Promise<string> {
    const compiled: AgentMessage[] = []
    const prompt = overrideSystemPrompt ?? this.systemPrompt
    if (prompt) {
      compiled.push({ role: 'system', content: prompt })
    }
    compiled.push(...messages)

    const response = await this.client.responses.create({
      model: 'gpt-5-mini',
      input: compiled,
    })

    const text = extractResponseText(response)
    if (!text) {
      throw new Error('OpenAI returned an empty response.')
    }
    return text
  }

  async toolCall(input: string, tool: string): Promise<string> {
    const handler = this.tools[tool]
    if (!handler) {
      throw new Error(`Tool "${tool}" is not registered on this agent.`)
    }
    return handler(input)
  }
}

export const createCosmetistAgent = () =>
  new Agent({
    systemPrompt:
      'You are a licensed aesthetician and cosmetic chemist. Keep plans actionable, explain what each step does, cite hero ingredients, and remind the user to patch test. Use rich but concise markdown headings.',
    tools: { serper: serperTool },
  })

export const buildMetricNarrative = (metrics: SkinMetric[]) =>
  metrics.map((metric) => `${metric.label}: ${metric.value}/100 — ${metric.summary}`).join('\n')
