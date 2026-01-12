import { createCosmetistAgent } from './agent'

type ConversationTurn = {
  role: 'user' | 'assistant'
  content: string
}

export const runChatTurn = async ({
  photoDataUrls,
  history,
  country,
}: {
  photoDataUrls: string[]
  history: ConversationTurn[]
  country: string
}): Promise<string> => {
  if (!photoDataUrls.length) {
    throw new Error('runChatTurn requires at least one photo.')
  }
  const agent = createCosmetistAgent(photoDataUrls, country)
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
  photoDataUrls,
  country,
  callbacks,
}: {
  photoDataUrls: string[]
  country: string
  callbacks?: WorkflowCallbacks
}): Promise<{
  history: ConversationTurn[]
}> => {
  if (!photoDataUrls.length) {
    throw new Error('runInitialWorkflowSequenced requires at least one photo.')
  }
  const agent = createCosmetistAgent(photoDataUrls, country)
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

  const reply = await promptAndRespond(
    "Here are 3 images of human front face, and two side face. If you find that the required images are not present, give negative response and ask tell the user what they are missing. give response in json like {success: false/true, message: '...'}"
  )
  const jsonReply = await JSON.parse(reply)
  if (!jsonReply.success) {
    throw new Error(jsonReply.message)
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
    'Using that assessment, fetch current shopping options with links and thumbnails for the AM/PM plan. Use tools if needed and return markdown with inline product cards. Format the response in this format: ```json\n{\n  "products": [\n    {\n      "title": "Example Product Title",\n      "source": "ExampleSource.com",\n      "link": "https://example.com/product-page",\n      "price": "$0.00",\n      "imageUrl": "https://example.com/product-image.jpg",\n      "rating": 0,\n      "ratingCount": 0,\n      "productId": "123456789",\n      "position": 1\n    }\n  ]\n}\n```',
    callbacks?.onShopping,
  )

  return { history }
}
