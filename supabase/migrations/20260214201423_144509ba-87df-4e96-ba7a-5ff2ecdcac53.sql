-- Add task_id column to document_metadata to link documents uploaded from Kanban tasks
ALTER TABLE public.document_metadata
  ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES public.kanban_tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_document_metadata_task_id ON public.document_metadata(task_id);