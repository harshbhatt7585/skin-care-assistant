import type { InventoryItem } from '../types/user'

const BASE_URL = import.meta.env.VITE_API_URL

export type UserResponse = {
  personal: {
    email: string
    name: string
    uid: string
    gender?: string | null
    country?: string | null
  }
  inventory: InventoryItem[]
}

export async function fetchUser(uid: string): Promise<UserResponse> {
  const response = await fetch(`${BASE_URL}/user/user?uid=${encodeURIComponent(uid)}`)
  if (!response.ok) {
    throw new Error('Failed to fetch user')
  }
  return (await response.json()) as UserResponse
}

export async function addInventoryItem(item: InventoryItem): Promise<InventoryItem> {
  const response = await fetch(`${BASE_URL}/user/user/inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  })
  if (!response.ok) {
    throw new Error('Failed to add inventory item')
  }
  return (await response.json()) as InventoryItem
}
