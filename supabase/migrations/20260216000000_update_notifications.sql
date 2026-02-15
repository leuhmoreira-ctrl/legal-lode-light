-- Add new columns to notifications table to support unified messaging
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS from_user_id UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS from_email TEXT,
  ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- Ensure RLS allows users to manage their own notifications
-- (Assuming existing policies exist, but adding specific ones for update just in case)

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Index for performance on filters
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read_archived ON public.notifications(user_id, is_read, archived);
