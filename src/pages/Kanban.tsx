import { useEffect, useState, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, GripVertical, User, Calendar, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

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
}

export default function Kanban() {
  const { user } = useAuth();
  const { teamMembers } = usePermissions();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "medium", assigned_to: "", due_date: "" });

  const loadTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from("kanban_tasks")
      .select("*")
      .order("position_index", { ascending: true });
    if (!error && data) setTasks(data as KanbanTask[]);
    setLoading(false);
  }, []);

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

  const createTask = async () => {
    if (!newTask.title.trim() || !user) return;
    const { error } = await supabase.from("kanban_tasks").insert({
      title: newTask.title,
      description: newTask.description || null,
      priority: newTask.priority,
      assigned_to: newTask.assigned_to || user.id,
      due_date: newTask.due_date || null,
      user_id: user.id,
      status: "todo",
      position_index: tasks.filter((t) => t.status === "todo").length,
    });
    if (error) {
      toast({ title: "Erro ao criar tarefa", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tarefa criada!" });
      setNewTask({ title: "", description: "", priority: "medium", assigned_to: "", due_date: "" });
      setDialogOpen(false);
    }
  };

  const getTasksByStatus = (status: string) => tasks.filter((t) => t.status === status);
  const getMemberName = (id: string | null) => teamMembers.find((m) => m.id === id)?.full_name || "—";

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Kanban</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {tasks.filter((t) => t.status !== "done").length} tarefas pendentes
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" /> Nova Tarefa</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Título da tarefa" value={newTask.title} onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))} />
                <Textarea placeholder="Descrição (opcional)" value={newTask.description} onChange={(e) => setNewTask((p) => ({ ...p, description: e.target.value }))} />
                <div className="grid grid-cols-2 gap-3">
                  <Select value={newTask.priority} onValueChange={(v) => setNewTask((p) => ({ ...p, priority: v }))}>
                    <SelectTrigger><SelectValue placeholder="Prioridade" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="low">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={newTask.assigned_to} onValueChange={(v) => setNewTask((p) => ({ ...p, assigned_to: v }))}>
                    <SelectTrigger><SelectValue placeholder="Responsável" /></SelectTrigger>
                    <SelectContent>
                      {teamMembers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input type="date" value={newTask.due_date} onChange={(e) => setNewTask((p) => ({ ...p, due_date: e.target.value }))} />
                <Button onClick={createTask} className="w-full">Criar Tarefa</Button>
              </div>
            </DialogContent>
          </Dialog>
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
                                <Card className="p-3.5 hover:shadow-md transition-shadow">
                                  <div className="flex items-start gap-2">
                                    <div {...provided.dragHandleProps}>
                                      <GripVertical className="w-4 h-4 text-muted-foreground/40 mt-0.5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-foreground">{task.title}</p>
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
      </div>
    </AppLayout>
  );
}
