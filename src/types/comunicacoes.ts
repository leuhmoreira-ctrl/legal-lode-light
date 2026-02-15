export type ConversationType = "chat" | "email";

export interface UnifiedConversation {
  id: string;
  type: ConversationType;
  title: string;
  subtitle?: string;
  snippet: string;
  unread_count: number;
  has_attachments: boolean;
  pinned: boolean;
  muted: boolean;
  last_message_at: string;
  processo_id?: string | null;
  // Chat-specific
  participants?: { user_id: string; full_name: string; avatar_url: string | null }[];
  chat_type?: "direct" | "process" | "group";
  // Email-specific
  email_from?: string;
  email_to?: string[];
  email_subject?: string;
  thread_count?: number;
}

export interface UnifiedMessage {
  id: string;
  conversation_id: string;
  type: ConversationType;
  sender_name: string;
  sender_email?: string;
  sender_id?: string;
  sender_avatar?: string | null;
  content: string;
  content_html?: string;
  is_sent: boolean;
  created_at: string;
  has_attachments: boolean;
}

export type ConversationFilter = "all" | "chat" | "email";
