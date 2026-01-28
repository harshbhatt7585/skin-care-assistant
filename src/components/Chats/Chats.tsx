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
import type { ChatMessage as PersistedChatMessage, ConversationTurn } from '../../types/chats'
import { chatTurn } from '../../api/chats'

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
  initialMessages?: PersistedChatMessage[]
  uid: string | null
  chatId?: string | null
  onNewScan: () => void
  onPersistedMessages?: (messages: PersistedChatMessage[]) => void
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
      initialMessages,
      uid,
      chatId,
      onNewScan,
      onPersistedMessages,
    },
    ref,
  ) => {
    const [messages, setMessages] = useState<UiChatMessage[]>([])
    const [history, setHistory] = useState<ConversationTurn[]>([])
    const [input, setInput] = useState('')

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
        // Notify parent about new messages (backend already persisted them)
        const formatted = newAssistantMessages.map((content) => ({
          role: 'assistant' as const,
          content,
          timestamp: new Date().toISOString(),
          content_type: 'text',
        }))
        onPersistedMessages?.(formatted)
      },
      appendAssistantMessage(content, historySnapshot) {
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content }])
        setHistory(historySnapshot)
        // Notify parent about new message (backend already persisted it)
        onPersistedMessages?.([{
          role: 'assistant',
          content,
          timestamp: new Date().toISOString(),
          content_type: 'text',
        }])
      },
      reset() {
        setMessages([])
        setHistory([])
        setInput('')
      },
    }))

    const handleSend = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!input.trim() || isLoading) {
        return
      }

      const userMessage = input.trim()
      setInput('')

      // Optimistically add user message to UI
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: userMessage }])

      try {
        setLoading(true)
        setStatus('Consulting the cosmetist...')

        // Call backend API
        const response = await chatTurn({
          uid: uid ?? '',
          chat_id: chatId ?? uid ?? undefined,
          photo_data_urls: photos,
          history,
          message: userMessage,
          country: country ?? 'us',
        })

        // Update UI with assistant response
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: response.reply }])
        setHistory(response.history)
        setStatus('Done. Ask anything else or upload again to iterate.')

        // Notify parent about persisted messages
        onPersistedMessages?.([
          { role: 'user', content: userMessage, timestamp: new Date().toISOString(), content_type: 'text' },
          { role: 'assistant', content: response.reply, timestamp: new Date().toISOString(), content_type: 'text' },
        ])
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

    return (
      <ChatInterface
        messages={messages}
        inputValue={input}
        isLoading={isLoading}
        onInputChange={setInput}
        onSubmit={handleSend}
        onNewScan={onNewScan}
      />
    )
  },
)

export default Chats
