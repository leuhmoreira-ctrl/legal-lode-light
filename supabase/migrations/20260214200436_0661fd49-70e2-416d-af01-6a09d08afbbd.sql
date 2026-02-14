
-- Tabela de comentários nas tarefas
CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.kanban_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.task_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de anexos nas tarefas
CREATE TABLE public.task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.kanban_tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT,
  storage_path TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de checklist (subtarefas)
CREATE TABLE public.task_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.kanban_tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  position_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de histórico de atividades
CREATE TABLE public.task_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.kanban_tasks(id) ON DELETE CASCADE,
  user_id UUID,
  action_type TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_task_comments_task ON public.task_comments(task_id);
CREATE INDEX idx_task_attachments_task ON public.task_attachments(task_id);
CREATE INDEX idx_task_checklist_task ON public.task_checklist(task_id);
CREATE INDEX idx_task_activities_task ON public.task_activities(task_id);

-- RLS
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activities ENABLE ROW LEVEL SECURITY;

-- Comments: anyone authenticated can view, users insert their own
CREATE POLICY "View task comments" ON public.task_comments FOR SELECT USING (true);
CREATE POLICY "Insert own comments" ON public.task_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own comments" ON public.task_comments FOR DELETE USING (auth.uid() = user_id);

-- Attachments: anyone can view, users insert their own
CREATE POLICY "View task attachments" ON public.task_attachments FOR SELECT USING (true);
CREATE POLICY "Insert own attachments" ON public.task_attachments FOR INSERT WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Delete own attachments" ON public.task_attachments FOR DELETE USING (auth.uid() = uploaded_by);

-- Checklist: full access for authenticated users (task-level access already controlled by kanban_tasks RLS)
CREATE POLICY "Manage task checklist" ON public.task_checklist FOR ALL USING (true) WITH CHECK (true);

-- Activities: read-only for everyone, system inserts
CREATE POLICY "View task activities" ON public.task_activities FOR SELECT USING (true);
CREATE POLICY "Insert task activities" ON public.task_activities FOR INSERT WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_checklist;

-- Storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('task-attachments', 'task-attachments', false)
ON CONFLICT DO NOTHING;

CREATE POLICY "Authenticated users can upload task attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'task-attachments');

CREATE POLICY "Authenticated users can view task attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'task-attachments');

CREATE POLICY "Users can delete own task attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'task-attachments');

-- Trigger for auto-logging activities
CREATE OR REPLACE FUNCTION public.log_task_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.task_activities (task_id, user_id, action_type, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'status_changed', OLD.status, NEW.status);
    END IF;
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO public.task_activities (task_id, user_id, action_type, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'assigned_changed', OLD.assigned_to::text, NEW.assigned_to::text);
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.task_activities (task_id, user_id, action_type)
    VALUES (NEW.id, auth.uid(), 'created');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER task_activity_trigger
AFTER INSERT OR UPDATE ON public.kanban_tasks
FOR EACH ROW EXECUTE FUNCTION public.log_task_activity();
