
-- Create a security definer function to check if user is a participant
-- This avoids infinite recursion in RLS policies
CREATE OR REPLACE FUNCTION public.is_chat_participant(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE conversation_id = _conversation_id
      AND user_id = _user_id
  )
$$;

-- Drop existing recursive policies
DROP POLICY IF EXISTS "View own conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Update own conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "View participants of own conversations" ON public.chat_participants;
DROP POLICY IF EXISTS "View messages in own conversations" ON public.chat_messages;
DROP POLICY IF EXISTS "Send messages in own conversations" ON public.chat_messages;

-- Recreate policies using the security definer function
CREATE POLICY "View own conversations" ON public.chat_conversations
  FOR SELECT USING (public.is_chat_participant(id, auth.uid()));

CREATE POLICY "Update own conversations" ON public.chat_conversations
  FOR UPDATE USING (public.is_chat_participant(id, auth.uid()));

CREATE POLICY "View participants of own conversations" ON public.chat_participants
  FOR SELECT USING (public.is_chat_participant(conversation_id, auth.uid()));

CREATE POLICY "View messages in own conversations" ON public.chat_messages
  FOR SELECT USING (public.is_chat_participant(conversation_id, auth.uid()));

CREATE POLICY "Send messages in own conversations" ON public.chat_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    public.is_chat_participant(conversation_id, auth.uid())
  );
