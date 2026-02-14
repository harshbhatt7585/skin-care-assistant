import type { ConversationTurn } from '../types/conversation'

const BASE_URL = import.meta.env.VITE_API_URL

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
  history: ConversationTurn[]
}

export async function runBackendChatTurn({
  photoDataUrls,
  country,
  history,
}: ChatTurnArgs): Promise<{ reply: string; history: ConversationTurn[] }> {
  const response = await fetch(`${BASE_URL}/agent/chat-turn`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      photo_data_urls: photoDataUrls,
      country,
      history,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to run chat turn.')
  }

  return (await response.json()) as { reply: string; history: ConversationTurn[] }
}
