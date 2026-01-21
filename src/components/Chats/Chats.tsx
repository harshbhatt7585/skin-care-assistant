import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from 'react'
import ChatInterface, { type ChatMessage as UiChatMessage } from '../ChatInterface'
import { runChatTurn, type ConversationTurn } from '../../lib/openai'
import type { ChatMessage as PersistedChatMessage } from '../../types/chats'
import { storeMessage as storeMessageApi } from '../../api/chats'

export type ChatsHandle = {
  replaceWithAssistantMessages: (messages: string[], historySnapshot: ConversationTurn[]) => void
  appendAssistantMessage: (message: string, historySnapshot: ConversationTurn[]) => void
  reset: () => void
}

const normalizePersistedMessages = (messages: PersistedChatMessage[]) => {
  return messages.map((message) => {
    const role = message.role === 'assistant' ? 'assistant' : 'user'
    return {
      ui: {
        id: crypto.randomUUID(),
        role,
        content: message.content,
      } satisfies UiChatMessage,
      turn: {
        role,
        content: message.content,
      } satisfies ConversationTurn,
    }
  })
}

type ChatsProps = {
  photos: string[]
  country: string | null
  isLoading: boolean
  setLoading: Dispatch<SetStateAction<boolean>>
  setStatus: Dispatch<SetStateAction<string>>
  setError: Dispatch<SetStateAction<string | null>>
  minPhotosRequired: number
  initialMessages?: PersistedChatMessage[]
  uid: string | null
  chatId?: string | null
}

const Chats = forwardRef<ChatsHandle, ChatsProps>(
  (
    {
      photos,
      country,
      isLoading,
      setLoading,
      setStatus,
      setError,
      minPhotosRequired,
      initialMessages,
      uid,
      chatId,
    },
    ref,
  ) => {
    const [messages, setMessages] = useState<UiChatMessage[]>([])
    const [history, setHistory] = useState<ConversationTurn[]>([])
    const [input, setInput] = useState('')

    const persistMessages = async (
      entries: Array<{ role: ConversationTurn['role']; content: string }>,
    ) => {
      if (!uid || !entries.length) {
        return
      }

      const chatIdentifier = (chatId ?? uid)?.trim()
      if (!chatIdentifier) {
        return
      }

      const formatted = entries.map(
        ({ role, content }) =>
          ({
            role,
            content,
            timestamp: new Date().toISOString(),
            content_type: 'text',
          }) satisfies PersistedChatMessage,
      )

      try {
        await storeMessageApi({
          chat_id: chatIdentifier,
          uid,
          messages: formatted,
        })
      } catch (err) {
        console.error('Failed to store chat messages', err)
      }
    }

    useEffect(() => {
      if (!initialMessages) {
        return
      }

      if (!initialMessages.length) {
        setMessages([])
        setHistory([])
        setInput('')
        return
      }

      const normalized = normalizePersistedMessages(initialMessages)
      setMessages(normalized.map((entry) => entry.ui))
      setHistory(normalized.map((entry) => entry.turn))
      setInput('')
    }, [initialMessages])

    useImperativeHandle(ref, () => ({
      replaceWithAssistantMessages(newAssistantMessages, historySnapshot) {
        setMessages(
          newAssistantMessages.map((content) => ({
            id: crypto.randomUUID(),
            role: 'assistant',
            content,
          })),
        )
        setHistory(historySnapshot)
        void persistMessages(newAssistantMessages.map((content) => ({ role: 'assistant', content })))
      },
      appendAssistantMessage(content, historySnapshot) {
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content }])
        setHistory(historySnapshot)
        void persistMessages([{ role: 'assistant', content }])
      },
      reset() {
        setMessages([])
        setHistory([])
        setInput('')
      },
    }))

    const runAgentTurn = async (
      photoDataUrls: string[],
      nextHistory: ConversationTurn[],
    ): Promise<ConversationTurn[] | undefined> => {
      try {
        setLoading(true)
        setStatus('Consulting the cosmetist...')
        const baseHistory: ConversationTurn[] =
          nextHistory.length === 0
            ? [
                {
                  role: 'user' as const,
                  content:
                    'Please analyze my bare-face photo and outline AM/PM rituals. Write analysis in points, Write concerns if acne, pigmentation, dark spots, redness, wrinkles, etc. and give rating on these conditions: Hydration, Oil Balance, Tone, Barrier Strength, Sensitivity. Dont explain anything, just the points and ratings.',
                },
              ]
            : nextHistory

        const reply = await runChatTurn({
          photoDataUrls,
          history: baseHistory,
          country: country ?? 'us',
        })

        const finalHistory: ConversationTurn[] = [...baseHistory, { role: 'assistant', content: reply }]
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: reply }])
        setHistory(finalHistory)
        setStatus('Done. Ask anything else or upload again to iterate.')
        void persistMessages([{ role: 'assistant', content: reply }])
        return finalHistory
      } catch (err) {
        console.error(err)
        setError(
          err instanceof Error
            ? err.message
            : 'Something went wrong while generating your plan. Try again.',
        )
        setStatus('Unable to finish. Fix the issue and retry.')
      } finally {
        setLoading(false)
      }
    }

    const handleSend = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!input.trim() || photos.length < minPhotosRequired || isLoading) {
        return
      }

      const userTurn: ConversationTurn = { role: 'user', content: input.trim() }
      const nextHistory = [...history, userTurn]

      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: userTurn.content }])
      setHistory(nextHistory)
      setInput('')
      void persistMessages([{ role: 'user', content: userTurn.content }])
      await runAgentTurn(photos, nextHistory)
    }

    return (
      <ChatInterface
        messages={messages}
        inputValue={input}
        isLoading={isLoading}
        onInputChange={setInput}
        onSubmit={handleSend}
      />
    )
  },
)

export default Chats
