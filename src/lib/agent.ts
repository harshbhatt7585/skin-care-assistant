import OpenAI from 'openai'
import type {
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
  ChatCompletionTool,
} from 'openai/resources/chat/completions'

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
  systemPrompt: string
  tools?: ToolSpec[]
  model?: string
  maxTurns?: number
  photoDataUrl?: string
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
  private gl: string
  private systemPrompt: string
  private model: string
  private maxTurns: number
  private photoDataUrl?: string
  private toolMap: Map<string, ToolSpec>

  constructor(options: AgentOptions) {
    this.client = createClient()
    this.systemPrompt = options.systemPrompt
    this.gl = options.gl ?? 'us'
    this.model = options.model ?? 'gpt-5-mini'
    this.maxTurns = options.maxTurns ?? 6
    this.photoDataUrl = options.photoDataUrl
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
    const compiled: ChatCompletionMessageParam[] = [{ role: 'system', content: this.systemPrompt }]

    if (this.photoDataUrl) {
      compiled.push({
        role: 'user',
        content: [
          { type: 'text', text: 'Here is the bare-face scan image to analyze.' },
          { type: 'image_url', image_url: { url: this.photoDataUrl } },
        ],
      } as ChatCompletionMessageParam)
    }
    messages.forEach((message) =>
      compiled.push({ role: message.role, content: message.content } as ChatCompletionMessageParam),
    )

    for (let turn = 0; turn < this.maxTurns; turn++) {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: compiled,
        tools: this.getToolDefs(),
        tool_choice: this.toolMap.size ? 'auto' : undefined,
      })

      const choice = completion.choices[0]
      const message = choice.message
      const toolCalls = ((message as any).tool_calls ?? []) as Array<ChatCompletionMessageToolCall>
      

      if (toolCalls.length) {
        compiled.push({
          role: 'assistant',
          content: message.content ?? '',
          tool_calls: toolCalls.map((call) => call as ChatCompletionMessageToolCall),
        })

        for (const call of toolCalls) {
          const funcCall = (call as any).function as { name: string; arguments: string } | undefined
          if (!funcCall) continue

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
  description: 'Fetch shopping search results for skincare recommendations.',
  parameters: {
    type: 'object',
    properties: {
      q: { type: 'string', description: 'Search query describing the desired products' },
    },
    required: ['q'],
    additionalProperties: false,
  },
  handler: async ({ q }) => {
    const apiKey = import.meta.env.VITE_SERPER_API_KEY
    if (!apiKey) {
      throw new Error('Missing VITE_SERPER_API_KEY for serper tool call.')
    }

    const response = await fetch('https://google.serper.dev/shopping', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({ q, gl: this.gl, num: 20 }),
    })

    if (!response.ok) {
      throw new Error(`Serper search failed (${response.status}).`)
    }

    const payload = (await response.json()) as Record<string, unknown>
    const shoppingPayload = {
      knowledgeGraph: payload.knowledgeGraph,
      organic: payload.organic,
    }

    return JSON.stringify(shoppingPayload)
  },
}

export const createCosmetistAgent = (photoDataUrl: string, gl: string) =>
  new Agent({
    model: 'gpt-5-mini',
    gl: gl,
    maxTurns: 6,
    photoDataUrl,
    systemPrompt: [
      'You are a licensed aesthetician and cosmetic chemist.',
      'You can see the provided bare-face scan image via the companion user message. Never claim you cannot view it; describe what you observe and avoid asking for re-uploads.',
      'Chat naturally using markdown. When the user asks for products or shopping links, call the serper tool with a focused query and return your reply with markdown bullets that include links and thumbnails.',
    ].join(' '),
    tools: [serperTool],
  })
