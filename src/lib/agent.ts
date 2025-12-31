import OpenAI from 'openai'
import type { SkinMetric } from './types'

type AgentMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type ToolHandler<TArgs = any> = (args: TArgs) => Promise<string>

type ToolSpec<TArgs = any> = {
  name: string
  description: string
  parameters: Record<string, any>
  handler: ToolHandler<TArgs>
}

type AgentOptions = {
  systemPrompt?: string
  tools?: ToolSpec[]
  model?: string
  maxTurns?: number
}

const createClient = () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('Missing VITE_OPENAI_API_KEY. Add it to your .env.local.')
  }
  return new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
}

const extractResponseText = (response: { output_text?: string; output?: unknown[] }): string => {
  if (response.output_text && response.output_text.trim()) return response.output_text.trim()

  const aggregated: string[] = []
  ;(response.output ?? []).forEach((item) => {
    if (typeof item !== 'object' || !item) return
    const candidate = item as { content?: Array<{ type?: string; text?: string }> }
    candidate.content?.forEach((content) => {
      if (content?.type === 'output_text' && content.text) aggregated.push(content.text)
    })
  })

  return aggregated.join('\n').trim()
}

type ToolCallItem = {
  type: 'tool_call'
  id: string
  name: string
  arguments: string | Record<string, any>
}

const parseToolCalls = (response: { output?: unknown[] }): ToolCallItem[] => {
  const out: ToolCallItem[] = []
  for (const item of response.output ?? []) {
    if (typeof item !== 'object' || !item) continue
    const it = item as any
    if (it.type === 'tool_call' && it.name) {
      out.push({
        type: 'tool_call',
        id: String(it.id ?? crypto.randomUUID()),
        name: String(it.name),
        arguments: it.arguments ?? {},
      })
    }
  }
  return out
}

const safeJsonParse = (value: unknown) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }
  return value
}

export class Agent {
  private client: OpenAI
  private systemPrompt?: string
  private model: string
  private maxTurns: number
  private toolMap: Map<string, ToolSpec>

  constructor(options: AgentOptions = {}) {
    this.client = createClient()
    this.systemPrompt = options.systemPrompt
    this.model = options.model ?? 'gpt-5-mini'
    this.maxTurns = options.maxTurns ?? 6
    this.toolMap = new Map()
    ;(options.tools ?? []).forEach((tool) => this.toolMap.set(tool.name, tool))
  }

  private getToolDefsForModel() {
    return Array.from(this.toolMap.values()).map((tool) => ({
      type: 'function' as const,
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      strict: true,
    }))
  }

  async respond(messages: AgentMessage[], overrideSystemPrompt?: string): Promise<string> {
    const compiled: AgentMessage[] = []
    const prompt = overrideSystemPrompt ?? this.systemPrompt
    if (prompt) compiled.push({ role: 'system', content: prompt })
    compiled.push(...messages)

    let turn = 0
    const input: any[] = compiled.map((message) => ({ role: message.role, content: message.content }))

    while (turn < this.maxTurns) {
      const response = await this.client.responses.create({
        model: this.model,
        input,
        tools: this.getToolDefsForModel(),
      })

      const text = extractResponseText(response)
      const toolCalls = parseToolCalls(response)

      if (text && !toolCalls.length) {
        return text
      }

      if (!toolCalls.length) {
        throw new Error('Model returned no text and no tool calls.')
      }

      for (const call of toolCalls) {
        const tool = this.toolMap.get(call.name)
        if (!tool) {
          input.push({ role: 'assistant', content: `Tool "${call.name}" is not available.` })
          continue
        }

        const args = safeJsonParse(call.arguments)
        let result: string
        try {
          result = await tool.handler(args)
        } catch (error) {
          result = `Tool "${call.name}" failed: ${error instanceof Error ? error.message : String(error)}`
        }

        input.push({
          type: 'tool_result',
          tool_call_id: call.id,
          content: result,
        })
      }

      turn += 1
    }

    throw new Error(`Max tool turns (${this.maxTurns}) exceeded without a final answer.`)
  }

  async callTool<TArgs = any>(name: string, args: TArgs): Promise<string> {
    const tool = this.toolMap.get(name)
    if (!tool) {
      throw new Error(`Tool "${name}" is not available on this agent.`)
    }
    return tool.handler(args)
  }
}

const serperTool: ToolSpec<{ q: string; gl?: string }> = {
  name: 'serper',
  description: 'Search the web for products and return structured results as JSON.',
  parameters: {
    type: 'object',
    properties: {
      q: { type: 'string', description: 'Search query' },
      gl: { type: 'string', description: 'Country code (e.g., us, in)' },
    },
    required: ['q', 'gl'],
    additionalProperties: false,
  },
  handler: async ({ q, gl = 'us' }) => {
    const apiKey = import.meta.env.VITE_SERPER_API_KEY
    if (!apiKey) throw new Error('Missing VITE_SERPER_API_KEY for serper tool call.')

    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({ q, gl }),
    })

    if (!response.ok) throw new Error(`Serper search failed (${response.status}).`)

    const payload = (await response.json()) as any
    const slim = {
      organic: (payload.organic ?? []).slice(0, 5),
      shopping: (payload.shopping ?? []).slice(0, 5),
      knowledgeGraph: payload.knowledgeGraph ?? null,
    }
    return JSON.stringify(slim, null, 2)
  },
}

export const createCosmetistAgent = () =>
  new Agent({
    model: 'gpt-5-mini',
    maxTurns: 5,
    systemPrompt: [
      'You are a licensed aesthetician and cosmetic chemist.',
      'Keep plans actionable, explain what each step does, cite hero ingredients, and remind the user to patch test.',
      'Use rich but concise markdown headings.',
      'If asked to recommend products, use the serper tool to search the internet for relevant products.',
    ].join(' '),
    tools: [serperTool],
  })

export const buildMetricNarrative = (metrics: SkinMetric[]) =>
  metrics.map((metric) => `${metric.label}: ${metric.value}/100 — ${metric.summary}`).join('\n')
