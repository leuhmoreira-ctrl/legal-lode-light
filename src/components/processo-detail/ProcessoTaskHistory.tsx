import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/contexts/PermissionsContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, PlusCircle, Edit3, UserCheck, MessageSquare } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";

interface Activity {
  id: string;
  task_id: string;
  action_type: string;
  old_value: string | null;
  new_value: string | null;
  user_id: string | null;
  created_at: string;
  task_title?: string;
}

interface ProcessoTaskHistoryProps {
  processoId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const actionConfig: Record<string, { icon: typeof PlusCircle; label: string; color: string }> = {
  created: { icon: PlusCircle, label: "Tarefa criada", color: "text-primary" },
  status_changed: { icon: CheckCircle2, label: "Status alterado", color: "text-[hsl(152,60%,40%)]" },
  assigned_changed: { icon: UserCheck, label: "Responsável alterado", color: "text-[hsl(38,92%,50%)]" },
  comment_added: { icon: MessageSquare, label: "Comentário", color: "text-muted-foreground" },
};

export function ProcessoTaskHistory({ processoId, open, onOpenChange }: ProcessoTaskHistoryProps) {
  const { teamMembers } = usePermissions();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(30);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      // Get task IDs for this processo
      const { data: tasks } = await supabase
        .from("kanban_tasks")
        .select("id, title")
        .eq("processo_id", processoId);

      if (!tasks || tasks.length === 0) {
        setActivities([]);
        setLoading(false);
        return;
      }

      const taskMap = Object.fromEntries(tasks.map((t) => [t.id, t.title]));
      const taskIds = tasks.map((t) => t.id);

      const { data: acts } = await supabase
        .from("task_activities")
        .select("*")
        .in("task_id", taskIds)
        .order("created_at", { ascending: false })
        .limit(limit);

      setActivities(
        (acts || []).map((a) => ({ ...a, task_title: taskMap[a.task_id] || "Tarefa removida" }))
      );
      setLoading(false);
    };
    load();
  }, [processoId, open, limit]);

  const getMemberName = (id: string | null) => teamMembers.find((m) => m.id === id)?.full_name || "Sistema";

  const formatDateHeader = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return "Hoje";
    if (isYesterday(d)) return "Ontem";
    return format(d, "dd/MM/yyyy");
  };

  // Group by date
  const grouped = activities.reduce<Record<string, Activity[]>>((acc, act) => {
    const key = format(new Date(act.created_at), "yyyy-MM-dd");
    if (!acc[key]) acc[key] = [];
    acc[key].push(act);
    return acc;
  }, {});

  const statusLabels: Record<string, string> = {
    todo: "A Fazer", in_progress: "Em Andamento", review: "Revisão", done: "Concluída",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de Tarefas</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma atividade registrada.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([dateKey, acts]) => (
              <div key={dateKey}>
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                  🕐 {formatDateHeader(acts[0].created_at)}, {format(new Date(acts[0].created_at), "dd/MM/yyyy")}
                </p>
                <div className="space-y-2 pl-3 border-l-2 border-border">
                  {acts.map((act) => {
                    const config = actionConfig[act.action_type] || actionConfig.created;
                    const Icon = config.icon;
                    return (
                      <div key={act.id} className="pl-3 py-1.5">
                        <div className="flex items-start gap-2">
                          <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.color}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{config.label}</p>
                            <p className="text-xs text-muted-foreground">"{act.task_title}"</p>
                            {act.action_type === "status_changed" && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {statusLabels[act.old_value || ""] || act.old_value} → {statusLabels[act.new_value || ""] || act.new_value}
                              </p>
                            )}
                            {act.action_type === "assigned_changed" && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {getMemberName(act.old_value)} → {getMemberName(act.new_value)}
                              </p>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Por: {getMemberName(act.user_id)} • {format(new Date(act.created_at), "HH:mm")}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {activities.length >= limit && (
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setLimit((l) => l + 30)}>
                Carregar mais antigas...
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
