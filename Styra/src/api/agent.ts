import type { ConversationTurn } from '../types/conversation'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export type WorkflowEvent = {
  step: string
  status: 'in_progress' | 'completed' | 'failed' | 'succeeded'
  message?: string
  analysis?: string
  ratings?: string
  shopping?: string
  error?: string
  history?: ConversationTurn[]
}

type WorkflowOptions = {
  photoDataUrls: string[]
  country: string
  onEvent: (event: WorkflowEvent) => void
  signal?: AbortSignal
}

export async function streamScanWorkflow({
  photoDataUrls,
  country,
  onEvent,
  signal,
}: WorkflowOptions): Promise<void> {
  if (!photoDataUrls.length) {
    throw new Error('At least one photo is required to start the workflow.')
  }

  const response = await fetch(`${BASE_URL}/agent/workflow`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ photo_data_urls: photoDataUrls, country }),
    signal,
  })

  if (!response.ok || !response.body) {
    throw new Error('Failed to start agent workflow.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const events = buffer.split('\n\n')
      buffer = events.pop() ?? ''
      for (const rawEvent of events) {
        const trimmed = rawEvent.trim()
        if (!trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (!data) continue
        try {
          onEvent(JSON.parse(data))
        } catch (error) {
          console.warn('Failed to parse workflow event', error)
        }
      }
    }
  } catch (error) {
    if (!signal?.aborted) {
      throw error
    }
  }

  if (buffer.trim()) {
    const finalChunk = buffer.trim()
    if (finalChunk.startsWith('data:')) {
      const data = finalChunk.slice(5).trim()
      if (data) {
        try {
          onEvent(JSON.parse(data))
        } catch (error) {
          console.warn('Failed to parse workflow event', error)
        }
      }
    }
  }
}

type ChatTurnArgs = {
  photoDataUrls: string[]
  country: string
  uid?: string
  history: ConversationTurn[]
}

type ChatTurnResponse = {
  reply: string
  history: ConversationTurn[]
  memory_saved?: boolean
}

export async function runBackendChatTurn({
  photoDataUrls,
  country,
  uid,
  history,
}: ChatTurnArgs): Promise<ChatTurnResponse> {
  const response = await fetch(`${BASE_URL}/agent/chat-turn`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      photo_data_urls: photoDataUrls,
      country,
      uid,
      history,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to run chat turn.')
  }

  const payload = (await response.json()) as ChatTurnResponse
  console.log('[agent] backend reply:', payload.reply)
  return payload
}

export async function runFashionChatTurn({
  photoDataUrls,
  country,
  uid,
  history,
}: ChatTurnArgs): Promise<ChatTurnResponse> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}/agent/fashion-chat-turn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        photo_data_urls: photoDataUrls,
        country,
        uid,
        history,
      }),
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Network request failed'
    throw new Error(
      `Cannot reach assistant API at ${BASE_URL}. ${message}. Start backend on port 8000 and verify VITE_API_URL.`
    )
  }

  if (!response.ok) {
    throw new Error('Failed to run fashion chat turn.')
  }

  const payload = (await response.json()) as ChatTurnResponse
  console.log('[agent] fashion reply:', payload.reply)
  return payload
}
