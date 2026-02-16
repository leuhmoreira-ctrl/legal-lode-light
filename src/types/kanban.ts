export interface KanbanTask {
  id: string;
  title: string;
  description: string | null;
  processo_id: string | null;
  assigned_to: string | null;
  status: string;
  priority: string;
  position_index: number;
  due_date: string | null;
  user_id: string;
  created_at: string;
  marked_for_today: boolean;
  marked_for_today_at: string | null;
  observacoes: string | null;
  processo?: { id: string; numero: string; cliente: string } | null;

  // Calculated fields for UI
  stage_entry_date?: string; // When the task entered the current stage
  started_at?: string; // When the task first moved to 'in_progress'
  completed_at?: string; // When the task moved to 'done'
}

export interface TaskActivity {
  id: string;
  action_type: string;
  old_value: string | null;
  new_value: string | null;
  user_id: string | null;
  created_at: string;
  task_id: string;
}

export type KanbanColumnId = 'todo' | 'in_progress' | 'done';

export type ViewMode = 'compact' | 'normal' | 'expanded';

export const KANBAN_COLUMNS: { id: KanbanColumnId; title: string; bgColor: string; borderColor: string }[] = [
  { id: "todo", title: "A Fazer", bgColor: "bg-[#F8F9FA] dark:bg-[#1C1C1E]", borderColor: "border-t-[#007AFF]" },
  { id: "in_progress", title: "Em Andamento", bgColor: "bg-[#FFF8E1] dark:bg-[#2A2520]", borderColor: "border-t-[#FF9500]" },
  { id: "done", title: "Concluído", bgColor: "bg-[#E8F5E9] dark:bg-[#1E2A20]", borderColor: "border-t-[#34C759]" },
];
