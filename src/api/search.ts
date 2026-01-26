const BASE_URL = import.meta.env.VITE_API_URL

export async function searchVectorDB(query: string, uid: string, timestamp: string): Promise<SearchVectorDBResponse> {
  const response = await fetch(`${BASE_URL}/search/search-vector-db`, {
    method: 'POST',
    body: JSON.stringify({ query, uid, timestamp }),
  })
  return response.json()
}

export async function uploadVectorDB(uid: string, content: string, timestamp: string): Promise<UploadVectorDBResponse> {
  const response = await fetch(`${BASE_URL}/search/upload-vector-db`, {
    method: 'POST',
    body: JSON.stringify({ uid, content, timestamp }),
  })
  return response.json()
}