import { useEffect, useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, X, Filter, Star, List, Layout } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { NovaTarefaDialog } from "@/components/NovaTarefaDialog";
import { TaskDetailModal } from "@/components/TaskDetailModal";
import { useAnimationOrigin } from "@/contexts/AnimationOriginContext";
import { KanbanCard } from "@/components/kanban/KanbanCard";
import { KanbanColumn } from "@/components/kanban/KanbanColumn";

import { KanbanTask, TaskActivity, ViewMode, KANBAN_COLUMNS as COLUMNS } from "@/types/kanban";
import { getStageEntryDate, getTaskStartDate, getTaskCompletionDate } from "@/utils/kanbanUtils";

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
  const { setOrigin } = useAnimationOrigin();
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroProcesso, setFiltroProcesso] = useState("");
  const [processos, setProcessos] = useState<{ id: string; numero: string }[]>([]);
  const [processoMap, setProcessoMap] = useState<ProcessoMap>({});
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KanbanTask | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("normal");

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
       // Fetch activities for enriched data
       const taskIds = data.map(t => t.id);
       let activities: TaskActivity[] = [];
       if (taskIds.length > 0) {
          const { data: actData } = await supabase
             .from('task_activities')
             .select('*')
             .in('task_id', taskIds)
             .eq('action_type', 'status_changed');
          activities = (actData as TaskActivity[]) || [];
       }

      setTasks(data.map((t) => {
        const stageEntryDate = getStageEntryDate(t.id, t.status, activities);
        const startedAt = getTaskStartDate(t.id, activities);
        const completedAt = getTaskCompletionDate(t.id, activities);

        return {
          ...t,
          processo: t.processo_id ? processoMap[t.processo_id] || null : null,
          stage_entry_date: stageEntryDate || t.created_at,
          started_at: startedAt,
          completed_at: completedAt
        };
      }) as KanbanTask[]);
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

  // Migrate 'review' tasks to 'in_progress'
  useEffect(() => {
    const migrateReviewTasks = async () => {
       const { error } = await supabase
          .from('kanban_tasks')
          .update({ status: 'in_progress' })
          .eq('status', 'review');
       if (error) {
         console.error("Error migrating review tasks", error);
       }
    };
    migrateReviewTasks();
  }, []);

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

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === draggableId ? { ...t, status: newStatus, position_index: newPosition } : t))
    );

    await supabase
      .from("kanban_tasks")
      .update({ status: newStatus, position_index: newPosition })
      .eq("id", draggableId);
  };


  const handleTaskReorder = useCallback(async (taskId: string, newStatus: string, newIndex: number) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const oldStatus = task.status;

    // Create a new array of tasks
    let newTasks = tasks.filter(t => t.id !== taskId);

    // Group by status
    const tasksByStatus: Record<string, KanbanTask[]> = {
      todo: [],
      in_progress: [],
      done: []
    };

    newTasks.forEach(t => {
      if (tasksByStatus[t.status]) {
        tasksByStatus[t.status].push(t);
      } else {
        // Fallback for unknown status
        if (!tasksByStatus['todo']) tasksByStatus['todo'] = [];
        tasksByStatus['todo'].push(t);
      }
    });

    // Sort by current index to ensure stability
    Object.keys(tasksByStatus).forEach(s => {
      tasksByStatus[s].sort((a, b) => a.position_index - b.position_index);
    });

    // Insert task into new column
    if (!tasksByStatus[newStatus]) tasksByStatus[newStatus] = [];

    // Clamp index
    const targetIndex = Math.max(0, Math.min(newIndex, tasksByStatus[newStatus].length));

    tasksByStatus[newStatus].splice(targetIndex, 0, { ...task, status: newStatus, position_index: targetIndex });

    // Re-index and collect updates
    const updates: { id: string, position_index: number, status: string }[] = [];

    // Helper to re-index a column
    const reindexColumn = (status: string) => {
      tasksByStatus[status].forEach((t, idx) => {
        t.position_index = idx;
        updates.push({ id: t.id, position_index: idx, status: status });
      });
    };

    reindexColumn(oldStatus);
    if (newStatus !== oldStatus) reindexColumn(newStatus);

    // Update local state
    const flatTasks = Object.values(tasksByStatus).flat();
    setTasks(flatTasks);

    // Persist to Supabase
    // We only need to update the tasks that changed index or status
    // Using upsert for batch update
    if (updates.length > 0) {
      const { error } = await supabase
        .from("kanban_tasks")
        // @ts-expect-error - upsert parcial com id existente
        .upsert(updates.map(u => ({
          id: u.id,
          position_index: u.position_index,
          status: u.status,
          updated_at: new Date().toISOString()
        })));

      if (error) {
        console.error("Error reordering tasks:", error);
        toast({ title: "Erro ao salvar ordenação", variant: "destructive" });
        loadTasks(); // Revert
      }
    }
  }, [tasks, loadTasks, toast]);

  const handleMoveTask = async (taskId: string, direction: 'left' | 'right') => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const currentIndex = COLUMNS.findIndex(c => c.id === task.status);
    let newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex >= 0 && newIndex < COLUMNS.length) {
       const newStatus = COLUMNS[newIndex].id;
       // Optimistic update
       setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

       const { error } = await supabase.from('kanban_tasks').update({ status: newStatus }).eq('id', taskId);
       if (!error) {
         toast({ title: `Tarefa movida para ${COLUMNS[newIndex].title}` });
       }
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    // Move to Done
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'done' } : t));
    await supabase.from('kanban_tasks').update({ status: 'done' }).eq('id', taskId);
    toast({ title: "Tarefa concluída! 🎉" });
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
      let status = task.status;
      if (status === 'review') status = 'in_progress';

      if (grouped[status]) {
        grouped[status].push(task);
      } else if (COLUMNS.some(c => c.id === status)) {
         grouped[status].push(task);
      } else {
         if (grouped['todo']) grouped['todo'].push(task);
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
          <div className="flex items-center gap-4">
             <div className="flex bg-muted p-1 rounded-lg border">
                <Button
                   variant={viewMode === 'compact' ? 'secondary' : 'ghost'}
                   size="icon"
                   className="h-7 w-7"
                   onClick={() => setViewMode('compact')}
                   title="Modo Compacto"
                >
                   <List className="w-4 h-4" />
                </Button>
                <Button
                   variant={viewMode === 'normal' ? 'secondary' : 'ghost'}
                   size="icon"
                   className="h-7 w-7"
                   onClick={() => setViewMode('normal')}
                   title="Modo Normal"
                >
                   <Layout className="w-4 h-4" />
                </Button>
              </div>
             <NovaTarefaDialog onSuccess={() => { loadTasks(); loadProcessos(); }} />
          </div>
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
                  <Badge key={t.id} variant="outline" className="cursor-pointer text-xs gap-1.5 py-1.5 bg-white" onClick={() => setSelectedTaskId(t.id)}>
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-250px)] min-h-[500px]">
              {COLUMNS.map((col) => (
                <div key={col.id} className="h-full">
                  <KanbanColumn
                    id={col.id}
                    title={col.title}
                    bgColor={col.bgColor}
                    borderColor={col.borderColor}
                    count={tasksByStatus[col.id]?.length || 0}
                    totalTasks={tasksFilteredByProcess.length}
                  >
                     <Droppable droppableId={col.id}>
                        {(provided, snapshot) => (
                           <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={cn(
                                 "space-y-3 min-h-[100px] transition-colors rounded-lg",
                                 snapshot.isDraggingOver && "bg-black/5"
                              )}
                           >
                              {tasksByStatus[col.id]?.map((task, index) => (
                                 <Draggable key={task.id} draggableId={task.id} index={index}>
                                    {(provided, snapshot) => (
                                       <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          style={provided.draggableProps.style}
                                       >
                                          <KanbanCard
                                             task={task}
                                             index={index}
                                             viewMode={viewMode}
                                             isDragging={snapshot.isDragging}
                                             onEdit={(id, e) => {
                                                e.stopPropagation();
                                                setOrigin({ x: e.clientX, y: e.clientY });
                                                setSelectedTaskId(id);
                                             }}
                                             onDelete={(task, e) => {
                                                e.stopPropagation();
                                                setOrigin({ x: e.clientX, y: e.clientY });
                                                setDeleteTarget(task);
                                             }}
                                             onToggleToday={async (task, e) => {
                                                e.stopPropagation();
                                                const newVal = !task.marked_for_today;
                                                setTasks(prev => prev.map(t => t.id === task.id ? { ...t, marked_for_today: newVal, marked_for_today_at: newVal ? new Date().toISOString() : null } : t));
                                                await supabase.from("kanban_tasks").update({ marked_for_today: newVal, marked_for_today_at: newVal ? new Date().toISOString() : null }).eq("id", task.id);
                                             }}
                                             onMove={handleMoveTask}
                                             onComplete={handleCompleteTask}
                                             onClick={() => setSelectedTaskId(task.id)}
                                             dragHandleProps={provided.dragHandleProps}
                                             teamMembers={teamMembers}
                                             canDelete={canDelete(task)}
                                          />
                                       </div>
                                    )}
                                 </Draggable>
                              ))}
                              {provided.placeholder}
                           </div>
                        )}
                     </Droppable>
                  </KanbanColumn>
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
