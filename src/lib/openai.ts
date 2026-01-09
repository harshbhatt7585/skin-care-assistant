import { createCosmetistAgent } from './agent'

type ConversationTurn = {
  role: 'user' | 'assistant'
  content: string
}

export const runChatTurn = async ({
  photoDataUrl,
  history,
}: {
  photoDataUrl: string
  history: ConversationTurn[]
}): Promise<string> => {
  const agent = createCosmetistAgent(photoDataUrl)
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

export const runInitialWorkflow = async ({
  photoDataUrl,
}: {
  photoDataUrl: string
}): Promise<{
  history: ConversationTurn[]
  analysis: string
  shopping: string
}> => {
  const agent = createCosmetistAgent(photoDataUrl)
  const history: ConversationTurn[] = []

  const analysisPrompt: ConversationTurn = {
    role: 'user',
    content:
      'Please analyze my bare-face photo. List bullet-point concerns (acne, pigmentation, redness, wrinkles, etc.) and rate Hydration, Oil Balance, Tone, Barrier Strength, and Sensitivity on a 1–5 scale. Keep it concise.',
  }
  history.push(analysisPrompt)
  const analysis = await agent.respond(history)
  history.push({ role: 'assistant', content: analysis })

  const shoppingPrompt: ConversationTurn = {
    role: 'user',
    content:
      'Using that assessment, fetch current shopping options with links and thumbnails for the AM/PM plan. Use tools if needed and return markdown with inline product cards.',
  }
  history.push(shoppingPrompt)
  const shopping = await agent.respond(history)
  history.push({ role: 'assistant', content: shopping })

  return { history, analysis, shopping }
}
