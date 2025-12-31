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

export type ProductSearchHit = {
  title: string
  link: string
  price?: string
  snippet?: string
  source?: string
  rating?: number
  reviews?: number
  delivery?: string
  image?: string
}

export type ProductRecommendation = {
  name: string
  rationale: string
  url: string
  retailer?: string
  price?: string
}

export type FormulaAgentResult = {
  summary: string
  recommendations: ProductRecommendation[]
}
