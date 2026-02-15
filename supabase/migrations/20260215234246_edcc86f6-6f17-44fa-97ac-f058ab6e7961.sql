
-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'internal',
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  from_user_id UUID NOT NULL,
  to_user_ids UUID[] NOT NULL,
  read_by UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- User can see messages they sent or received
CREATE POLICY "View own messages" ON public.messages
  FOR SELECT USING (
    from_user_id = auth.uid() OR auth.uid() = ANY(to_user_ids)
  );

-- User can send messages
CREATE POLICY "Send messages" ON public.messages
  FOR INSERT WITH CHECK (from_user_id = auth.uid());

-- User can update messages they receive (mark as read)
CREATE POLICY "Update received messages" ON public.messages
  FOR UPDATE USING (auth.uid() = ANY(to_user_ids));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
