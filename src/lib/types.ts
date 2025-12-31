export type SkinMetric = {
  key: string
  label: string
  value: number
  summary: string
}

export type AdviceRequestPayload = {
  metrics: SkinMetric[]
  concerns: string
  focusAreas: string[]
  environment: string
  routineIntensity: number
}
