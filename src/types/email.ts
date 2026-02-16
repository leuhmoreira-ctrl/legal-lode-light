export interface EmailIntegration {
  id: string;
  user_id: string;
  provider: 'gmail' | 'outlook' | 'manual';
  email_address: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  imap_host?: string;
  imap_port?: number;
  imap_user?: string;
  sync_frequency: 'manual' | 'realtime' | '5min' | '15min' | '1h';
  sync_period_days: number;
  sync_only_clients: boolean;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface EmailThread {
  id: string;
  user_id: string;
  external_id?: string;
  subject: string;
  snippet?: string;
  last_message_at?: string;
  unread_count: number;
  has_attachments: boolean;
  cliente_id?: string;
  processo_id?: string;
  created_at: string;
  updated_at: string;
  messages?: EmailMessage[]; // Optional joined messages
}

export interface EmailMessage {
  id: string;
  conversa_id: string;
  external_id?: string;
  from_name?: string;
  from_email: string;
  to_recipients: string[];
  cc_recipients?: string[];
  bcc_recipients?: string[];
  subject?: string;
  body_text?: string;
  body_html?: string;
  sent_at?: string;
  received_at?: string;
  is_read: boolean;
  is_sent: boolean;
  has_attachments: boolean;
  folder: 'inbox' | 'sent' | 'drafts' | 'trash';
  created_at: string;
  // Extended fields (simulated or metadata)
  priority?: 'normal' | 'high' | 'low';
  scheduled_at?: string;
}

export interface EmailTemplate {
  id: string;
  user_id: string;
  name: string;
  subject_template: string;
  body_template: string;
  tags?: string[];
  usage_count: number;
  created_at: string;
  updated_at: string;
}
