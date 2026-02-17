import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
import { Loader2, X, Filter, Star, List, Layout, ListChecks, PlayCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
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

type MoveSource = "dnd" | "arrow" | "sheet" | "undo" | "complete";

interface TaskMoveRecord {
  opId: string;
  taskId: string;
  fromStatus: KanbanColumnId;
  fromIndex: number;
  toStatus: KanbanColumnId;
  toIndex: number;
}

interface MovePlan {
  nextTasks: KanbanTask[];
  updates: { id: string; position_index: number; status: string; updated_at: string }[];
  record: Omit<TaskMoveRecord, "opId">;
}

const KANBAN_STATUS_ORDER: KanbanColumnId[] = ["todo", "in_progress", "done"];

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
  const [moveSheetTask, setMoveSheetTask] = useState<KanbanTask | null>(null);
  const [moveSheetOpen, setMoveSheetOpen] = useState(false);
  const lastUndoRef = useRef<TaskMoveRecord | null>(null);
  const latestOpByTaskRef = useRef<Record<string, string>>({});

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

  useEffect(() => {
    if (!isPhone) {
      setMoveSheetOpen(false);
      setMoveSheetTask(null);
    }
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

  const normalizeStatus = useCallback((status: string): KanbanColumnId => {
    if (status === "todo" || status === "in_progress" || status === "done") return status;
    if (status === "review") return "in_progress";
    return "todo";
  }, []);

  const getColumnTitle = useCallback(
    (status: KanbanColumnId) => COLUMNS.find((col) => col.id === status)?.title || "Coluna",
    []
  );

  const buildMovePlan = useCallback(
    (
      prevTasks: KanbanTask[],
      taskId: string,
      targetStatus: KanbanColumnId,
      targetIndex?: number
    ): MovePlan | null => {
      const task = prevTasks.find((t) => t.id === taskId);
      if (!task) return null;

      const columns: Record<KanbanColumnId, string[]> = {
        todo: [],
        in_progress: [],
        done: [],
      };
      const taskMap: Record<string, KanbanTask> = {};

      prevTasks.forEach((entry) => {
        const normalized = normalizeStatus(entry.status);
        columns[normalized].push(entry.id);
        taskMap[entry.id] = entry;
      });

      KANBAN_STATUS_ORDER.forEach((status) => {
        columns[status].sort((a, b) => taskMap[a].position_index - taskMap[b].position_index);
      });

      const fromStatus = normalizeStatus(task.status);
      const fromColumn = columns[fromStatus];
      const toColumn = columns[targetStatus];
      const fromIndex = fromColumn.indexOf(taskId);

      if (fromIndex < 0) return null;

      fromColumn.splice(fromIndex, 1);

      const requestedTarget = targetIndex ?? toColumn.length;
      let insertIndex = Math.max(0, Math.min(requestedTarget, toColumn.length));
      if (fromStatus === targetStatus && requestedTarget > fromIndex) {
        insertIndex = Math.max(0, insertIndex - 1);
      }

      if (fromStatus === targetStatus && insertIndex === fromIndex) return null;

      toColumn.splice(insertIndex, 0, taskId);

      const updateMap: Record<string, { status: KanbanColumnId; position_index: number }> = {};
      KANBAN_STATUS_ORDER.forEach((status) => {
        columns[status].forEach((id, idx) => {
          updateMap[id] = { status, position_index: idx };
        });
      });

      const updates: MovePlan["updates"] = [];
      const nextTasks = prevTasks.map((entry) => {
        const update = updateMap[entry.id];
        if (!update) return entry;

        const currentNormalized = normalizeStatus(entry.status);
        if (currentNormalized === update.status && entry.position_index === update.position_index) {
          return entry;
        }

        updates.push({
          id: entry.id,
          status: update.status,
          position_index: update.position_index,
          updated_at: new Date().toISOString(),
        });

        return { ...entry, status: update.status, position_index: update.position_index };
      });

      return {
        nextTasks,
        updates,
        record: {
          taskId,
          fromStatus,
          fromIndex,
          toStatus: targetStatus,
          toIndex: insertIndex,
        },
      };
    },
    [normalizeStatus]
  );

  const persistMove = useCallback(async (updates: MovePlan["updates"]) => {
    if (updates.length === 0) return { error: null };
    const { error } = await supabase
      .from("kanban_tasks")
      // @ts-expect-error - upsert parcial com id existente
      .upsert(updates);
    return { error };
  }, []);

  const applyTaskMove = useCallback(
    async ({
      taskId,
      toStatus,
      targetIndex,
      source,
      enableUndo = false,
      successTitle,
    }: {
      taskId: string;
      toStatus: KanbanColumnId;
      targetIndex?: number;
      source: MoveSource;
      enableUndo?: boolean;
      successTitle?: string;
    }) => {
      const opId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      let movePlan: MovePlan | null = null;

      setTasks((prev) => {
        movePlan = buildMovePlan(prev, taskId, toStatus, targetIndex);
        return movePlan ? movePlan.nextTasks : prev;
      });

      if (!movePlan) return;

      latestOpByTaskRef.current[taskId] = opId;
      const moveRecord: TaskMoveRecord = { opId, ...movePlan.record };

      if (!enableUndo && lastUndoRef.current?.taskId === taskId) {
        lastUndoRef.current = null;
      }

      if (enableUndo) {
        lastUndoRef.current = moveRecord;
        toast({
          title: `Movido para ${getColumnTitle(movePlan.record.toStatus)}`,
          duration: 4000,
          action: (
            <ToastAction
              altText="Desfazer"
              onClick={() => {
                if (!lastUndoRef.current || lastUndoRef.current.opId !== opId) return;
                const undoRecord = lastUndoRef.current;
                lastUndoRef.current = null;
                void applyTaskMove({
                  taskId: undoRecord.taskId,
                  toStatus: undoRecord.fromStatus,
                  targetIndex: undoRecord.fromIndex,
                  source: "undo",
                  enableUndo: false,
                  successTitle: "Movimentação desfeita",
                });
              }}
            >
              Desfazer
            </ToastAction>
          ),
        });
      }

      const { error } = await persistMove(movePlan.updates);
      if (error) {
        if (latestOpByTaskRef.current[taskId] !== opId) return;

        setTasks((prev) => {
          const rollbackPlan = buildMovePlan(
            prev,
            movePlan!.record.taskId,
            movePlan!.record.fromStatus,
            movePlan!.record.fromIndex
          );
          return rollbackPlan ? rollbackPlan.nextTasks : prev;
        });

        if (lastUndoRef.current?.opId === opId) {
          lastUndoRef.current = null;
        }

        toast({ title: "Não foi possível mover. Tente novamente.", variant: "destructive" });
        return;
      }

      if (source === "undo") {
        toast({ title: successTitle || "Movimentação desfeita" });
      } else if (source === "complete") {
        toast({ title: successTitle || "Tarefa concluída! 🎉" });
      }
    },
    [buildMovePlan, getColumnTitle, persistMove, toast]
  );

  const onDragEnd = useCallback(
    async (result: DropResult) => {
      if (!result.destination || isPhone) return;
      const { draggableId, destination } = result;
      const nextStatus = destination.droppableId as KanbanColumnId;
      if (!KANBAN_STATUS_ORDER.includes(nextStatus)) return;

      await applyTaskMove({
        taskId: draggableId,
        toStatus: nextStatus,
        targetIndex: destination.index,
        source: "dnd",
        enableUndo: false,
      });
    },
    [applyTaskMove, isPhone]
  );

  const getAdjacentStatus = useCallback(
    (status: KanbanColumnId, direction: "left" | "right"): KanbanColumnId | null => {
      const currentIndex = KANBAN_STATUS_ORDER.indexOf(status);
      const nextIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;
      if (nextIndex < 0 || nextIndex >= KANBAN_STATUS_ORDER.length) return null;
      return KANBAN_STATUS_ORDER[nextIndex];
    },
    []
  );

  const handleMoveTask = useCallback(
    async (taskId: string, direction: "left" | "right") => {
      const task = tasks.find((entry) => entry.id === taskId);
      if (!task) return;

      const currentStatus = normalizeStatus(task.status);
      const targetStatus = getAdjacentStatus(currentStatus, direction);

      if (!targetStatus) {
        toast({
          title: direction === "left" ? "Já está no início" : "Já está concluído",
          duration: 2000,
        });
        return;
      }

      await applyTaskMove({
        taskId,
        toStatus: targetStatus,
        source: "arrow",
        enableUndo: isPhone,
      });
    },
    [tasks, normalizeStatus, getAdjacentStatus, applyTaskMove, toast, isPhone]
  );

  const handleCompleteTask = useCallback(
    async (taskId: string) => {
      await applyTaskMove({
        taskId,
        toStatus: "done",
        source: "complete",
        enableUndo: isPhone,
      });
    },
    [applyTaskMove, isPhone]
  );

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

    KANBAN_STATUS_ORDER.forEach((status) => {
      grouped[status].sort((a, b) => a.position_index - b.position_index);
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

  const moveOptions = useMemo(
    () => [
      {
        status: "todo" as KanbanColumnId,
        title: "A Fazer",
        description: "Voltar etapa",
        icon: ListChecks,
      },
      {
        status: "in_progress" as KanbanColumnId,
        title: "Em andamento",
        description: "Próxima etapa",
        icon: PlayCircle,
      },
      {
        status: "done" as KanbanColumnId,
        title: "Concluído",
        description: "Finalizar",
        icon: CheckCircle2,
      },
    ],
    []
  );

  const openMoveSheet = useCallback(
    (task: KanbanTask) => {
      if (!isPhone) return;
      setMoveSheetTask(task);
      setMoveSheetOpen(true);
    },
    [isPhone]
  );

  const handleMoveFromSheet = useCallback(
    async (targetStatus: KanbanColumnId) => {
      if (!moveSheetTask) return;
      const currentStatus = normalizeStatus(moveSheetTask.status);
      if (currentStatus === targetStatus) return;
      setMoveSheetOpen(false);
      await applyTaskMove({
        taskId: moveSheetTask.id,
        toStatus: targetStatus,
        source: "sheet",
        enableUndo: true,
      });
      setMoveSheetTask(null);
    },
    [moveSheetTask, normalizeStatus, applyTaskMove]
  );

  const getMember = (id: string | null) => teamMembers.find((m) => m.id === id);

  const canDelete = useCallback(
    (task: KanbanTask) => task.user_id === user?.id || isAdmin,
    [user?.id, isAdmin]
  );

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

  const renderEmptyColumnState = useCallback((columnId: KanbanColumnId, title: string) => (
    <div className="rounded-lg border border-dashed border-border/80 bg-background/70 p-4 text-center">
      <p className="text-[13px] font-medium text-foreground">Sem tarefas em {title}</p>
      <p className="text-[12px] text-muted-foreground mt-1">
        {columnId === "todo"
          ? "Toque em Nova para criar a próxima tarefa."
          : "Quando houver movimentação, elas aparecem aqui."}
      </p>
    </div>
  ), []);

  const renderKanbanCard = useCallback(
    (
      task: KanbanTask,
      index: number,
      options?: { isDragging?: boolean; dragHandleProps?: any }
    ) => (
      <KanbanCard
        task={task}
        index={index}
        viewMode={viewMode}
        isDragging={options?.isDragging}
        onEdit={(id, e) => {
          e.stopPropagation();
          setSelectedTaskId(id);
        }}
        onDelete={(entry, e) => {
          e.stopPropagation();
          setDeleteTarget(entry);
        }}
        onToggleToday={async (entry, e) => {
          e.stopPropagation();
          const newVal = !entry.marked_for_today;
          setTasks((prev) =>
            prev.map((item) =>
              item.id === entry.id
                ? {
                    ...item,
                    marked_for_today: newVal,
                    marked_for_today_at: newVal ? new Date().toISOString() : null,
                  }
                : item
            )
          );
          await supabase
            .from("kanban_tasks")
            .update({
              marked_for_today: newVal,
              marked_for_today_at: newVal ? new Date().toISOString() : null,
            })
            .eq("id", entry.id);
        }}
        onMove={handleMoveTask}
        onComplete={handleCompleteTask}
        onClick={() => setSelectedTaskId(task.id)}
        dragHandleProps={options?.dragHandleProps}
        teamMembers={teamMembers}
        canDelete={canDelete(task)}
        isPhone={isPhone}
        onOpenMoveSheet={(entry, e) => {
          e.stopPropagation();
          openMoveSheet(entry);
        }}
      />
    ),
    [viewMode, handleMoveTask, handleCompleteTask, teamMembers, canDelete, isPhone, openMoveSheet]
  );

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
        ) : isPhone ? (
          <div className="grid grid-cols-1 min-h-[320px] gap-4 lg:gap-6">
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
                    <div className="space-y-2 sm:space-y-3 min-h-[80px] rounded-lg">
                      {colTasks.map((task, index) => (
                        <div key={task.id}>{renderKanbanCard(task, index)}</div>
                      ))}
                      {colTasks.length === 0 && renderEmptyColumnState(col.id, col.title)}
                    </div>
                  </KanbanColumn>
                </div>
              );
            })}
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div
              className={cn(
                "gap-4 lg:gap-6",
                isMobile
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
                                {(draggableProvided, draggableSnapshot) => (
                                  <div
                                    ref={draggableProvided.innerRef}
                                    {...draggableProvided.draggableProps}
                                    style={draggableProvided.draggableProps.style}
                                  >
                                    {renderKanbanCard(task, index, {
                                      isDragging: draggableSnapshot.isDragging,
                                      dragHandleProps: draggableProvided.dragHandleProps,
                                    })}
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {colTasks.length === 0 && renderEmptyColumnState(col.id, col.title)}
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

        {isPhone && (
          <Drawer
            open={moveSheetOpen}
            onOpenChange={(open) => {
              setMoveSheetOpen(open);
              if (!open) setMoveSheetTask(null);
            }}
          >
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Mover tarefa</DrawerTitle>
                <DrawerDescription>
                  {moveSheetTask
                    ? `Selecione a nova etapa para "${moveSheetTask.title}".`
                    : "Selecione a etapa de destino."}
                </DrawerDescription>
              </DrawerHeader>

              <div className="px-4 pb-2 space-y-2">
                {moveOptions.map((option) => {
                  const Icon = option.icon;
                  const disabled =
                    !moveSheetTask || normalizeStatus(moveSheetTask.status) === option.status;

                  return (
                    <button
                      key={option.status}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        void handleMoveFromSheet(option.status);
                      }}
                      className={cn(
                        "w-full rounded-xl border px-3 py-3 text-left transition-colors flex items-center gap-3",
                        disabled
                          ? "border-border bg-muted/40 text-muted-foreground cursor-not-allowed"
                          : "border-border bg-background active:bg-muted/70"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          option.status === "todo" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
                          option.status === "in_progress" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
                          option.status === "done" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-semibold">{option.title}</span>
                        <span className="block text-[11px] text-muted-foreground">{option.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <DrawerFooter>
                <DrawerClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
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
