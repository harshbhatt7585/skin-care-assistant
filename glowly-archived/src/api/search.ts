const BASE_URL = import.meta.env.VITE_API_URL

export type SearchVectorDBResponse = {
  results?: Array<{ id: string; score: number; content: string }>
  [key: string]: unknown
}

export type UploadVectorDBResponse = {
  success?: boolean
  [key: string]: unknown
}

export async function searchVectorDB(query: string, uid: string, timestamp: string): Promise<SearchVectorDBResponse> {
  const response = await fetch(`${BASE_URL}/search/search-vector-db`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, uid, timestamp }),
  })
  if (!response.ok) {
    throw new Error('Failed to search vector DB')
  }
  return (await response.json()) as SearchVectorDBResponse
}

export async function uploadVectorDB(uid: string, content: string, timestamp: string): Promise<UploadVectorDBResponse> {
  const response = await fetch(`${BASE_URL}/search/upload-vector-db`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, content, timestamp }),
  })
  if (!response.ok) {
    throw new Error('Failed to upload vector DB')
  }
  return (await response.json()) as UploadVectorDBResponse
}
