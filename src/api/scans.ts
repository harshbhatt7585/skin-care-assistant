const BASE_URL = import.meta.env.VITE_API_URL

export type StoreScanPayload = {
  uid: string
  scanId: string
  data: Record<string, unknown>
}

export async function storeScan(payload: StoreScanPayload): Promise<void> {
  const response = await fetch(`${BASE_URL}/scan/store-scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid: payload.uid,
      scan_id: payload.scanId,
      data: payload.data,
    }),
  })
  if (!response.ok) {
    throw new Error('Failed to store scan')
  }
}
