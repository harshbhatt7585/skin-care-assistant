const BASE_URL = import.meta.env.VITE_API_URL
import type { User } from '../types/auth'

export const registerUser = async (user: User) => {
    const response = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        body: JSON.stringify(user),
    })
    return response.json()
}

export const getUser = async (uid: string) => {
    const response = await fetch(`${BASE_URL}/auth/get-user`, {
        method: 'POST',
        body: JSON.stringify({ uid }),
    })
    return response.json()
}
