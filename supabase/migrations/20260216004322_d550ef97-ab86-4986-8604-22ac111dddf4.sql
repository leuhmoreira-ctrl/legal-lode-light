
-- 1. Fix profiles: restrict SELECT to authenticated users only (was public)
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

-- 2. Fix task_checklist: restrict to task owners/assignees/admins
DROP POLICY IF EXISTS "Manage task checklist" ON public.task_checklist;
CREATE POLICY "Manage task checklist" ON public.task_checklist
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.kanban_tasks t WHERE t.id = task_checklist.task_id
            AND (t.user_id = auth.uid() OR t.assigned_to = auth.uid() 
                 OR public.is_admin_or_senior(auth.uid())))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.kanban_tasks t WHERE t.id = task_checklist.task_id
            AND (t.user_id = auth.uid() OR t.assigned_to = auth.uid() 
                 OR public.is_admin_or_senior(auth.uid())))
  );

-- 3. Fix task_activities: restrict INSERT to task owners (trigger uses SECURITY DEFINER)
DROP POLICY IF EXISTS "Insert task activities" ON public.task_activities;
CREATE POLICY "Insert task activities" ON public.task_activities
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.kanban_tasks t WHERE t.id = task_activities.task_id
            AND (t.user_id = auth.uid() OR t.assigned_to = auth.uid()
                 OR public.is_admin_or_senior(auth.uid())))
  );

-- 4. Fix task_activities SELECT: restrict to task owners
DROP POLICY IF EXISTS "View task activities" ON public.task_activities;
CREATE POLICY "View task activities" ON public.task_activities
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.kanban_tasks t WHERE t.id = task_activities.task_id
            AND (t.user_id = auth.uid() OR t.assigned_to = auth.uid()
                 OR public.is_admin_or_senior(auth.uid())))
  );

-- 5. Fix task-attachments storage policies
DROP POLICY IF EXISTS "Authenticated users can upload task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own task attachments" ON storage.objects;

-- Upload: user must be authenticated, path-based restriction via auth.uid prefix
CREATE POLICY "Upload task attachments authenticated" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'task-attachments' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- View: task owner/assignee or admin
CREATE POLICY "View task attachments with access" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'task-attachments' AND
    (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin_or_senior(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.task_attachments ta
        JOIN public.kanban_tasks t ON t.id = ta.task_id
        WHERE ta.storage_path = name
          AND (t.user_id = auth.uid() OR t.assigned_to = auth.uid())
      )
    )
  );

-- Delete: only uploader or admin
CREATE POLICY "Delete task attachments own or admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'task-attachments' AND
    (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin_or_senior(auth.uid())
    )
  );
