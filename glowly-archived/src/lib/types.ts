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

export type ProductSuggestion = {
  name: string
  url: string
  price?: string
  retailer?: string
  snippet?: string
  image?: string
}
