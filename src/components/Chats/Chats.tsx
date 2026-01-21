import { forwardRef, useImperativeHandle, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import ChatInterface, { type ChatMessage } from '../ChatInterface'
import { runChatTurn, type ConversationTurn } from '../../lib/openai'

export type ChatsHandle = {
  replaceWithAssistantMessages: (messages: string[], historySnapshot: ConversationTurn[]) => void
  appendAssistantMessage: (message: string, historySnapshot: ConversationTurn[]) => void
  reset: () => void
}

type ChatsProps = {
  photos: string[]
  country: string | null
  isLoading: boolean
  setLoading: Dispatch<SetStateAction<boolean>>
  setStatus: Dispatch<SetStateAction<string>>
  setError: Dispatch<SetStateAction<string | null>>
  minPhotosRequired: number
}

const Chats = forwardRef<ChatsHandle, ChatsProps>(
  ({ photos, country, isLoading, setLoading, setStatus, setError, minPhotosRequired }, ref) => {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [history, setHistory] = useState<ConversationTurn[]>([])
    const [input, setInput] = useState('')

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
      },
      appendAssistantMessage(content, historySnapshot) {
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content }])
        setHistory(historySnapshot)
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
