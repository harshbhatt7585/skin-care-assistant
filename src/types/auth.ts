// Mirrors backend/schema/auth.py so the frontend aligns with API payloads.
export interface UserPersonal {
  email: string;
  name: string;
  uid: string;
  gender?: string | null;
  country?: string | null;
}

export interface User {
  personal: UserPersonal;
  last_scanned?: string | null;
  last_chat?: string | null;
  created_at: string;
}

export interface GetUser {
  uid: string;
}

export interface GetUserResponse {
  exists: boolean;
  user?: User;
}
