-- 1. Table for email integration settings (per user)
CREATE TABLE public.integracao_email (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook', 'manual')),
  email_address TEXT NOT NULL,

  -- SMTP Settings (encrypted in app, stored as text here)
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_user TEXT,
  smtp_pass TEXT, -- Encrypted

  -- IMAP Settings
  imap_host TEXT,
  imap_port INTEGER,
  imap_user TEXT,
  imap_pass TEXT, -- Encrypted

  -- OAuth Tokens
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,

  -- Sync Preferences
  sync_frequency TEXT DEFAULT 'manual', -- 'realtime', '5min', '15min', '1h', 'manual'
  sync_period_days INTEGER DEFAULT 30,
  sync_only_clients BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  UNIQUE(user_id)
);

ALTER TABLE public.integracao_email ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own email integration" ON public.integracao_email
  FOR ALL USING (auth.uid() = user_id);

-- 2. Table for Email Threads (Conversations)
CREATE TABLE public.conversas_email (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_id TEXT, -- Thread ID from provider
  subject TEXT,
  snippet TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  unread_count INTEGER DEFAULT 0,
  has_attachments BOOLEAN DEFAULT false,

  -- Linking
  cliente_id UUID, -- Optional link to client
  processo_id UUID REFERENCES public.processos(id) ON DELETE SET NULL,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.conversas_email ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own email threads" ON public.conversas_email
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email threads" ON public.conversas_email
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email threads" ON public.conversas_email
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email threads" ON public.conversas_email
  FOR DELETE USING (auth.uid() = user_id);

-- 3. Table for Email Messages
CREATE TABLE public.mensagens_email (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversa_id UUID NOT NULL REFERENCES public.conversas_email(id) ON DELETE CASCADE,
  external_id TEXT, -- Message ID from provider
  from_name TEXT,
  from_email TEXT,
  to_recipients TEXT[], -- Array of email addresses
  cc_recipients TEXT[],
  bcc_recipients TEXT[],
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  received_at TIMESTAMP WITH TIME ZONE,
  is_read BOOLEAN DEFAULT false,
  is_sent BOOLEAN DEFAULT false, -- True if sent by user
  has_attachments BOOLEAN DEFAULT false,
  folder TEXT DEFAULT 'inbox', -- 'inbox', 'sent', 'drafts', 'trash'

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mensagens_email ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages of their threads" ON public.mensagens_email
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM conversas_email c WHERE c.id = mensagens_email.conversa_id AND c.user_id = auth.uid())
  );

CREATE POLICY "Users can insert messages to their threads" ON public.mensagens_email
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM conversas_email c WHERE c.id = mensagens_email.conversa_id AND c.user_id = auth.uid())
  );

CREATE POLICY "Users can update messages of their threads" ON public.mensagens_email
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM conversas_email c WHERE c.id = mensagens_email.conversa_id AND c.user_id = auth.uid())
  );

-- 4. Table for Email Templates
CREATE TABLE public.templates_email (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject_template TEXT,
  body_template TEXT, -- Supports variables like {{nome}}
  tags TEXT[],
  usage_count INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.templates_email ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own templates" ON public.templates_email
  FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_conversas_email_user_id ON public.conversas_email(user_id);
CREATE INDEX idx_conversas_email_processo_id ON public.conversas_email(processo_id);
CREATE INDEX idx_mensagens_email_conversa_id ON public.mensagens_email(conversa_id);
CREATE INDEX idx_mensagens_email_sent_at ON public.mensagens_email(sent_at DESC);
