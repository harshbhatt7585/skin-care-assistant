import type { ConversationTurn } from '../types/conversation'
import { runBackendChatTurn, streamScanWorkflow } from '../api/agent'

export const runChatTurn = async ({
  photoDataUrls,
  history,
  country,
}: {
  photoDataUrls: string[]
  history: ConversationTurn[]
  country: string
}): Promise<string> => {
  const seededHistory =
    history.length > 0
      ? history
      : [
          {
            role: 'user' as const,
            content:
              'Please analyze my scan and outline AM/PM rituals. Ask if I want shopping links before calling any tools.',
          },
        ]
  const { reply } = await runBackendChatTurn({
    photoDataUrls,
    country,
    history: seededHistory,
  })
  return reply
}

export type AgentWorkflowStep = 'verifying' | 'scanning' | 'analyzing' | 'shopping'

type WorkflowCallbacks = {
  onAnalysis?: (analysis: string, history: ConversationTurn[]) => void
  onRatings?: (ratings: string, history: ConversationTurn[]) => void
  onShopping?: (shopping: string, history: ConversationTurn[]) => void
  onStepChange?: (step: AgentWorkflowStep | null) => void
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

  const controller = new AbortController()
  let finalHistory: ConversationTurn[] = []
  let workflowError: string | null = null

  await streamScanWorkflow({
    photoDataUrls,
    country,
    signal: controller.signal,
    onEvent: (event) => {
      if (event.step === 'error' || event.status === 'failed') {
        workflowError = event.error ?? event.message ?? 'Scan failed.'
        controller.abort()
        callbacks?.onStepChange?.(null)
        return
      }

      if (event.step === 'complete') {
        finalHistory = event.history ?? []
        callbacks?.onStepChange?.(null)
        return
      }

      const step = event.step as AgentWorkflowStep

      if (event.status === 'in_progress') {
        callbacks?.onStepChange?.(step)
        return
      }

      if (event.status === 'failed') {
        workflowError = event.message ?? 'Scan failed.'
        controller.abort()
        callbacks?.onStepChange?.(null)
        return
      }

      if (step === 'scanning' && event.analysis) {
        callbacks?.onAnalysis?.(event.analysis, event.history ?? [])
        return
      }

      if (step === 'analyzing' && event.ratings) {
        callbacks?.onRatings?.(event.ratings, event.history ?? [])
        return
      }

      if (step === 'shopping' && event.shopping) {
        callbacks?.onShopping?.(event.shopping, event.history ?? [])
      }
    },
  }).catch((error) => {
    if (!controller.signal.aborted) {
      throw error
    }
  })

  if (workflowError) {
    throw new Error(workflowError)
  }

  return { history: finalHistory }
}
