import { useEffect, useState, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { GripVertical, User, Calendar, Loader2, Link2, X, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { NovaTarefaDialog } from "@/components/NovaTarefaDialog";
import { TaskDetailModal } from "@/components/TaskDetailModal";

const COLUMNS = [
  { id: "todo", title: "A Fazer", color: "bg-muted-foreground" },
  { id: "in_progress", title: "Em Andamento", color: "bg-warning" },
  { id: "review", title: "Revisão", color: "bg-primary" },
  { id: "done", title: "Concluído", color: "bg-success" },
];

const priorityStyle: Record<string, string> = {
  high: "urgency-high",
  medium: "urgency-medium",
  low: "urgency-low",
};

const priorityLabel: Record<string, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

interface KanbanTask {
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
  processo?: { id: string; numero: string; cliente: string } | null;
}

interface ProcessoMap {
  [id: string]: { id: string; numero: string; cliente: string };
}

interface KanbanProps {
  personalOnly?: boolean;
}

export default function Kanban({ personalOnly = false }: KanbanProps) {
  const { user } = useAuth();
  const { teamMembers } = usePermissions();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroProcesso, setFiltroProcesso] = useState("");
  const [processos, setProcessos] = useState<{ id: string; numero: string }[]>([]);
  const [processoMap, setProcessoMap] = useState<ProcessoMap>({});
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const loadProcessos = useCallback(async () => {
    const { data } = await supabase
      .from("processos")
      .select("id, numero, cliente")
      .order("created_at", { ascending: false });
    if (data) {
      setProcessos(data);
      const map: ProcessoMap = {};
      data.forEach((p) => { map[p.id] = p; });
      setProcessoMap(map);
    }
  }, []);

  const loadTasks = useCallback(async () => {
    let query = supabase
      .from("kanban_tasks")
      .select("*")
      .order("position_index", { ascending: true });

    if (personalOnly && user) {
      query = query.or(`assigned_to.eq.${user.id},user_id.eq.${user.id}`);
    }

    const { data, error } = await query;
    if (!error && data) {
      setTasks(data.map((t) => ({
        ...t,
        processo: t.processo_id ? processoMap[t.processo_id] || null : null,
      })) as KanbanTask[]);
    }
    setLoading(false);
  }, [processoMap, personalOnly, user]);

  useEffect(() => {
    loadProcessos();
  }, [loadProcessos]);

  useEffect(() => {
    loadTasks();
    const channel = supabase
      .channel("kanban-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "kanban_tasks" }, () => loadTasks())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadTasks]);

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;
    const newPosition = destination.index;

    setTasks((prev) =>
      prev.map((t) => (t.id === draggableId ? { ...t, status: newStatus, position_index: newPosition } : t))
    );

    await supabase
      .from("kanban_tasks")
      .update({ status: newStatus, position_index: newPosition })
      .eq("id", draggableId);
  };

  const getTasksByStatus = (status: string) => {
    let filtered = tasks.filter((t) => t.status === status);
    if (filtroProcesso) {
      filtered = filtered.filter((t) => t.processo_id === filtroProcesso);
    }
    return filtered;
  };

  const getMemberName = (id: string | null) => teamMembers.find((m) => m.id === id)?.full_name || "—";

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-up">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {personalOnly ? "Minhas Tarefas" : "Tarefas do Escritório"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {tasks.filter((t) => t.status !== "done").length} tarefas pendentes
              {personalOnly ? " atribuídas a você" : " no total"}
            </p>
          </div>
          <NovaTarefaDialog onSuccess={() => { loadTasks(); loadProcessos(); }} />
        </div>

        {/* Process filter */}
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filtroProcesso} onValueChange={setFiltroProcesso}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Filtrar por processo..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os processos</SelectItem>
              {processos.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.numero}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filtroProcesso && filtroProcesso !== "all" && (
            <Button variant="ghost" size="sm" onClick={() => setFiltroProcesso("")}>
              <X className="w-4 h-4 mr-1" /> Limpar
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {COLUMNS.map((col) => (
                <div key={col.id} className="kanban-column">
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                    <h3 className="text-sm font-semibold text-foreground">{col.title}</h3>
                    <Badge variant="secondary" className="text-[10px] ml-auto">
                      {getTasksByStatus(col.id).length}
                    </Badge>
                  </div>
                  <Droppable droppableId={col.id}>
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3 min-h-[100px]">
                        {getTasksByStatus(col.id).map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided) => (
                              <div ref={provided.innerRef} {...provided.draggableProps}>
                                <Card className="p-3.5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedTaskId(task.id)}>
                                  <div className="flex items-start gap-2">
                                    <div {...provided.dragHandleProps}>
                                      <GripVertical className="w-4 h-4 text-muted-foreground/40 mt-0.5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-foreground">{task.title}</p>

                                      {task.processo && (
                                        <div className="flex items-center gap-1 mt-1">
                                          <Link2 className="w-3 h-3 text-primary" />
                                          <span className="text-[11px] text-primary font-medium truncate">
                                            {task.processo.numero}
                                          </span>
                                        </div>
                                      )}

                                      {task.description && (
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                                      )}
                                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${priorityStyle[task.priority]}`}>
                                          {priorityLabel[task.priority]}
                                        </span>
                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                          <User className="w-3 h-3" />
                                          {getMemberName(task.assigned_to)}
                                        </div>
                                        {task.due_date && (
                                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
                                            <Calendar className="w-3 h-3" />
                                            {format(new Date(task.due_date), "dd/MM")}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </Card>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        )}

        <TaskDetailModal
          taskId={selectedTaskId}
          open={!!selectedTaskId}
          onOpenChange={(open) => { if (!open) setSelectedTaskId(null); }}
          onUpdate={loadTasks}
        />
      </div>
    </AppLayout>
  );
}
