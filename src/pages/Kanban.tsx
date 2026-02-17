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
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, X, Filter, Star, List, Layout } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { NovaTarefaDialog } from "@/components/NovaTarefaDialog";
import { TaskDetailModal } from "@/components/TaskDetailModal";
import { KanbanCard } from "@/components/kanban/KanbanCard";
import { KanbanColumn } from "@/components/kanban/KanbanColumn";
import { useIsMobile } from "@/hooks/use-mobile";
import { PageHeader } from "@/components/layout/PageHeader";

import { KanbanTask, TaskActivity, ViewMode, KANBAN_COLUMNS as COLUMNS, KanbanColumnId } from "@/types/kanban";
import { getStageEntryDate, getTaskStartDate, getTaskCompletionDate } from "@/utils/kanbanUtils";

interface ProcessoMap {
  [id: string]: { id: string; numero: string; cliente: string };
}

interface KanbanProps {
  personalOnly?: boolean;
}

export default function Kanban({ personalOnly = false }: KanbanProps) {
  const isMobile = useIsMobile();
  const [isPhone, setIsPhone] = useState(false);
  const { user } = useAuth();
  const { teamMembers, isAdmin } = usePermissions();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroProcesso, setFiltroProcesso] = useState("all");
  const [processos, setProcessos] = useState<{ id: string; numero: string }[]>([]);
  const [processoMap, setProcessoMap] = useState<ProcessoMap>({});
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KanbanTask | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("normal");
  const [autoCompactApplied, setAutoCompactApplied] = useState(false);
  const [mobileColumn, setMobileColumn] = useState<KanbanColumnId>("todo");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

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

  useEffect(() => {
    if (isMobile && !autoCompactApplied) {
      setViewMode("compact");
      setAutoCompactApplied(true);
    }
  }, [isMobile, autoCompactApplied]);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 480px)");
    const onChange = () => setIsPhone(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!isPhone) setMobileFilterOpen(false);
  }, [isPhone]);

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

  const activeProcess = useMemo(
    () => processos.find((p) => p.id === filtroProcesso) || null,
    [processos, filtroProcesso]
  );

  const columnsToRender = useMemo(
    () => (isPhone ? COLUMNS.filter((col) => col.id === mobileColumn) : COLUMNS),
    [isPhone, mobileColumn]
  );

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
      <div className="page-shell">
        <PageHeader
          title={personalOnly ? "Minhas Tarefas" : "Tarefas do Escritório"}
          subtitle={`${pendingTasksCount} pendentes${personalOnly ? " atribuídas a você" : " no escritório"}`}
          className="gap-2"
          actions={
            <div className="flex w-full sm:w-auto items-center justify-between gap-2 sm:justify-start">
              <div className="inline-flex bg-muted p-1 rounded-lg border">
                <Button
                  variant={viewMode === "compact" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode("compact")}
                  title="Lista"
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "normal" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode("normal")}
                  title="Quadro"
                >
                  <Layout className="w-4 h-4" />
                </Button>
              </div>
              <NovaTarefaDialog
                triggerLabel={isPhone ? "Nova" : "Nova Tarefa"}
                triggerClassName={cn("w-auto h-9 px-3 text-[13px]", !isPhone && "h-10 px-4")}
                onSuccess={() => { loadTasks(); loadProcessos(); }}
              />
            </div>
          }
        />

        {/* Process filter */}
        <div className="page-surface">
          {isPhone ? (
            <div className="flex items-center gap-2">
              <Drawer open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
                <DrawerTrigger asChild>
                  <Button variant="outline" className="touch-target">
                    <Filter className="w-4 h-4 mr-2" />
                    Filtrar
                  </Button>
                </DrawerTrigger>
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle>Filtrar por processo</DrawerTitle>
                    <DrawerDescription>
                      Escolha um processo para reduzir o quadro ao essencial.
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="px-4 pb-2 space-y-2 max-h-[56dvh] overflow-y-auto">
                    <button
                      onClick={() => {
                        setFiltroProcesso("all");
                        setMobileFilterOpen(false);
                      }}
                      className={cn(
                        "w-full rounded-lg border text-left px-3 py-2.5 text-[13px] transition-colors",
                        !filtroProcesso || filtroProcesso === "all"
                          ? "border-primary/30 bg-primary/5 text-foreground"
                          : "border-border bg-background text-muted-foreground"
                      )}
                    >
                      Todos os processos
                    </button>
                    {processos.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setFiltroProcesso(p.id);
                          setMobileFilterOpen(false);
                        }}
                        className={cn(
                          "w-full rounded-lg border text-left px-3 py-2.5 text-[13px] transition-colors",
                          filtroProcesso === p.id
                            ? "border-primary/30 bg-primary/5 text-foreground"
                            : "border-border bg-background text-muted-foreground"
                        )}
                      >
                        {p.numero}
                      </button>
                    ))}
                  </div>
                  <DrawerFooter>
                    <DrawerClose asChild>
                      <Button variant="outline">Fechar</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>

              {activeProcess ? (
                <Badge variant="outline" className="h-9 px-2.5 text-[12px] gap-1.5">
                  Processo: {activeProcess.numero}
                  <button
                    onClick={() => setFiltroProcesso("all")}
                    className="inline-flex items-center justify-center rounded-full hover:bg-muted p-0.5"
                    aria-label="Limpar filtro"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ) : (
                <span className="text-[12px] text-muted-foreground">Sem filtros ativos</span>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={filtroProcesso} onValueChange={setFiltroProcesso}>
                <SelectTrigger className="w-full sm:w-72 h-10 touch-target">
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
                <Button variant="ghost" size="sm" className="w-full sm:w-auto" onClick={() => setFiltroProcesso("all")}>
                  <X className="w-4 h-4 mr-1" /> Limpar
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Para Fazer Hoje */}
        {(() => {
          if (todayTasks.length === 0) return null;
          return (
            <Card className="p-3 sm:p-4 border-yellow-400/30 bg-yellow-50/20 dark:bg-yellow-900/10">
              <div className="flex items-center justify-between mb-2.5 sm:mb-3">
                <h3 className="text-[13px] sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  Para Fazer Hoje ({todayTasks.length})
                </h3>
                <Button variant="ghost" size="sm" className="text-[12px] sm:text-[13px] px-2.5" onClick={async () => {
                  await supabase.from("kanban_tasks").update({ marked_for_today: false, marked_for_today_at: null }).in("id", todayTasks.map(t => t.id));
                  loadTasks();
                }}>Limpar lista</Button>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {todayTasks.map((t) => (
                  <Badge key={t.id} variant="outline" className="cursor-pointer text-[11px] sm:text-xs gap-1 py-1 bg-white" onClick={() => setSelectedTaskId(t.id)}>
                    <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-yellow-400 text-yellow-400" />
                    {t.title}
                  </Badge>
                ))}
              </div>
            </Card>
          );
        })()}

        {!loading && isPhone && (
          <div className="inline-segmented">
            {COLUMNS.map((col) => {
              const count = tasksByStatus[col.id]?.length || 0;
              return (
                <button
                  key={col.id}
                  data-active={mobileColumn === col.id}
                  onClick={() => setMobileColumn(col.id)}
                  className="flex items-center justify-center gap-1.5 px-1"
                >
                  <span className="truncate">{col.title}</span>
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold bg-black/10 dark:bg-white/15">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div
              className={cn(
                "gap-4 lg:gap-6",
                isPhone
                  ? "grid grid-cols-1 min-h-[320px]"
                  : isMobile
                    ? "grid grid-cols-2 min-h-[420px]"
                    : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 min-h-[500px] xl:h-[calc(100vh-250px)]"
              )}
            >
              {columnsToRender.map((col) => {
                const colTasks = tasksByStatus[col.id] || [];

                return (
                  <div key={col.id} className="h-full min-h-0">
                    <KanbanColumn
                      id={col.id}
                      title={col.title}
                      bgColor={col.bgColor}
                      borderColor={col.borderColor}
                      count={colTasks.length}
                      totalTasks={tasksFilteredByProcess.length}
                    >
                      <Droppable droppableId={col.id}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={cn(
                              "space-y-2 sm:space-y-3 min-h-[80px] transition-colors rounded-lg",
                              snapshot.isDraggingOver && "bg-black/5"
                            )}
                          >
                            {colTasks.map((task, index) => (
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
                                        setSelectedTaskId(id);
                                      }}
                                      onDelete={(task, e) => {
                                        e.stopPropagation();
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
                            {colTasks.length === 0 && (
                              <div className="rounded-lg border border-dashed border-border/80 bg-background/70 p-4 text-center">
                                <p className="text-[13px] font-medium text-foreground">
                                  Sem tarefas em {col.title}
                                </p>
                                <p className="text-[12px] text-muted-foreground mt-1">
                                  {col.id === "todo"
                                    ? "Toque em Nova para criar a próxima tarefa."
                                    : "Quando houver movimentação, elas aparecem aqui."}
                                </p>
                              </div>
                            )}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </KanbanColumn>
                  </div>
                );
              })}
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
