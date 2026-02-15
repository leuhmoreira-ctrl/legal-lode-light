import { useEffect, useState, useCallback, useMemo } from "react";
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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GripVertical, User, Calendar, Loader2, Link2, X, Filter, MoreVertical, Trash2, Edit, ArrowRight, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { NovaTarefaDialog } from "@/components/NovaTarefaDialog";
import { TaskDetailModal } from "@/components/TaskDetailModal";
import { UserAvatar } from "@/components/UserAvatar";

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
  marked_for_today: boolean;
  marked_for_today_at: string | null;
  observacoes: string | null;
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
  const { teamMembers, isAdmin } = usePermissions();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroProcesso, setFiltroProcesso] = useState("");
  const [processos, setProcessos] = useState<{ id: string; numero: string }[]>([]);
  const [processoMap, setProcessoMap] = useState<ProcessoMap>({});
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KanbanTask | null>(null);

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

  // Auto-clear "Para Fazer Hoje" at midnight
  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();

    const timeout = setTimeout(async () => {
      const todayTasks = tasks.filter(t => t.marked_for_today);
      if (todayTasks.length > 0) {
        await supabase
          .from("kanban_tasks")
          .update({ marked_for_today: false, marked_for_today_at: null })
          .in("id", todayTasks.map(t => t.id));
        loadTasks();
      }
    }, msUntilMidnight);

    return () => clearTimeout(timeout);
  }, [tasks, loadTasks]);

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

  const tasksFilteredByProcess = useMemo(() => {
    if (!filtroProcesso || filtroProcesso === "all") return tasks;
    return tasks.filter((t) => t.processo_id === filtroProcesso);
  }, [tasks, filtroProcesso]);

  const tasksByStatus = useMemo(() => {
    const grouped = COLUMNS.reduce((acc, col) => {
      acc[col.id] = [];
      return acc;
    }, {} as Record<string, KanbanTask[]>);

    tasksFilteredByProcess.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });
    return grouped;
  }, [tasksFilteredByProcess]);

  const todayTasks = useMemo(() => {
    return tasks.filter((t) => t.marked_for_today && t.status !== "done");
  }, [tasks]);

  const pendingTasksCount = useMemo(() => {
    return tasks.filter((t) => t.status !== "done").length;
  }, [tasks]);

  const getMember = (id: string | null) => teamMembers.find((m) => m.id === id);

  const canDelete = (task: KanbanTask) => task.user_id === user?.id || isAdmin;

  const handleDeleteTask = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from("kanban_tasks").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      setTasks((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      toast({ title: "✅ Tarefa excluída com sucesso" });
      onUpdate();
    } catch (err: any) {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  const onUpdate = () => { loadTasks(); loadProcessos(); };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-up">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {personalOnly ? "Minhas Tarefas" : "Tarefas do Escritório"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {pendingTasksCount} tarefas pendentes
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

        {/* Para Fazer Hoje */}
        {(() => {
          if (todayTasks.length === 0) return null;
          return (
            <Card className="p-4 border-yellow-400/30 bg-yellow-50/20 dark:bg-yellow-900/10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  Para Fazer Hoje ({todayTasks.length})
                </h3>
                <Button variant="ghost" size="sm" className="text-xs" onClick={async () => {
                  await supabase.from("kanban_tasks").update({ marked_for_today: false, marked_for_today_at: null }).in("id", todayTasks.map(t => t.id));
                  loadTasks();
                }}>Limpar lista</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {todayTasks.map((t) => (
                  <Badge key={t.id} variant="outline" className="cursor-pointer text-xs gap-1.5 py-1.5" onClick={() => setSelectedTaskId(t.id)}>
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    {t.title}
                  </Badge>
                ))}
              </div>
            </Card>
          );
        })()}

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
                      {tasksByStatus[col.id].length}
                    </Badge>
                  </div>
                  <Droppable droppableId={col.id}>
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3 min-h-[100px]">
                        {tasksByStatus[col.id].map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided) => (
                              <div ref={provided.innerRef} {...provided.draggableProps}>
                                <Card className={cn("p-3.5 hover:shadow-md transition-shadow cursor-pointer group", task.marked_for_today && "ring-1 ring-yellow-400/50 bg-yellow-50/30 dark:bg-yellow-900/10")} onClick={() => setSelectedTaskId(task.id)}>
                                  <div className="flex items-start gap-2">
                                    <div {...provided.dragHandleProps}>
                                      <GripVertical className="w-4 h-4 text-muted-foreground/40 mt-0.5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-1">
                                        <div className="flex items-center gap-1.5">
                                          <button
                                            className="shrink-0"
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              const newVal = !task.marked_for_today;
                                              setTasks(prev => prev.map(t => t.id === task.id ? { ...t, marked_for_today: newVal, marked_for_today_at: newVal ? new Date().toISOString() : null } : t));
                                              await supabase.from("kanban_tasks").update({ marked_for_today: newVal, marked_for_today_at: newVal ? new Date().toISOString() : null }).eq("id", task.id);
                                            }}
                                            title={task.marked_for_today ? "Desmarcar" : "Marcar para hoje"}
                                          >
                                            <Star className={cn("w-3.5 h-3.5", task.marked_for_today ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40")} />
                                          </button>
                                          <p className="text-sm font-medium text-foreground">{task.title}</p>
                                        </div>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <MoreVertical className="w-3.5 h-3.5" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenuItem onClick={() => setSelectedTaskId(task.id)}>
                                              <Edit className="w-3.5 h-3.5 mr-2" /> Editar tarefa
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={async () => {
                                              const newVal = !task.marked_for_today;
                                              setTasks(prev => prev.map(t => t.id === task.id ? { ...t, marked_for_today: newVal } : t));
                                              await supabase.from("kanban_tasks").update({ marked_for_today: newVal, marked_for_today_at: newVal ? new Date().toISOString() : null }).eq("id", task.id);
                                            }}>
                                              <Star className="w-3.5 h-3.5 mr-2" /> {task.marked_for_today ? "Desmarcar" : "⭐ Marcar para hoje"}
                                            </DropdownMenuItem>
                                            {canDelete(task) && (
                                              <DropdownMenuItem
                                                className="text-destructive focus:text-destructive"
                                                onClick={() => setDeleteTarget(task)}
                                              >
                                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir tarefa
                                              </DropdownMenuItem>
                                            )}
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>

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
                                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                          <UserAvatar
                                            name={getMember(task.assigned_to)?.full_name}
                                            avatarUrl={getMember(task.assigned_to)?.avatar_url}
                                            size="sm"
                                            className="w-4 h-4 text-[8px]"
                                          />
                                          {getMember(task.assigned_to)?.full_name.split(" ")[0] || "—"}
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
          onUpdate={onUpdate}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Tarefa?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a tarefa "<span className="font-medium">{deleteTarget?.title}</span>"? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {deleteTarget && (
              <div className="text-xs text-muted-foreground space-y-1 border rounded-lg p-3 bg-muted/30">
                {deleteTarget.processo && (
                  <p>📋 Processo: <span className="font-medium">{deleteTarget.processo.numero}</span></p>
                )}
                <p>👤 Responsável: <span className="font-medium">{getMember(deleteTarget.assigned_to)?.full_name || "—"}</span></p>
                <p>📅 Criada em: <span className="font-medium">{format(new Date(deleteTarget.created_at), "dd/MM/yyyy")}</span></p>
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteTask}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
