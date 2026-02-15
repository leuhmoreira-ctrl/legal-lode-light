import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, History, User, Calendar, AlertTriangle, CheckCircle2, Clock, Loader2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { TaskDetailModal } from "@/components/TaskDetailModal";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to: string | null;
  created_at: string;
}

interface ProcessoTarefasTabProps {
  processoId: string;
  onNewTask: () => void;
  onViewHistory: () => void;
  refreshKey?: number;
}

const priorityConfig: Record<string, { label: string; class: string }> = {
  high: { label: "Urgente", class: "bg-destructive/10 text-destructive border-destructive/20" },
  medium: { label: "Média", class: "bg-[hsl(38,92%,50%)]/10 text-[hsl(38,92%,50%)] border-[hsl(38,92%,50%)]/20" },
  low: { label: "Baixa", class: "bg-muted text-muted-foreground border-border" },
};

const statusConfig: Record<string, { label: string; icon: typeof Clock }> = {
  todo: { label: "A Fazer", icon: Clock },
  in_progress: { label: "Em Andamento", icon: Clock },
  review: { label: "Revisão", icon: AlertTriangle },
  done: { label: "Concluída", icon: CheckCircle2 },
};

export function ProcessoTarefasTab({ processoId, onNewTask, onViewHistory, refreshKey = 0 }: ProcessoTarefasTabProps) {
  const { user } = useAuth();
  const { teamMembers } = usePermissions();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ativas" | "concluidas" | "todas">("ativas");
  const [sortBy, setSortBy] = useState<"due_date" | "priority" | "created_at">("due_date");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("kanban_tasks")
      .select("id, title, description, status, priority, due_date, assigned_to, created_at")
      .eq("processo_id", processoId);

    if (filter === "ativas") query = query.neq("status", "done");
    else if (filter === "concluidas") query = query.eq("status", "done");

    const { data } = await query.order(sortBy === "priority" ? "priority" : sortBy, { ascending: sortBy === "due_date" });
    setTasks(data || []);
    setLoading(false);
  }, [processoId, filter, sortBy]);

  useEffect(() => { loadTasks(); }, [loadTasks, refreshKey]);

  const handleComplete = async (taskId: string) => {
    await supabase.from("kanban_tasks").update({ status: "done" }).eq("id", taskId);
    toast({ title: "✅ Tarefa concluída!" });
    loadTasks();
  };

  const getMemberName = (id: string | null) => teamMembers.find((m) => m.id === id)?.full_name || "—";

  const activeCount = tasks.filter((t) => t.status !== "done").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const urgentCount = tasks.filter((t) => t.priority === "high" && t.status !== "done").length;
  const nextDue = tasks
    .filter((t) => t.due_date && t.status !== "done")
    .sort((a, b) => (a.due_date! > b.due_date! ? 1 : -1))[0];

  return (
    <div className="space-y-4">
      {/* Stats card */}
      <Card className="p-4 bg-muted/30">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span>📊 <strong>{tasks.length}</strong> tarefas no total</span>
          <span>✓ <strong>{doneCount}</strong> concluídas ({tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0}%)</span>
          <span>⏳ <strong>{activeCount}</strong> ativas</span>
          {urgentCount > 0 && <span className="text-destructive">⚠️ <strong>{urgentCount}</strong> urgentes</span>}
          {nextDue?.due_date && <span>📅 Próxima: {format(new Date(nextDue.due_date), "dd/MM")}</span>}
        </div>
      </Card>

      {/* Actions + Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" className="gap-1.5" onClick={onNewTask}>
          <Plus className="w-3.5 h-3.5" /> Nova Tarefa
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onViewHistory}>
          <History className="w-3.5 h-3.5" /> Histórico
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex gap-1 bg-muted rounded-lg p-0.5">
            {(["ativas", "concluidas", "todas"] as const).map((f) => (
              <Button key={f} variant={filter === f ? "secondary" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setFilter(f)}>
                {f === "ativas" ? `Ativas (${activeCount})` : f === "concluidas" ? `Concluídas (${doneCount})` : `Todas (${tasks.length})`}
              </Button>
            ))}
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="due_date">Prazo</SelectItem>
              <SelectItem value="priority">Urgência</SelectItem>
              <SelectItem value="created_at">Data criação</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Nenhuma tarefa {filter === "ativas" ? "ativa" : filter === "concluidas" ? "concluída" : ""} para este processo.
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const status = statusConfig[task.status] || statusConfig.todo;
            const priority = priorityConfig[task.priority] || priorityConfig.medium;
            const StatusIcon = status.icon;

            return (
              <Card
                key={task.id}
                className="p-3 hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => setSelectedTaskId(task.id)}
              >
                <div className="flex items-start gap-3">
                  {task.status !== "done" && (
                    <Checkbox
                      className="mt-1"
                      checked={false}
                      onCheckedChange={(e) => {
                        e && handleComplete(task.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  {task.status === "done" && <CheckCircle2 className="w-4 h-4 text-[hsl(152,60%,40%)] mt-1 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {task.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="w-3 h-3" /> {getMemberName(task.assigned_to)}
                      </span>
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {format(new Date(task.due_date), "dd/MM")}
                        </span>
                      )}
                      <Badge variant="outline" className={`text-[10px] ${priority.class}`}>{priority.label}</Badge>
                      <Badge variant="outline" className="text-[10px]">
                        <StatusIcon className="w-2.5 h-2.5 mr-0.5" /> {status.label}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={(e) => { e.stopPropagation(); setSelectedTaskId(task.id); }}>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {/* Task Detail Modal */}
      <TaskDetailModal
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onOpenChange={(open) => { if (!open) setSelectedTaskId(null); }}
        onUpdate={loadTasks}
      />
    </div>
  );
}
