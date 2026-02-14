
-- Tighten the INSERT policies for chat_conversations and chat_participants
DROP POLICY "Create conversations" ON public.chat_conversations;
CREATE POLICY "Create conversations" ON public.chat_conversations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY "Add participants" ON public.chat_participants;
CREATE POLICY "Add participants" ON public.chat_participants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
