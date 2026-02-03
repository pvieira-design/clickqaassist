const CHATGURU_API_URL = "https://api.clickchathistory.com";

export interface ChatGuruMessage {
  chatId: string;
  chatUrl: string;
  chatStatus: string;
  leadName: string;
  leadPhone: string;
  messageId: string;
  direction: string;
  agentName: string | null;
  text: string;
  messageType: string;
  timestamp: string;
  timestampBR: string;
  status: string;
  isTemplate: boolean;
  templateName: string | null;
  deleted: boolean;
  transcribed: boolean;
}

export function parseChatGuruUrl(url: string): string {
  // URL format: https://s21.chatguru.app/chats#697fdae0c30edc5d32e99935
  const hashIndex = url.indexOf("#");
  if (hashIndex === -1) {
    // If no hash, assume the input IS the chatId
    return url.trim();
  }
  return url.substring(hashIndex + 1).trim();
}

export async function fetchChatExport(
  chatId: string,
): Promise<ChatGuruMessage[]> {
  const response = await fetch(
    `${CHATGURU_API_URL}/api/chat/${chatId}/export?format=n8n&transcribe=true`,
    {
      headers: {
        "Bypass-Tunnel-Reminder": "true",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`ChatGuru API error: ${response.status}`);
  }

  return response.json() as Promise<ChatGuruMessage[]>;
}
