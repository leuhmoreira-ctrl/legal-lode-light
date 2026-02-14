import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckSquare,
  Paperclip,
  MessageSquare,
  Clock,
  User,
  Plus,
  Send,
  Download,
  Calendar,
  Loader2,
  Edit2,
  Check,
  X,
  Trash2,
  Upload,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TaskComment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  user_name?: string;
}

interface TaskAttachment {
  id: string;
  file_name: string;
  file_size: number;
  mime_type: string | null;
  storage_path: string;
  uploaded_by: string;
  created_at: string;
  uploader_name?: string;
}

interface TaskCheckItem {
  id: string;
  title: string;
  completed: boolean;
  position_index: number;
}

interface TaskActivity {
  id: string;
  action_type: string;
  old_value: string | null;
  new_value: string | null;
  user_id: string | null;
  created_at: string;
  user_name?: string;
}

interface TaskDetail {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  due_date: string | null;
  processo_id: string | null;
  user_id: string;
  created_at: string;
}

interface TaskDetailModalProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  todo: "A Fazer",
  in_progress: "Em Andamento",
  review: "Revisão",
  done: "Concluído",
};

const PRIORITY_LABELS: Record<string, { label: string; class: string }> = {
  high: { label: "Alta", class: "bg-destructive/10 text-destructive border-destructive/30" },
  medium: { label: "Média", class: "bg-warning/10 text-warning border-warning/30" },
  low: { label: "Baixa", class: "bg-success/10 text-success border-success/30" },
};

