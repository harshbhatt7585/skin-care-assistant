// Mirrors backend/schema/search.py so frontend requests stay aligned.

export interface SearchVectorDBRequest {
  query: string
  uid: string
  timestamp: string // ISO string
}

export interface SearchVectorDBResponse {
  results: Array<Record<string, unknown>>
}
