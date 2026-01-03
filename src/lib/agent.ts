import OpenAI from 'openai'
import type { ChatCompletion, ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions'

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
    this.model = options.model ?? 'gpt-4o-mini'
    this.maxTurns = options.maxTurns ?? 5
    this.toolMap = new Map()
    ;(options.tools ?? []).forEach((tool) => this.toolMap.set(tool.name, tool))
  }

  private getToolDefs(): ChatCompletionTool[] | undefined {
    if (!this.toolMap.size) return undefined
    return Array.from(this.toolMap.values()).map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }))
  }

  async respond(messages: AgentMessage[]): Promise<string> {
    const compiled: ChatCompletionMessageParam[] = []
    if (this.systemPrompt) {
      compiled.push({ role: 'system', content: this.systemPrompt } as ChatCompletionMessageParam)
    }
    messages.forEach((message) =>
      compiled.push({ role: message.role, content: message.content } as ChatCompletionMessageParam),
    )

    for (let turn = 0; turn < this.maxTurns; turn++) {
      const completion = (await this.client.chat.completions.create({
        model: this.model,
        messages: compiled,
        tools: this.getToolDefs(),
        tool_choice: this.toolMap.size ? 'auto' : undefined,
      })) as ChatCompletion

      const choice = completion.choices[0]
      const message = choice.message
      const toolCalls = ((message as any).tool_calls ?? []) as Array<{
        id: string
        function?: { name: string; arguments: string }
      }>

      if (toolCalls.length) {
        compiled.push({
          role: 'assistant',
          content: (message.content ?? '') as string,
          tool_calls: toolCalls.map((call) => ({
            id: call.id,
            type: 'function',
            function: call.function!,
          })),
        } as ChatCompletionMessageParam)

        for (const call of toolCalls) {
          const funcCall = call.function
          if (!funcCall) {
            continue
          }

          const tool = this.toolMap.get(funcCall.name)
          if (!tool) {
            compiled.push({
              role: 'tool',
              tool_call_id: call.id,
              content: `Tool "${funcCall.name}" is not available.`,
            } as ChatCompletionMessageParam)
            continue
          }

          let result: string
          try {
            result = await tool.handler(safeJsonParse(funcCall.arguments))
          } catch (error) {
            result = `Tool "${funcCall.name}" failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          }

          compiled.push({
            role: 'tool',
            tool_call_id: call.id,
            content: result,
          } as ChatCompletionMessageParam)
        }
        continue
      }

      if (message.content) {
        return message.content
      }
    }

    throw new Error('Agent exceeded max turns without producing a response.')
  }
}

const serperTool: ToolSpec<{ q: string; gl?: string }> = {
  name: 'serper',
  description: 'Search Google Shopping for skincare products matching the current plan.',
  parameters: {
    type: 'object',
    properties: {
      q: { type: 'string', description: 'Search query describing the desired products' },
      gl: { type: 'string', description: 'Country code (e.g., us, in)' },
    },
    required: ['q'],
    additionalProperties: false,
  },
  handler: async ({ q, gl = 'us' }) => {
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
      body: JSON.stringify({ q, gl }),
    })

    if (!response.ok) {
      throw new Error(`Serper search failed (${response.status}).`)
    }

    const payload = (await response.json()) as Record<string, unknown>
    const shoppingRaw = payload.shopping_results ?? payload.shopping
    const organicRaw = payload.organic_results ?? payload.organic
    const slim = {
      shopping: Array.isArray(shoppingRaw) ? shoppingRaw.slice(0, 6) : [],
      organic: Array.isArray(organicRaw) ? organicRaw.slice(0, 4) : [],
    }
    return JSON.stringify(slim)
  },
}

export const createCosmetistAgent = () =>
  new Agent({
    model: 'gpt-4o-mini',
    maxTurns: 6,
    systemPrompt: [
      'You are a licensed aesthetician and cosmetic chemist.',
      'Step 1: analyze the scan summary and craft markdown with overview, AM/PM rituals, and reminders.',
      'Step 2: when ready, call the serper tool with a targeted query to find 3-4 over-the-counter products matching the plan.',
      'Step 3: parse the tool response and return a JSON object with plan_markdown plus a products array (name, url, price?, retailer?, snippet?).',
      'Respond with JSON only in your final message.',
    ].join(' '),
    tools: [serperTool],
  })
