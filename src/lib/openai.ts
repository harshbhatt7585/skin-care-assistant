import { createCosmetistAgent } from './agent'

type ConversationTurn = {
  role: 'user' | 'assistant'
  content: string
}

export const runChatTurn = async ({
  summary,
  history,
}: {
  summary: string
  history: ConversationTurn[]
}): Promise<string> => {
  const agent = createCosmetistAgent(summary)
  const conversation = history.length
    ? history
    : [
        {
          role: 'user' as const,
          content:
            'Please analyze my scan and outline AM/PM rituals. Ask if I want shopping links before calling any tools.',
        },
      ]
  return agent.respond(conversation)
}