export function TaskDetailModal({
  taskId,
  open,
  onOpenChange,
  onUpdate,
}: TaskDetailModalProps) {
  const { user } = useAuth();
  const { teamMembers } = usePermissions();
  const { toast } = useToast();

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [checklist, setChecklist] = useState<TaskCheckItem[]>([]);
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const [newComment, setNewComment] = useState("");
  const [newCheckItem, setNewCheckItem] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [editDesc, setEditDesc] = useState("");
  const [processoNumero, setProcessoNumero] = useState<string | null>(null);

  const getMemberName = useCallback(
    (id: string | null) => teamMembers.find((m) => m.id === id)?.full_name || "—",
    [teamMembers]
  );

  const loadTaskDetails = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const [taskRes, commentsRes, attachRes, checkRes, actRes] = await Promise.all([
        supabase.from("kanban_tasks").select("*").eq("id", taskId).single(),
        supabase
          .from("task_comments")
          .select("*")
          .eq("task_id", taskId)
          .order("created_at", { ascending: true }),
        supabase
          .from("task_attachments")
          .select("*")
          .eq("task_id", taskId)
          .order("created_at", { ascending: false }),
        supabase
          .from("task_checklist")
          .select("*")
          .eq("task_id", taskId)
          .order("position_index", { ascending: true }),
        supabase
          .from("task_activities")
          .select("*")
          .eq("task_id", taskId)
          .order("created_at", { ascending: false })
          .limit(30),
      ]);

      if (taskRes.data) {
        setTask(taskRes.data);
        setEditTitle(taskRes.data.title);
        setEditDesc(taskRes.data.description || "");
        if (taskRes.data.processo_id) {
          const { data: proc } = await supabase
            .from("processos")
            .select("numero")
            .eq("id", taskRes.data.processo_id)
            .single();
          setProcessoNumero(proc?.numero || null);
        } else {
          setProcessoNumero(null);
        }
      }

      setComments(
        (commentsRes.data || []).map((c) => ({
          ...c,
          user_name: getMemberName(c.user_id),
        }))
      );
      setAttachments(
        (attachRes.data || []).map((a) => ({
          ...a,
          uploader_name: getMemberName(a.uploaded_by),
        }))
      );
      setChecklist(checkRes.data || []);
      setActivities(
        (actRes.data || []).map((a) => ({
          ...a,
          user_name: getMemberName(a.user_id),
        }))
      );
    } catch (err) {
      console.error("Erro ao carregar detalhes:", err);
    } finally {
      setLoading(false);
    }
  }, [taskId, getMemberName]);

  useEffect(() => {
    if (taskId && open) {
      loadTaskDetails();
    }
    if (!open) {
      setTask(null);
      setEditingTitle(false);
      setEditingDesc(false);
    }
  }, [taskId, open, loadTaskDetails]);

  // Realtime subscriptions
  useEffect(() => {
    if (!taskId || !open) return;
    const ch1 = supabase
      .channel(`comments-${taskId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_comments", filter: `task_id=eq.${taskId}` }, () => loadTaskDetails())
      .subscribe();
    const ch2 = supabase
      .channel(`checklist-${taskId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_checklist", filter: `task_id=eq.${taskId}` }, () => loadTaskDetails())
      .subscribe();
    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [taskId, open, loadTaskDetails]);

  const handleSaveTitle = async () => {
    if (!editTitle.trim() || !task) return;
    await supabase.from("kanban_tasks").update({ title: editTitle }).eq("id", task.id);
    setTask((prev) => prev && { ...prev, title: editTitle });
    setEditingTitle(false);
    onUpdate?.();
  };

  const handleSaveDesc = async () => {
    if (!task) return;
    await supabase.from("kanban_tasks").update({ description: editDesc || null }).eq("id", task.id);
    setTask((prev) => prev && { ...prev, description: editDesc || null });
    setEditingDesc(false);
  };

  const handleStatusChange = async (status: string) => {
    if (!task) return;
    await supabase.from("kanban_tasks").update({ status }).eq("id", task.id);
    setTask((prev) => prev && { ...prev, status });
    onUpdate?.();
    loadTaskDetails(); // reload activities
  };

  const handlePriorityChange = async (priority: string) => {
    if (!task) return;
    await supabase.from("kanban_tasks").update({ priority }).eq("id", task.id);
    setTask((prev) => prev && { ...prev, priority });
    onUpdate?.();
  };

  const handleAssigneeChange = async (assignee: string) => {
    if (!task) return;
    const val = assignee === "unassigned" ? null : assignee;
    await supabase.from("kanban_tasks").update({ assigned_to: val }).eq("id", task.id);
    setTask((prev) => prev && { ...prev, assigned_to: val });
    onUpdate?.();
    loadTaskDetails();
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !taskId) return;
    const { error } = await supabase.from("task_comments").insert({
      task_id: taskId,
      user_id: user!.id,
      content: newComment,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setNewComment("");
    }
  };

  const handleAddCheckItem = async () => {
    if (!newCheckItem.trim() || !taskId) return;
    await supabase.from("task_checklist").insert({
      task_id: taskId,
      title: newCheckItem,
      position_index: checklist.length,
    });
    setNewCheckItem("");
  };

  const handleToggleCheck = async (item: TaskCheckItem) => {
    await supabase
      .from("task_checklist")
      .update({ completed: !item.completed })
      .eq("id", item.id);
  };

  const handleDeleteCheckItem = async (id: string) => {
    await supabase.from("task_checklist").delete().eq("id", id);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !taskId) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 10MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${taskId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("task-attachments").upload(path, file);
      if (upErr) throw upErr;
      await supabase.from("task_attachments").insert({
        task_id: taskId,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        storage_path: path,
        uploaded_by: user!.id,
      });
      toast({ title: "✅ Arquivo anexado" });
      loadTaskDetails();
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (att: TaskAttachment) => {
    const { data } = await supabase.storage.from("task-attachments").download(att.storage_path);
    if (!data) return;
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = att.file_name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const checklistProgress =
    checklist.length === 0 ? 0 : Math.round((checklist.filter((c) => c.completed).length / checklist.length) * 100);

  const getActivityText = (act: TaskActivity) => {
    switch (act.action_type) {
      case "created": return "criou a tarefa";
      case "status_changed": return `moveu para ${STATUS_LABELS[act.new_value || ""] || act.new_value}`;
      case "assigned_changed": return `atribuiu para ${getMemberName(act.new_value)}`;
      default: return act.action_type;
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !task ? (
          <div className="p-6 text-center text-muted-foreground">Tarefa não encontrada</div>
        ) : (
          <>
            {/* Header */}
            <DialogHeader className="p-6 pb-0">
              {editingTitle ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-lg font-bold"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
                  />
                  <Button size="icon" variant="ghost" onClick={handleSaveTitle}><Check className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { setEditingTitle(false); setEditTitle(task.title); }}><X className="w-4 h-4" /></Button>
                </div>
              ) : (
                <DialogTitle
                  className="text-xl font-bold cursor-pointer hover:text-primary transition-colors flex items-center gap-2"
                  onClick={() => setEditingTitle(true)}
                >
                  {task.title}
                  <Edit2 className="w-4 h-4 text-muted-foreground" />
                </DialogTitle>
              )}
              {processoNumero && (
                <p className="text-sm text-muted-foreground mt-1">📋 Processo: {processoNumero}</p>
              )}
            </DialogHeader>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 lg:gap-6 p-6 pt-4">
              {/* Main column */}
              <div className="lg:col-span-2 space-y-6">
                {/* Description */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Edit2 className="w-4 h-4" /> Descrição
                  </h3>
                  {editingDesc ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        rows={4}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveDesc}>Salvar</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setEditingDesc(false); setEditDesc(task.description || ""); }}>Cancelar</Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 cursor-pointer hover:bg-muted transition-colors min-h-[60px]"
                      onClick={() => setEditingDesc(true)}
                    >
                      {task.description || "Clique para adicionar uma descrição..."}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Checklist */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <CheckSquare className="w-4 h-4" />
                    Checklist
                    {checklist.length > 0 && (
                      <span className="text-xs text-muted-foreground">({checklistProgress}%)</span>
                    )}
                  </h3>
                  {checklist.length > 0 && (
                    <Progress value={checklistProgress} className="h-2 mb-3" />
                  )}
                  <div className="space-y-2 mb-3">
                    {checklist.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 group">
                        <Checkbox
                          checked={item.completed}
                          onCheckedChange={() => handleToggleCheck(item)}
                        />
                        <span className={`flex-1 text-sm ${item.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {item.title}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteCheckItem(item.id)}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Adicionar item..."
                      value={newCheckItem}
                      onChange={(e) => setNewCheckItem(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddCheckItem()}
                      className="text-sm"
                    />
                    <Button size="sm" variant="outline" onClick={handleAddCheckItem} disabled={!newCheckItem.trim()}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Attachments */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    Anexos ({attachments.length})
                  </h3>
                  <div className="space-y-2 mb-3">
                    {attachments.map((att) => (
                      <div key={att.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/30">
                        <div className="flex items-center gap-2 min-w-0">
                          <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{att.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(att.file_size / 1024).toFixed(1)} KB · {att.uploader_name}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleDownload(att)}>
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <label>
                    <Button variant="outline" size="sm" className="gap-1.5" disabled={uploading} asChild>
                      <span>
                        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        {uploading ? "Enviando..." : "Adicionar Anexo"}
                      </span>
                    </Button>
                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                  </label>
                </div>

                <Separator />

                {/* Comments */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Comentários ({comments.length})
                  </h3>
                  <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-2.5">
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarFallback className="text-[10px]">
                            {comment.user_name?.charAt(0)?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="bg-muted/50 rounded-lg p-2.5">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <span className="text-xs font-semibold text-foreground">{comment.user_name}</span>
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}
                              </span>
                            </div>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{comment.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {comments.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-3">Nenhum comentário ainda</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Escrever comentário..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAddComment()}
                      className="text-sm"
                    />
                    <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-5 lg:border-l lg:pl-6 pt-6 lg:pt-0 border-t lg:border-t-0">
                {/* Status */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Status</h4>
                  <Select value={task.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Prioridade</h4>
                  <Select value={task.priority} onValueChange={handlePriorityChange}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Assignee */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Responsável
                  </h4>
                  <Select value={task.assigned_to || "unassigned"} onValueChange={handleAssigneeChange}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Não atribuído</SelectItem>
                      {teamMembers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Due date */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Prazo
                  </h4>
                  {task.due_date ? (
                    <Badge variant="outline" className="text-xs">
                      {format(new Date(task.due_date), "dd/MM/yyyy")}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sem prazo definido</span>
                  )}
                </div>

                <Separator />

                {/* Activities */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Atividades
                  </h4>
                  <div className="space-y-2.5 max-h-48 overflow-y-auto">
                    {activities.map((act) => (
                      <div key={act.id} className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{act.user_name || "Sistema"}</span>{" "}
                        {getActivityText(act)}
                        <div className="text-[10px] mt-0.5">
                          {formatDistanceToNow(new Date(act.created_at), { addSuffix: true, locale: ptBR })}
                        </div>
                      </div>
                    ))}
                    {activities.length === 0 && (
                      <p className="text-xs text-muted-foreground">Nenhuma atividade</p>
                    )}
                  </div>
                </div>

                {/* Created at */}
                <div className="text-xs text-muted-foreground pt-2">
                  Criada em {format(new Date(task.created_at), "dd/MM/yyyy 'às' HH:mm")}
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
