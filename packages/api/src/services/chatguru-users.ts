import { env } from "@clickqaassist/env/server";

const CHATGURU_API_URL = env.CHATGURU_API_URL;

export interface ChatGuruUser {
  id: string;
  name: string;
  email?: string;
}

export interface ChatGuruGroup {
  id: string;
  name: string;
  users: ChatGuruUser[];
}

export interface ChatGuruUsersResponse {
  groups: ChatGuruGroup[];
  users: ChatGuruUser[];
}

export async function fetchChatGuruUsers(): Promise<ChatGuruUsersResponse> {
  const response = await fetch(`${CHATGURU_API_URL}/api/users`, {
    headers: {
      "Bypass-Tunnel-Reminder": "true",
    },
  });

  if (!response.ok) {
    throw new Error(`ChatGuru API error: ${response.status}`);
  }

  return response.json() as Promise<ChatGuruUsersResponse>;
}
