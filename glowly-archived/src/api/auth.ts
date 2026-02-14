const BASE_URL = import.meta.env.VITE_API_URL
import type { User, GetUserResponse } from '../types/auth'

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

export const getUser = async (uid: string): Promise<GetUserResponse> => {
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
    if (!response.ok) {
        throw new Error(`Unable to fetch user (status ${response.status})`)
    }
    const user: User = await response.json()
    return { exists: true, user }
}
