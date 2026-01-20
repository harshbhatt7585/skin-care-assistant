const BASE_URL = import.meta.env.VITE_API_URL
import type { User } from '../types/auth'

export const registerUser = async (user: User) => {
    const response = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
    })
    return response.json()
}

export const getUser = async (uid: string) => {
    const response = await fetch(`${BASE_URL}/auth/get-user`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid }),
    })
    if (response.status === 404) {
        return { exists: false }
    }
    return { exists: true, user: await response.json() }
}
