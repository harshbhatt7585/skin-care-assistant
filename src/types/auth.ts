// Mirrors backend/schema/auth.py so the frontend aligns with API payloads.
export interface UserPersonal {
  email: string;
  name: string;
  uid: string;
  gender: string;
  country: string;
}

export interface User {
  personal: UserPersonal;
  last_scanned: string;
  last_chat: string;
  created_at: string;
}

export interface GetUser {
  uid: string;
}

