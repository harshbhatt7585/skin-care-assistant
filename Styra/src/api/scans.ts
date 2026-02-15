export type ScanRecord = {
  id: string
  uid: string
  created_at: string
  updated_at: string
  images: string[]
  analysis: string
  scores: Record<string, unknown>
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export async function storeScan(scan: ScanRecord): Promise<void> {
  const response = await fetch(`${BASE_URL}/scan/store-scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ scan }),
  })
  if (!response.ok) {
    throw new Error('Failed to store scan')
  }
}
