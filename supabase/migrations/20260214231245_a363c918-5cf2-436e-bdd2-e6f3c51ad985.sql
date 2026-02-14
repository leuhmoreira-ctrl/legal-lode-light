
-- Add event_category column to kanban_tasks for proper event classification
ALTER TABLE public.kanban_tasks 
ADD COLUMN event_category text NOT NULL DEFAULT 'escritorio';

-- Set existing tasks with processo_id as processual
UPDATE public.kanban_tasks SET event_category = 'processual' WHERE processo_id IS NOT NULL;

-- Create index for filtering by category
CREATE INDEX idx_kanban_tasks_event_category ON public.kanban_tasks(event_category);
