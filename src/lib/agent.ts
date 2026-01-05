import OpenAI from 'openai'
import type { ChatCompletionTool } from 'openai/resources/chat/completions'

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
  private systemPrompt: string
  private model: string
  private maxTurns: number
  private toolMap: Map<string, ToolSpec>

  constructor(options: AgentOptions) {
    this.client = createClient()
    this.systemPrompt = options.systemPrompt
    this.model = options.model ?? 'gpt-5-nano'
    this.maxTurns = options.maxTurns ?? 6
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
    const compiled: any[] = [{ role: 'system', content: this.systemPrompt }]
    messages.forEach((message) => compiled.push({ role: message.role, content: message.content }))

    for (let turn = 0; turn < this.maxTurns; turn++) {
      const stream = (await this.client.chat.completions.create({
        model: this.model,
        messages: compiled,
        tools: this.getToolDefs(),
        tool_choice: this.toolMap.size ? 'auto' : undefined,
        stream: true,
      })) as AsyncIterable<any>

      let accumulated = ''
      const toolMap: Record<string, { id: string; function: { name: string; arguments: string } }> = {}
      let finishReason: string | null = null

      for await (const chunk of stream) {
        const choice = chunk.choices?.[0]
        if (!choice) continue

        finishReason = choice.finish_reason ?? finishReason
        const delta = choice.delta ?? {}

        if (Array.isArray(delta.content)) {
          accumulated += delta.content.map((part: any) => part?.text ?? '').join('')
        }
        if (typeof delta.content === 'string') {
          accumulated += delta.content
        }

        if (Array.isArray(delta.tool_calls)) {
          delta.tool_calls.forEach((callDelta: any) => {
            const id = callDelta.id || crypto.randomUUID()
            if (!toolMap[id]) {
              toolMap[id] = {
                id,
                function: { name: '', arguments: '' },
              }
            }
            if (callDelta.function?.name) {
              toolMap[id].function.name = callDelta.function.name
            }
            if (callDelta.function?.arguments) {
              toolMap[id].function.arguments += callDelta.function.arguments
            }
          })
        }
      }

      const toolCalls = Object.values(toolMap)

      if (toolCalls.length) {
        compiled.push({ role: 'assistant', content: accumulated, tool_calls: toolCalls })

        for (const call of toolCalls) {
          const funcCall = call.function
          if (!funcCall) continue

          const tool = this.toolMap.get(funcCall.name)
          if (!tool) {
            compiled.push({
              role: 'tool',
              tool_call_id: call.id,
              content: `Tool "${funcCall.name}" is not available.`,
            })
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
          })
        }
        continue
      }

      if (finishReason === 'stop' && accumulated) {
        return accumulated
      }
    }

    throw new Error('Agent exceeded max turns without producing a response.')
  }
}

const serperTool: ToolSpec<{ q: string; gl?: string }> = {
  name: 'serper',
  description: 'Fetch image-based product cards for skincare recommendations.',
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

    const response = await fetch('https://google.serper.dev/images', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({ q, gl, num: 20 }),
    })

    if (!response.ok) {
      throw new Error(`Serper search failed (${response.status}).`)
    }

    const payload = (await response.json()) as Record<string, unknown>
    const images = Array.isArray(payload.images) ? payload.images : []

    const listings = images
      .map((item) => ({
        name: typeof item.title === 'string' ? item.title : undefined,
        link: typeof item.link === 'string' ? item.link : undefined,
        retailer: typeof item.source === 'string' ? item.source : undefined,
        snippet: typeof item.snippet === 'string' ? item.snippet : undefined,
        image:
          typeof item.imageUrl === 'string'
            ? item.imageUrl
            : typeof item.thumbnailUrl === 'string'
              ? item.thumbnailUrl
              : undefined,
      }))
      .filter((item) => item.name && item.link && item.image)
      .slice(0, 6)

    return JSON.stringify({ listings })
  },
}

export const createCosmetistAgent = (photoDataUrl: string) =>
  new Agent({
    model: 'gpt-5-nano',
    maxTurns: 6,
    systemPrompt: [
      'You are a licensed aesthetician and cosmetic chemist.',
      `Here is the facial photo as a data URI: ${photoDataUrl}. Analyze it directly (do not ask the user to describe it).`,
      'Chat naturally using markdown. When the user asks for products or shopping links, call the serper tool with a focused query and return your reply with markdown bullets that include links and ![alt](image_url) thumbnails.',
      'Always remind them to patch test.',
    ].join(' '),
    tools: [serperTool],
  })
