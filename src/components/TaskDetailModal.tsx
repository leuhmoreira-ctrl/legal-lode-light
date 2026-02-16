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
  MessageSquare,
  Clock,
  User,
  Plus,
  Send,
  Calendar,
  Loader2,
  Edit2,
  Check,
  X,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ProcessInfoCard } from "@/components/task-detail/ProcessInfoCard";
import { AttachmentSection, type AttachmentItem } from "@/components/task-detail/AttachmentSection";
import { UserAvatar } from "@/components/UserAvatar";
import { VoiceRecorder } from "@/components/ui/VoiceRecorder";
import { CommentInput } from "@/components/ui/CommentInput";

interface TaskComment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  user_name?: string;
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
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [checklist, setChecklist] = useState<TaskCheckItem[]>([]);
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const [newCheckItem, setNewCheckItem] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [editDesc, setEditDesc] = useState("");

  const getMember = useCallback(
    (id: string | null) => teamMembers.find((m) => m.id === id),
    [teamMembers]
  );

  const getMemberName = useCallback(
    (id: string | null) => getMember(id)?.full_name || "—",
    [getMember]
  );

  const loadTaskDetails = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const [taskRes, commentsRes, attachRes, checkRes, actRes] = await Promise.all([
        supabase.from("kanban_tasks").select("*").eq("id", taskId).single(),
        supabase.from("task_comments").select("*").eq("task_id", taskId).order("created_at", { ascending: true }),
        supabase.from("task_attachments").select("*").eq("task_id", taskId).order("created_at", { ascending: false }),
        supabase.from("task_checklist").select("*").eq("task_id", taskId).order("position_index", { ascending: true }),
        supabase.from("task_activities").select("*").eq("task_id", taskId).order("created_at", { ascending: false }).limit(30),
      ]);

      if (taskRes.data) {
        setTask(taskRes.data);
        setEditTitle(taskRes.data.title);
        setEditDesc(taskRes.data.description || "");
      }

      // Enrich attachments with category from document_metadata
      const rawAttachments = attachRes.data || [];
      if (rawAttachments.length > 0) {
        const paths = rawAttachments.map((a) => a.storage_path);
        const { data: docMeta } = await supabase
          .from("document_metadata")
          .select("storage_path, category")
          .in("storage_path", paths);
        const catMap: Record<string, string> = {};
        docMeta?.forEach((d) => { catMap[d.storage_path] = d.category; });

        setAttachments(
          rawAttachments.map((a) => ({
            ...a,
            uploader_name: getMemberName(a.uploaded_by),
            category: catMap[a.storage_path] || undefined,
          }))
        );
      } else {
        setAttachments([]);
      }

      setComments(
        (commentsRes.data || []).map((c) => ({ ...c, user_name: getMemberName(c.user_id) }))
      );
      setChecklist(checkRes.data || []);
      setActivities(
        (actRes.data || []).map((a) => ({ ...a, user_name: getMemberName(a.user_id) }))
      );
    } catch (err) {
      console.error("Erro ao carregar detalhes:", err);
    } finally {
      setLoading(false);
    }
  }, [taskId, getMemberName]);

  useEffect(() => {
    if (taskId && open) loadTaskDetails();
    if (!open) {
      setTask(null);
      setEditingTitle(false);
      setEditingDesc(false);
    }
  }, [taskId, open, loadTaskDetails]);

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
    loadTaskDetails();
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

  const handleAddComment = async (content: string) => {
    if (!content.trim() || !taskId) return;

    const { error } = await supabase.from("task_comments").insert({
      task_id: taskId,
      user_id: user!.id,
      content: content,
    });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }

    // Handle notifications for mentions
    const mentionedUsers = teamMembers.filter(member =>
      content.includes(`@${member.full_name}`) && member.id !== user!.id
    );

    if (mentionedUsers.length > 0) {
      const notifications = mentionedUsers.map(member => ({
        user_id: member.id,
        title: "Nova menção em tarefa",
        message: `${user?.user_metadata?.full_name || "Alguém"} te mencionou na tarefa "${task?.title}"`,
        link: `/kanban?taskId=${taskId}`,
        is_read: false,
        type: "mention"
      }));

      await supabase.from("notifications").insert(notifications);
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
    await supabase.from("task_checklist").update({ completed: !item.completed }).eq("id", item.id);
  };

  const handleDeleteCheckItem = async (id: string) => {
    await supabase.from("task_checklist").delete().eq("id", id);
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

  const renderCommentContent = (content: string) => {
    if (!content) return null;

    // Create regex pattern from team members names
    // Sort by length desc to match longest names first
    const sortedMembers = [...teamMembers].sort((a, b) => b.full_name.length - a.full_name.length);
    const memberNames = sortedMembers.map(m => m.full_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

    if (!memberNames) return content;

    const regex = new RegExp(`@(${memberNames})`, 'g');
    const parts = content.split(regex);

    return parts.map((part, i) => {
      // Check if this part matches a member name (it was captured by regex group)
      const isMention = sortedMembers.some(m => m.full_name === part);

      if (isMention) {
        return (
          <span key={i} className="bg-blue-100 text-blue-700 px-1 py-0.5 rounded font-medium mx-0.5">
            @{part}
          </span>
        );
      }
      return part;
    });
  };

  const handleTranscribe = (text: string) => {
    const newDesc = editDesc ? editDesc + "\n" + text : text;
    setEditDesc(newDesc);
    setEditingDesc(true);
  };

  const handleAttachAudio = async (blob: Blob) => {
    if (!taskId || !user) return;
    try {
      const file = new File([blob], `audio_${format(new Date(), "dd-MM-yyyy_HH-mm")}.webm`, { type: "audio/webm" });
      const path = `${taskId}/${crypto.randomUUID()}.webm`;
      const { error: upErr } = await supabase.storage.from("task-attachments").upload(path, file);
      if (upErr) throw upErr;

      await supabase.from("task_attachments").insert({
        task_id: taskId,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        storage_path: path,
        uploaded_by: user.id,
      });

      if (task?.processo_id) {
        await supabase.from("document_metadata").insert({
          process_id: task.processo_id,
          storage_path: path,
          original_name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
          category: "other",
          uploaded_by: user.id,
          task_id: taskId,
        });
      }

      toast({ title: "Áudio anexado com sucesso!" });
      loadTaskDetails();
    } catch (err: any) {
      toast({ title: "Erro ao anexar áudio", description: err.message, variant: "destructive" });
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-4xl h-[100dvh] sm:max-h-[90vh] overflow-hidden p-0">
        <div className="overflow-y-auto h-full sm:max-h-[90vh]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !task ? (
          <div className="p-6 text-center text-muted-foreground">Tarefa não encontrada</div>
        ) : (
          <>
            {/* Header */}
            <DialogHeader className="p-4 sm:p-6 pb-0 sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
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
            </DialogHeader>

            {/* Process Info Card */}
            {task.processo_id && (
              <div className="px-4 sm:px-6 pt-3">
                <ProcessInfoCard processoId={task.processo_id} />
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 lg:gap-6 p-4 sm:p-6 pt-4">
              {/* Main column */}
              <div className="lg:col-span-2 space-y-6">
                {/* Description */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Edit2 className="w-4 h-4" /> Descrição
                    </h3>
                    <VoiceRecorder
                      onTranscribe={handleTranscribe}
                      onAttachAudio={handleAttachAudio}
                      onBoth={(text, blob) => {
                        handleTranscribe(text);
                        handleAttachAudio(blob);
                      }}
                    />
                  </div>
                  {editingDesc ? (
                    <div className="space-y-2">
                      <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={4} autoFocus />
                      <div className="flex flex-col sm:flex-row gap-2">
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
                    {checklist.length > 0 && <span className="text-xs text-muted-foreground">({checklistProgress}%)</span>}
                  </h3>
                  {checklist.length > 0 && <Progress value={checklistProgress} className="h-2 mb-3" />}
                  <div className="space-y-2 mb-3">
                    {checklist.map((item) => (
                      <div key={item.id} className="flex min-h-[44px] items-center gap-2 group">
                        <Checkbox checked={item.completed} onCheckedChange={() => handleToggleCheck(item)} />
                        <span className={`flex-1 text-sm ${item.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {item.title}
                        </span>
                        <Button variant="ghost" size="icon" className="h-11 w-11 sm:h-8 sm:w-8 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteCheckItem(item.id)}>
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input placeholder="Adicionar item..." value={newCheckItem} onChange={(e) => setNewCheckItem(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddCheckItem()} className="text-sm" />
                    <Button size="sm" variant="outline" onClick={handleAddCheckItem} disabled={!newCheckItem.trim()}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Attachments */}
                <AttachmentSection
                  attachments={attachments}
                  taskId={taskId!}
                  processoId={task.processo_id}
                  onReload={loadTaskDetails}
                />

                <Separator />

                {/* Comments */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Comentários ({comments.length})
                  </h3>
                  <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                    {comments.map((comment) => {
                      const member = getMember(comment.user_id);
                      return (
                        <div key={comment.id} className="flex gap-2.5">
                          <UserAvatar
                            name={member?.full_name || comment.user_name}
                            avatarUrl={member?.avatar_url}
                            size="md"
                            className="h-7 w-7"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="bg-muted/50 rounded-lg p-2.5">
                              <div className="flex items-center justify-between gap-2 mb-0.5">
                                <span className="text-xs font-semibold text-foreground">{member?.full_name || comment.user_name}</span>
                                <span className="text-[10px] text-muted-foreground shrink-0">
                                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}
                                </span>
                              </div>
                              <p className="text-sm text-foreground whitespace-pre-wrap">{renderCommentContent(comment.content)}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {comments.length === 0 && <p className="text-sm text-muted-foreground text-center py-3">Nenhum comentário ainda</p>}
                  </div>

                  <CommentInput
                    users={teamMembers}
                    onSubmit={handleAddComment}
                    placeholder="Escreva um comentário... Use @ para mencionar"
                  />
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-5 lg:border-l lg:pl-6 pt-6 lg:pt-0 border-t lg:border-t-0 pb-4">
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

                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Responsável
                  </h4>
                  <Select value={task.assigned_to || "unassigned"} onValueChange={handleAssigneeChange}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Não atribuído</SelectItem>
                      {teamMembers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          <div className="flex items-center gap-2">
                             <UserAvatar
                                name={m.full_name}
                                avatarUrl={m.avatar_url}
                                size="sm"
                                className="w-5 h-5 text-[9px]"
                             />
                             {m.full_name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Prazo
                  </h4>
                  {task.due_date ? (
                    <Badge variant="outline" className="text-xs">{format(new Date(task.due_date), "dd/MM/yyyy")}</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sem prazo definido</span>
                  )}
                </div>

                <Separator />

                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Atividades
                  </h4>
                  <div className="space-y-2.5 max-h-48 overflow-y-auto">
                    {activities.map((act) => {
                      const member = getMember(act.user_id);
                      return (
                        <div key={act.id} className="flex gap-2 text-xs text-muted-foreground">
                           <UserAvatar
                              name={member?.full_name || act.user_name || "Sistema"}
                              avatarUrl={member?.avatar_url}
                              size="sm"
                              className="w-5 h-5 mt-0.5 text-[8px]"
                           />
                           <div>
                              <span className="font-medium text-foreground">{act.user_name || "Sistema"}</span>{" "}
                              {getActivityText(act)}
                              <div className="text-[10px] mt-0.5">
                                {formatDistanceToNow(new Date(act.created_at), { addSuffix: true, locale: ptBR })}
                              </div>
                           </div>
                        </div>
                      );
                    })}
                    {activities.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma atividade</p>}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground pt-2">
                  Criada em {format(new Date(task.created_at), "dd/MM/yyyy 'às' HH:mm")}
                </div>

                <Separator />

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 justify-start gap-2"
                  onClick={async () => {
                    if (!task) return;
                    const { error } = await supabase.from("kanban_tasks").delete().eq("id", task.id);
                    if (error) {
                      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
                    } else {
                      toast({ title: "Tarefa excluída" });
                      onOpenChange(false);
                      onUpdate?.();
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" /> Excluir tarefa
                </Button>
              </div>
            </div>
          </>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
