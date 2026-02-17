import { useEffect, useState, useCallback, useMemo } from "react";
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
import { Label } from "@/components/ui/label";
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
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
  FileAudio,
  ChevronRight,
  Search,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ProcessInfoCard } from "@/components/task-detail/ProcessInfoCard";
import { AttachmentSection, type AttachmentItem } from "@/components/task-detail/AttachmentSection";
import { UserAvatar } from "@/components/UserAvatar";
import { VoiceRecorder } from "@/components/ui/VoiceRecorder";
import { CommentInput } from "@/components/ui/CommentInput";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

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

const MOBILE_PRIORITY_OPTIONS = [
  {
    value: "high",
    label: "Alta",
    helper: "Maior urgência",
    chipClass: "bg-destructive/10 text-destructive",
  },
  {
    value: "medium",
    label: "Média",
    helper: "Padrão recomendado",
    chipClass: "bg-warning/10 text-warning",
  },
  {
    value: "low",
    label: "Baixa",
    helper: "Pode esperar",
    chipClass: "bg-success/10 text-success",
  },
] as const;

export function TaskDetailModal({
  taskId,
  open,
  onOpenChange,
  onUpdate,
}: TaskDetailModalProps) {
  const { user } = useAuth();
  const { teamMembers } = usePermissions();
  const { toast } = useToast();
  const isMobile = useIsMobile();

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
  const [descriptionVoiceNotes, setDescriptionVoiceNotes] = useState<Array<{ id: string; url: string; createdAt: string }>>([]);
  const [mobileTitle, setMobileTitle] = useState("");
  const [mobileDescription, setMobileDescription] = useState("");
  const [mobileStatus, setMobileStatus] = useState("todo");
  const [mobilePriority, setMobilePriority] = useState("medium");
  const [mobileAssignee, setMobileAssignee] = useState("unassigned");
  const [mobileDueDate, setMobileDueDate] = useState("");
  const [mobileTitleError, setMobileTitleError] = useState("");
  const [mobileSaving, setMobileSaving] = useState(false);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState("");
  const [mobileAssigneeSheetOpen, setMobileAssigneeSheetOpen] = useState(false);
  const [mobilePrioritySheetOpen, setMobilePrioritySheetOpen] = useState(false);
  const [mobileStatusSheetOpen, setMobileStatusSheetOpen] = useState(false);
  const [mobileAssigneeSearch, setMobileAssigneeSearch] = useState("");

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
      setDescriptionVoiceNotes((prev) => {
        prev.forEach((n) => URL.revokeObjectURL(n.url));
        return [];
      });
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

  useEffect(() => {
    if (!open || !isMobile || !task) return;
    setMobileTitle(task.title || "");
    setMobileDescription(task.description || "");
    setMobileStatus(task.status || "todo");
    setMobilePriority(task.priority || "medium");
    setMobileAssignee(task.assigned_to || "unassigned");
    setMobileDueDate(task.due_date ? task.due_date.slice(0, 10) : "");
    setMobileTitleError("");
    setMobileDetailsOpen("");
    setMobileAssigneeSearch("");
  }, [open, isMobile, task]);

  useEffect(() => {
    if (!open) {
      setMobileAssigneeSheetOpen(false);
      setMobilePrioritySheetOpen(false);
      setMobileStatusSheetOpen(false);
      setMobileSaving(false);
    }
  }, [open]);

  const scrollFieldIntoView = useCallback((event: React.FocusEvent<HTMLElement>) => {
    const target = event.currentTarget;
    window.setTimeout(() => {
      target.scrollIntoView({ block: "center", behavior: "auto" });
    }, 120);
  }, []);

  const selectedMobileAssignee = useMemo(
    () => teamMembers.find((member) => member.id === mobileAssignee) || null,
    [teamMembers, mobileAssignee]
  );

  const filteredMobileAssignees = useMemo(() => {
    const query = mobileAssigneeSearch.trim().toLowerCase();
    if (!query) return teamMembers;
    return teamMembers.filter((member) => member.full_name.toLowerCase().includes(query));
  }, [teamMembers, mobileAssigneeSearch]);

  const selectedMobilePriority = useMemo(
    () => MOBILE_PRIORITY_OPTIONS.find((option) => option.value === mobilePriority) || MOBILE_PRIORITY_OPTIONS[1],
    [mobilePriority]
  );

  const normalizedCurrentDueDate = task?.due_date ? task.due_date.slice(0, 10) : "";
  const hasMobileChanges = !!task && (
    mobileTitle.trim() !== task.title ||
    mobileDescription !== (task.description || "") ||
    mobileStatus !== task.status ||
    mobilePriority !== task.priority ||
    (mobileAssignee === "unassigned" ? null : mobileAssignee) !== (task.assigned_to || null) ||
    mobileDueDate !== normalizedCurrentDueDate
  );

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

  const handleSaveMobileForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;

    if (!mobileTitle.trim()) {
      setMobileTitleError("Informe um título para continuar.");
      return;
    }

    setMobileTitleError("");
    setMobileSaving(true);

    const payload = {
      title: mobileTitle.trim(),
      description: mobileDescription.trim() || null,
      status: mobileStatus,
      priority: mobilePriority,
      assigned_to: mobileAssignee === "unassigned" ? null : mobileAssignee,
      due_date: mobileDueDate || null,
    };

    const { error } = await supabase
      .from("kanban_tasks")
      .update(payload)
      .eq("id", task.id);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      setMobileSaving(false);
      return;
    }

    setTask((prev) => (prev ? { ...prev, ...payload } : prev));
    setEditTitle(payload.title);
    setEditDesc(payload.description || "");
    setMobileSaving(false);
    toast({ title: "✅ Tarefa atualizada" });
    onUpdate?.();
    void loadTaskDetails();
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
    const noteTimestamp = format(new Date(), "dd/MM/yyyy 'às' HH:mm");
    const noteText = text.trim();
    const voiceNoteBlock = `\n\n[Anotação por voz • ${noteTimestamp}]\n${noteText}`;
    const newDesc = editDesc ? editDesc + voiceNoteBlock : `[Anotação por voz • ${noteTimestamp}]\n${noteText}`;
    setEditDesc(newDesc);
    setEditingDesc(true);
    toast({
      title: "Anotação adicionada",
      description: "Revise e clique em Salvar para persistir na descrição.",
    });
  };

  const handleDescriptionVoiceAudio = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const note = {
      id: crypto.randomUUID(),
      url,
      createdAt: new Date().toISOString(),
    };
    setDescriptionVoiceNotes((prev) => [...prev, note]);
    setEditingDesc(true);
    toast({
      title: "Nota de voz adicionada",
      description: "Sem transcrição: áudio adicionado como nota da descrição (não vai para anexos).",
    });
  };

  const removeDescriptionVoiceNote = (id: string) => {
    setDescriptionVoiceNotes((prev) => {
      const note = prev.find((n) => n.id === id);
      if (note) URL.revokeObjectURL(note.url);
      return prev.filter((n) => n.id !== id);
    });
  };

  if (!open) return null;

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="[&>button]:hidden w-full max-w-none h-[100dvh] p-0 gap-0 overflow-y-auto rounded-none">
          {loading ? (
            <div className="flex min-h-[50dvh] items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : !task ? (
            <div className="p-6 text-center text-muted-foreground">Tarefa não encontrada</div>
          ) : (
            <>
              <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
                <div className="grid grid-cols-[40px_1fr_40px] items-center px-3 py-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => onOpenChange(false)}
                  >
                    <X className="w-5 h-5" />
                    <span className="sr-only">Fechar</span>
                  </Button>
                  <p className="text-center text-sm font-semibold">Editar tarefa</p>
                  <span />
                </div>
              </div>

              <form
                id="mobile-task-edit-form"
                onSubmit={handleSaveMobileForm}
                className="px-4 py-4 pb-[calc(104px+env(safe-area-inset-bottom))] space-y-5"
              >
                {task.processo_id ? <ProcessInfoCard processoId={task.processo_id} /> : null}

                <section className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Essencial</h3>

                  <div className="space-y-1.5">
                    <Label htmlFor="mobile-edit-title">Título *</Label>
                    <Input
                      id="mobile-edit-title"
                      value={mobileTitle}
                      onFocus={scrollFieldIntoView}
                      onChange={(event) => {
                        setMobileTitle(event.target.value);
                        if (mobileTitleError && event.target.value.trim()) setMobileTitleError("");
                      }}
                      placeholder="Ex: Revisar minuta da contestação"
                      className="h-11"
                    />
                    {mobileTitleError ? <p className="text-xs text-destructive">{mobileTitleError}</p> : null}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Responsável</Label>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full justify-between px-3"
                      onClick={() => setMobileAssigneeSheetOpen(true)}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {selectedMobileAssignee ? (
                          <>
                            <UserAvatar
                              name={selectedMobileAssignee.full_name}
                              avatarUrl={selectedMobileAssignee.avatar_url}
                              size="sm"
                              className="w-5 h-5 text-[9px]"
                            />
                            <span className="truncate text-sm">{selectedMobileAssignee.full_name}</span>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">Não atribuído</span>
                        )}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Prioridade</Label>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full justify-between px-3"
                      onClick={() => setMobilePrioritySheetOpen(true)}
                    >
                      <span className="flex items-center gap-2 text-sm">
                        <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium", selectedMobilePriority.chipClass)}>
                          {selectedMobilePriority.label}
                        </span>
                        <span className="text-muted-foreground">{selectedMobilePriority.helper}</span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full justify-between px-3"
                      onClick={() => setMobileStatusSheetOpen(true)}
                    >
                      <span className="text-sm">{STATUS_LABELS[mobileStatus] || "Selecionar status"}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="mobile-edit-due-date">Data de vencimento</Label>
                    <Input
                      id="mobile-edit-due-date"
                      type="date"
                      value={mobileDueDate}
                      onFocus={scrollFieldIntoView}
                      onChange={(event) => setMobileDueDate(event.target.value)}
                      className="h-11"
                    />
                  </div>
                </section>

                <section className="rounded-xl border border-border/80 px-3">
                  <Accordion type="single" collapsible value={mobileDetailsOpen} onValueChange={setMobileDetailsOpen}>
                    <AccordionItem value="details" className="border-none">
                      <AccordionTrigger className="py-3 text-sm font-semibold hover:no-underline">
                        Detalhes (opcional)
                      </AccordionTrigger>
                      <AccordionContent className="pb-2 space-y-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="mobile-edit-description">Descrição</Label>
                          <Textarea
                            id="mobile-edit-description"
                            value={mobileDescription}
                            onFocus={scrollFieldIntoView}
                            onChange={(event) => setMobileDescription(event.target.value)}
                            placeholder="Contexto, objetivo e próximos passos"
                            rows={5}
                          />
                        </div>

                        <div className="rounded-lg border border-border/80 bg-muted/25 px-3 py-2 text-xs text-muted-foreground">
                          Criada em {format(new Date(task.created_at), "dd/MM/yyyy 'às' HH:mm")}
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full justify-start px-0 text-destructive hover:text-destructive hover:bg-transparent"
                          onClick={async () => {
                            const { error } = await supabase.from("kanban_tasks").delete().eq("id", task.id);
                            if (error) {
                              toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
                              return;
                            }
                            toast({ title: "Tarefa excluída" });
                            onOpenChange(false);
                            onUpdate?.();
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Excluir tarefa
                        </Button>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </section>
              </form>

              <div className="sticky bottom-0 z-20 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
                <Button
                  type="submit"
                  form="mobile-task-edit-form"
                  className="h-12 w-full text-[15px] font-semibold"
                  disabled={mobileSaving || !mobileTitle.trim() || !hasMobileChanges}
                >
                  {mobileSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...
                    </>
                  ) : (
                    "Salvar"
                  )}
                </Button>
              </div>

              <Drawer open={mobileAssigneeSheetOpen} onOpenChange={setMobileAssigneeSheetOpen}>
                <DrawerContent className="h-[78dvh] max-h-[78dvh]">
                  <DrawerHeader>
                    <DrawerTitle>Selecionar responsável</DrawerTitle>
                    <DrawerDescription>Defina quem ficará responsável pela tarefa.</DrawerDescription>
                  </DrawerHeader>
                  <div className="px-4 pb-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={mobileAssigneeSearch}
                        onChange={(event) => setMobileAssigneeSearch(event.target.value)}
                        placeholder="Buscar membro da equipe..."
                        className="h-11 pl-9"
                      />
                    </div>
                  </div>
                  <div className="px-4 pb-2 overflow-y-auto space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setMobileAssignee("unassigned");
                        setMobileAssigneeSheetOpen(false);
                      }}
                      className={cn(
                        "w-full min-h-[44px] rounded-lg border px-3 py-2 text-left transition-colors flex items-center justify-between gap-3",
                        mobileAssignee === "unassigned" ? "border-primary/40 bg-primary/5" : "border-border bg-background"
                      )}
                    >
                      <span className="text-sm">Não atribuído</span>
                      {mobileAssignee === "unassigned" ? <Check className="w-4 h-4 text-primary" /> : null}
                    </button>

                    {filteredMobileAssignees.map((member) => {
                      const active = mobileAssignee === member.id;
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => {
                            setMobileAssignee(member.id);
                            setMobileAssigneeSheetOpen(false);
                          }}
                          className={cn(
                            "w-full min-h-[44px] rounded-lg border px-3 py-2 text-left transition-colors flex items-center justify-between gap-3",
                            active ? "border-primary/40 bg-primary/5" : "border-border bg-background"
                          )}
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <UserAvatar
                              name={member.full_name}
                              avatarUrl={member.avatar_url}
                              size="sm"
                              className="w-6 h-6 text-[10px]"
                            />
                            <span className="truncate text-sm">{member.full_name}</span>
                          </span>
                          {active ? <Check className="w-4 h-4 text-primary" /> : null}
                        </button>
                      );
                    })}

                    {filteredMobileAssignees.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhum membro encontrado.</p>
                    ) : null}
                  </div>
                  <DrawerFooter>
                    <DrawerClose asChild>
                      <Button variant="outline">Fechar</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>

              <Drawer open={mobilePrioritySheetOpen} onOpenChange={setMobilePrioritySheetOpen}>
                <DrawerContent className="h-auto max-h-[70dvh]">
                  <DrawerHeader>
                    <DrawerTitle>Selecionar prioridade</DrawerTitle>
                    <DrawerDescription>Escolha a urgência para organizar a execução.</DrawerDescription>
                  </DrawerHeader>
                  <div className="px-4 pb-2 space-y-1">
                    {MOBILE_PRIORITY_OPTIONS.map((option) => {
                      const active = mobilePriority === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setMobilePriority(option.value);
                            setMobilePrioritySheetOpen(false);
                          }}
                          className={cn(
                            "w-full min-h-[44px] rounded-lg border px-3 py-2 text-left transition-colors flex items-center justify-between gap-3",
                            active ? "border-primary/40 bg-primary/5" : "border-border bg-background"
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", option.chipClass)}>
                              {option.label}
                            </span>
                            <span className="text-sm text-muted-foreground">{option.helper}</span>
                          </span>
                          {active ? <Check className="w-4 h-4 text-primary" /> : null}
                        </button>
                      );
                    })}
                  </div>
                  <DrawerFooter>
                    <DrawerClose asChild>
                      <Button variant="outline">Fechar</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>

              <Drawer open={mobileStatusSheetOpen} onOpenChange={setMobileStatusSheetOpen}>
                <DrawerContent className="h-auto max-h-[70dvh]">
                  <DrawerHeader>
                    <DrawerTitle>Selecionar status</DrawerTitle>
                    <DrawerDescription>Defina a coluna de acompanhamento da tarefa.</DrawerDescription>
                  </DrawerHeader>
                  <div className="px-4 pb-2 space-y-1">
                    {Object.entries(STATUS_LABELS).map(([status, label]) => {
                      const active = mobileStatus === status;
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => {
                            setMobileStatus(status);
                            setMobileStatusSheetOpen(false);
                          }}
                          className={cn(
                            "w-full min-h-[44px] rounded-lg border px-3 py-2 text-left transition-colors flex items-center justify-between gap-3",
                            active ? "border-primary/40 bg-primary/5" : "border-border bg-background"
                          )}
                        >
                          <span className="text-sm">{label}</span>
                          {active ? <Check className="w-4 h-4 text-primary" /> : null}
                        </button>
                      );
                    })}
                  </div>
                  <DrawerFooter>
                    <DrawerClose asChild>
                      <Button variant="outline">Fechar</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            </>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-4xl h-[100dvh] sm:max-h-[90vh] overflow-hidden p-0 flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !task ? (
          <div className="flex-1 p-6 text-center text-muted-foreground">Tarefa não encontrada</div>
        ) : (
          <>
            {/* Header */}
            <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 pr-14 sm:pr-16 bg-background border-b shrink-0">
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

            <div
              className="flex-1 overflow-y-auto pr-1 sm:pr-2"
              style={{ scrollbarGutter: "stable" }}
            >
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
                      mode="description-note"
                      onTranscribe={handleTranscribe}
                      onAttachAudio={handleDescriptionVoiceAudio}
                    />
                  </div>
                  {editingDesc ? (
                    <div className="space-y-2">
                      <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={4} autoFocus />
                      {descriptionVoiceNotes.length > 0 && (
                        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                          <p className="text-xs font-medium text-muted-foreground">
                            Notas de voz da descrição (não entram em anexos)
                          </p>
                          {descriptionVoiceNotes.map((note) => (
                            <div key={note.id} className="flex items-center gap-2 rounded-md bg-background/90 border px-2 py-2">
                              <FileAudio className="w-4 h-4 text-primary shrink-0" />
                              <div className="w-full">
                                <p className="text-[11px] text-muted-foreground mb-1">
                                  Nota de voz · {format(new Date(note.createdAt), "HH:mm")}
                                </p>
                                <audio controls src={note.url} className="w-full h-9" />
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                                onClick={() => removeDescriptionVoiceNote(note.id)}
                                title="Remover nota de voz"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button size="sm" onClick={handleSaveDesc}>Salvar</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setEditingDesc(false); setEditDesc(task.description || ""); }}>Cancelar</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div
                        className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 cursor-pointer hover:bg-muted transition-colors min-h-[60px]"
                        onClick={() => setEditingDesc(true)}
                      >
                        {task.description || "Clique para adicionar uma descrição..."}
                      </div>
                      {descriptionVoiceNotes.length > 0 && (
                        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                          <p className="text-xs font-medium text-muted-foreground">
                            Notas de voz da descrição (não entram em anexos)
                          </p>
                          {descriptionVoiceNotes.map((note) => (
                            <div key={note.id} className="flex items-center gap-2 rounded-md bg-background/90 border px-2 py-2">
                              <FileAudio className="w-4 h-4 text-primary shrink-0" />
                              <div className="w-full">
                                <p className="text-[11px] text-muted-foreground mb-1">
                                  Nota de voz · {format(new Date(note.createdAt), "HH:mm")}
                                </p>
                                <audio controls src={note.url} className="w-full h-9" />
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                                onClick={() => removeDescriptionVoiceNote(note.id)}
                                title="Remover nota de voz"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
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
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
