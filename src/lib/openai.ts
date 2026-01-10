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

type WorkflowCallbacks = {
  onAnalysis?: (analysis: string, history: ConversationTurn[]) => void
  onRatings?: (ratings: string, history: ConversationTurn[]) => void
  onShopping?: (shopping: string, history: ConversationTurn[]) => void
}

export const runInitialWorkflowSequenced = async ({
  photoDataUrl,
  callbacks,
}: {
  photoDataUrl: string
  callbacks?: WorkflowCallbacks
}): Promise<{
  history: ConversationTurn[]
}> => {
  const agent = createCosmetistAgent(photoDataUrl)
  const history: ConversationTurn[] = []

  const promptAndRespond = async (
    content: string,
    cb?: (reply: string, historySnapshot: ConversationTurn[]) => void,
  ) => {
    const prompt: ConversationTurn = { role: 'user', content }
    history.push(prompt)
    const reply = await agent.respond(history)
    console.log('reply', reply)
    history.push({ role: 'assistant', content: reply })
    cb?.(reply, [...history])
    return reply
  }

  await promptAndRespond(
    'Please analyze my bare-face photo. List bullet-point concerns (acne, pigmentation, redness, wrinkles, etc.) and rate Hydration, Oil Balance, Tone, Barrier Strength, and Sensitivity on a 1–5 scale. Keep it concise.',
    callbacks?.onAnalysis,
  )

  await promptAndRespond(
    'From that analysis, output a JSON object with keys hydration, oilBalance, tone, barrierStrength, sensitivity (numbers 1-5). No prose.',
    callbacks?.onRatings,
  )

  await promptAndRespond(
    'Using that assessment, fetch current shopping options with links and thumbnails for the AM/PM plan. Use tools if needed and return markdown with inline product cards.',
    callbacks?.onShopping,
  )

  return { history }
}
