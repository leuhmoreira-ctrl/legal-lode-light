import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import {
  Check,
  ChevronRight,
  Plus,
  Link2,
  PlusCircle,
  X,
  Loader2,
  Scale,
  Briefcase,
  UserRound,
  Search,
} from "lucide-react";
import { NovoProcessoForm } from "@/components/NovoProcessoForm";
import { UserAvatar } from "@/components/UserAvatar";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface Processo {
  id: string;
  numero: string;
  cliente: string;
}

interface NovaTarefaDialogProps {
  onSuccess?: () => void;
  triggerLabel?: string;
  triggerClassName?: string;
  iconOnly?: boolean;
}

const PRIORITY_OPTIONS = [
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

export function NovaTarefaDialog({
  onSuccess,
  triggerLabel = "Nova Tarefa",
  triggerClassName,
  iconOnly = false,
}: NovaTarefaDialogProps) {
  const { user } = useAuth();
  const { teamMembers } = usePermissions();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [prioridade, setPrioridade] = useState("medium");
  const [responsavel, setResponsavel] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");

  const [vinculoOpcao, setVinculoOpcao] = useState("nenhum");
  const [eventCategory, setEventCategory] = useState<"processual" | "escritorio" | "pessoal">("escritorio");
  const [processoSelecionado, setProcessoSelecionado] = useState("");
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [modalNovoProcesso, setModalNovoProcesso] = useState(false);

  const [titleError, setTitleError] = useState("");
  const [detailsOpen, setDetailsOpen] = useState<string>("");
  const [priorityPickerOpen, setPriorityPickerOpen] = useState(false);
  const [assigneePickerOpen, setAssigneePickerOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState("");

  const handleFieldFocus = useCallback((event: React.FocusEvent<HTMLElement>) => {
    const target = event.currentTarget;
    window.setTimeout(() => {
      target.scrollIntoView({ block: "center", behavior: "auto" });
    }, 120);
  }, []);

  const carregarProcessos = useCallback(async () => {
    const { data } = await supabase
      .from("processos")
      .select("id, numero, cliente")
      .order("created_at", { ascending: false });
    if (data) setProcessos(data);
  }, []);

  const resetForm = useCallback(() => {
    setTitulo("");
    setDescricao("");
    setObservacoes("");
    setPrioridade("medium");
    setResponsavel(user?.id || "");
    setDataVencimento("");
    setVinculoOpcao("nenhum");
    setProcessoSelecionado("");
    setEventCategory("escritorio");
    setTitleError("");
    setDetailsOpen("");
    setAssigneeSearch("");
  }, [user?.id]);

  useEffect(() => {
    if (!open) return;
    carregarProcessos();
    if (!responsavel) {
      setResponsavel(user?.id || "");
    }
    setTitleError("");
    setAssigneeSearch("");
  }, [open, carregarProcessos, responsavel, user?.id]);

  const selectedPriority = useMemo(
    () => PRIORITY_OPTIONS.find((item) => item.value === prioridade) || PRIORITY_OPTIONS[1],
    [prioridade]
  );

  const selectedAssignee = useMemo(
    () => teamMembers.find((member) => member.id === responsavel) || null,
    [teamMembers, responsavel]
  );

  const filteredTeamMembers = useMemo(() => {
    const query = assigneeSearch.trim().toLowerCase();
    if (!query) return teamMembers;
    return teamMembers.filter((member) => member.full_name.toLowerCase().includes(query));
  }, [teamMembers, assigneeSearch]);

  const canSubmit = titulo.trim().length > 0 && !loading;

  const validateBeforeSubmit = () => {
    if (!titulo.trim()) {
      setTitleError("Informe um título para continuar.");
      return false;
    }
    setTitleError("");

    if (vinculoOpcao === "existente" && !processoSelecionado) {
      toast({ title: "Erro", description: "Selecione um processo", variant: "destructive" });
      return false;
    }
    if (vinculoOpcao === "novo" && !processoSelecionado) {
      toast({
        title: "Atenção",
        description: "Cadastre o processo antes de criar a tarefa",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateBeforeSubmit()) return;

    setLoading(true);
    try {
      const finalCategory = vinculoOpcao !== "nenhum" ? "processual" : eventCategory;
      const { error } = await supabase.from("kanban_tasks").insert({
        title: titulo.trim(),
        description: descricao.trim() || null,
        observacoes: observacoes.trim() || null,
        assigned_to: responsavel || user?.id || null,
        priority: prioridade,
        status: "todo",
        position_index: Date.now(),
        due_date: dataVencimento || null,
        user_id: user!.id,
        processo_id: vinculoOpcao !== "nenhum" ? processoSelecionado : null,
        event_category: finalCategory,
      });
      if (error) throw error;

      if (responsavel && responsavel !== user?.id) {
        await supabase.from("notifications").insert({
          user_id: responsavel,
          title: "Nova tarefa atribuída",
          message: `Você foi designado(a) para: ${titulo}`,
          type: "task_assigned",
          link: "/kanban",
        });
      }

      toast({ title: "✅ Tarefa criada!" });
      resetForm();
      setOpen(false);
      onSuccess?.();
    } catch (err: any) {
      toast({ title: "Erro ao criar tarefa", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleNovoProcessoCriado = (processoId?: string) => {
    setModalNovoProcesso(false);
    if (processoId) {
      setProcessoSelecionado(processoId);
    }
    carregarProcessos();
    toast({ title: "✅ Processo criado!", description: "Finalize a criação da tarefa" });
  };

  const renderEventCategory = (mobile = false) => (
    <div className={cn("space-y-3", !mobile && "border-t pt-4")}>
      <Label className="text-sm font-semibold">Tipo de Evento *</Label>
      <RadioGroup value={eventCategory} onValueChange={(value) => setEventCategory(value as any)}>
        <div className="flex min-h-[44px] items-center space-x-2">
          <RadioGroupItem value="processual" id={mobile ? "cat-processual-mobile" : "cat-processual"} />
          <Label
            htmlFor={mobile ? "cat-processual-mobile" : "cat-processual"}
            className="font-normal cursor-pointer flex items-center gap-1.5"
          >
            <Scale className="h-3.5 w-3.5 text-orange-500" /> Prazo Processual
          </Label>
        </div>
        <div className="flex min-h-[44px] items-center space-x-2">
          <RadioGroupItem value="escritorio" id={mobile ? "cat-escritorio-mobile" : "cat-escritorio"} />
          <Label
            htmlFor={mobile ? "cat-escritorio-mobile" : "cat-escritorio"}
            className="font-normal cursor-pointer flex items-center gap-1.5"
          >
            <Briefcase className="h-3.5 w-3.5 text-blue-500" /> Escritório
          </Label>
        </div>
        <div className="flex min-h-[44px] items-center space-x-2">
          <RadioGroupItem value="pessoal" id={mobile ? "cat-pessoal-mobile" : "cat-pessoal"} />
          <Label
            htmlFor={mobile ? "cat-pessoal-mobile" : "cat-pessoal"}
            className="font-normal cursor-pointer flex items-center gap-1.5"
          >
            <UserRound className="h-3.5 w-3.5 text-violet-500" /> Pessoal
          </Label>
        </div>
      </RadioGroup>
    </div>
  );

  const renderProcessLinking = (mobile = false) => (
    <div className={cn("border-t pt-4 space-y-3", mobile && "pt-3")}>
      <Label className="text-sm font-semibold">Vincular a Processo (opcional)</Label>
      <RadioGroup
        value={vinculoOpcao}
        onValueChange={(value) => {
          setVinculoOpcao(value);
          if (value === "nenhum") setProcessoSelecionado("");
        }}
      >
        <div className="flex min-h-[44px] items-center space-x-2">
          <RadioGroupItem value="nenhum" id={mobile ? "nenhum-mobile" : "nenhum"} />
          <Label htmlFor={mobile ? "nenhum-mobile" : "nenhum"} className="font-normal cursor-pointer flex items-center gap-1.5">
            <X className="h-3.5 w-3.5" /> Não vincular
          </Label>
        </div>

        <div className="flex min-h-[44px] items-center space-x-2">
          <RadioGroupItem value="existente" id={mobile ? "existente-mobile" : "existente"} />
          <Label htmlFor={mobile ? "existente-mobile" : "existente"} className="font-normal cursor-pointer flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5" /> Processo existente
          </Label>
        </div>

        {vinculoOpcao === "existente" && (
          <div className="ml-6">
            <Select value={processoSelecionado} onValueChange={setProcessoSelecionado}>
              <SelectTrigger className="min-h-[44px]">
                <SelectValue placeholder="Selecione um processo..." />
              </SelectTrigger>
              <SelectContent>
                {processos.map((processo) => (
                  <SelectItem key={processo.id} value={processo.id}>
                    {processo.numero} — {processo.cliente}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex min-h-[44px] items-center space-x-2">
          <RadioGroupItem value="novo" id={mobile ? "novo-mobile" : "novo"} />
          <Label htmlFor={mobile ? "novo-mobile" : "novo"} className="font-normal cursor-pointer flex items-center gap-1.5">
            <PlusCircle className="h-3.5 w-3.5" /> Criar novo processo
          </Label>
        </div>

        {vinculoOpcao === "novo" && (
          <div className="ml-6 space-y-2">
            {processoSelecionado ? (
              <p className="text-sm text-primary">✓ Processo vinculado</p>
            ) : (
              <Dialog open={modalNovoProcesso} onOpenChange={setModalNovoProcesso}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="min-h-[44px] gap-1.5">
                    <PlusCircle className="h-3.5 w-3.5" /> Cadastrar Processo
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-full max-w-3xl h-[100dvh] sm:h-[90vh] p-0 overflow-hidden flex flex-col">
                  <div className="px-4 sm:px-6 py-4 border-b">
                    <DialogHeader className="p-0">
                      <DialogTitle>Cadastrar Novo Processo</DialogTitle>
                    </DialogHeader>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <NovoProcessoForm
                      onSuccess={handleNovoProcessoCriado}
                      onCancel={() => setModalNovoProcesso(false)}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}
      </RadioGroup>
    </div>
  );

  const renderMobileForm = () => (
    <DialogContent className="[&>button]:hidden w-full max-w-none h-[100dvh] p-0 gap-0 overflow-y-auto rounded-none">
      <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="grid grid-cols-[40px_1fr_40px] items-center px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={() => setOpen(false)}
          >
            <X className="w-5 h-5" />
            <span className="sr-only">Cancelar</span>
          </Button>
          <p className="text-center text-sm font-semibold">Criar tarefa</p>
          <span />
        </div>
      </div>

      <form
        id="nova-tarefa-form-mobile"
        onSubmit={handleSubmit}
        className="px-4 py-4 pb-[calc(96px+env(safe-area-inset-bottom))] space-y-5"
      >
        <section className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Essencial</h3>

          <div className="space-y-1.5">
            <Label htmlFor="mobile-task-title">Título *</Label>
            <Input
              id="mobile-task-title"
              value={titulo}
              onFocus={handleFieldFocus}
              onChange={(event) => {
                setTitulo(event.target.value);
                if (titleError && event.target.value.trim()) setTitleError("");
              }}
              placeholder="Ex: Revisar minuta da contestação"
              className="h-11"
            />
            {titleError ? <p className="text-xs text-destructive">{titleError}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label>Responsável</Label>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full justify-between px-3"
              onClick={() => setAssigneePickerOpen(true)}
            >
              <span className="flex min-w-0 items-center gap-2">
                {selectedAssignee ? (
                  <>
                    <UserAvatar
                      name={selectedAssignee.full_name}
                      avatarUrl={selectedAssignee.avatar_url}
                      size="sm"
                      className="w-5 h-5 text-[9px]"
                    />
                    <span className="truncate text-sm">{selectedAssignee.full_name}</span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">Selecionar responsável</span>
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
              onClick={() => setPriorityPickerOpen(true)}
            >
              <span className="flex items-center gap-2 text-sm">
                <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium", selectedPriority.chipClass)}>
                  {selectedPriority.label}
                </span>
                <span className="text-muted-foreground">{selectedPriority.helper}</span>
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mobile-task-due-date">Data de vencimento</Label>
            <Input
              id="mobile-task-due-date"
              type="date"
              value={dataVencimento}
              onFocus={handleFieldFocus}
              onChange={(event) => setDataVencimento(event.target.value)}
              className="h-11"
            />
          </div>
        </section>

        <section className="rounded-xl border border-border/80 px-3">
          <Accordion type="single" collapsible value={detailsOpen} onValueChange={setDetailsOpen}>
            <AccordionItem value="details" className="border-none">
              <AccordionTrigger className="py-3 text-sm font-semibold hover:no-underline">
                Detalhes (opcional)
              </AccordionTrigger>
              <AccordionContent className="pb-1 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="mobile-task-description">Descrição</Label>
                  <Textarea
                    id="mobile-task-description"
                    value={descricao}
                    onFocus={handleFieldFocus}
                    onChange={(event) => setDescricao(event.target.value)}
                    placeholder="Contexto, objetivo e próximos passos"
                    rows={4}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="mobile-task-notes">Observações</Label>
                  <Textarea
                    id="mobile-task-notes"
                    value={observacoes}
                    onFocus={handleFieldFocus}
                    onChange={(event) => setObservacoes(event.target.value)}
                    placeholder='Ex: "Levar procuração original"'
                    rows={3}
                  />
                </div>

                {renderEventCategory(true)}
                {renderProcessLinking(true)}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
      </form>

      <div className="sticky bottom-0 z-20 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
        <Button
          type="submit"
          form="nova-tarefa-form-mobile"
          className="h-12 w-full text-[15px] font-semibold"
          disabled={!canSubmit}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Criando...
            </>
          ) : (
            "Criar tarefa"
          )}
        </Button>
      </div>

      <Drawer open={assigneePickerOpen} onOpenChange={setAssigneePickerOpen}>
        <DrawerContent className="h-[78dvh] max-h-[78dvh]">
          <DrawerHeader>
            <DrawerTitle>Selecionar responsável</DrawerTitle>
            <DrawerDescription>Escolha quem ficará responsável pela tarefa.</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={assigneeSearch}
                onChange={(event) => setAssigneeSearch(event.target.value)}
                placeholder="Buscar membro da equipe..."
                className="pl-9 h-11"
              />
            </div>
          </div>
          <div className="px-4 pb-2 overflow-y-auto space-y-1">
            {filteredTeamMembers.map((member) => {
              const active = responsavel === member.id;
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => {
                    setResponsavel(member.id);
                    setAssigneePickerOpen(false);
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
            {filteredTeamMembers.length === 0 ? (
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

      <Drawer open={priorityPickerOpen} onOpenChange={setPriorityPickerOpen}>
        <DrawerContent className="h-auto max-h-[70dvh]">
          <DrawerHeader>
            <DrawerTitle>Selecionar prioridade</DrawerTitle>
            <DrawerDescription>Defina a urgência para ordenar o trabalho da equipe.</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-2 space-y-1">
            {PRIORITY_OPTIONS.map((option) => {
              const active = prioridade === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setPrioridade(option.value);
                    setPriorityPickerOpen(false);
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
    </DialogContent>
  );

  const renderDesktopForm = () => (
    <DialogContent className="w-full max-w-lg h-[100dvh] sm:h-[90vh] p-0 overflow-hidden flex flex-col">
      <div className="px-4 sm:px-6 py-4 border-b bg-background sticky top-0 z-10">
        <DialogHeader className="p-0">
          <DialogTitle>Criar Nova Tarefa</DialogTitle>
        </DialogHeader>
      </div>
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <form id="nova-tarefa-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Título *</Label>
            <Input
              id="task-title"
              placeholder="Título da tarefa"
              value={titulo}
              onChange={(event) => {
                setTitulo(event.target.value);
                if (titleError && event.target.value.trim()) setTitleError("");
              }}
            />
            {titleError ? <p className="text-xs text-destructive">{titleError}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-description">Descrição</Label>
            <Textarea
              id="task-description"
              placeholder="Descrição (opcional)"
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={prioridade} onValueChange={setPrioridade}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Responsável</Label>
              <Select value={responsavel} onValueChange={setResponsavel}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <UserAvatar
                          name={member.full_name}
                          avatarUrl={member.avatar_url}
                          size="sm"
                          className="w-5 h-5 text-[9px]"
                        />
                        {member.full_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-due-date">Data de Vencimento</Label>
            <Input
              id="task-due-date"
              type="date"
              value={dataVencimento}
              onChange={(event) => setDataVencimento(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-observacoes">Observações</Label>
            <Textarea
              id="task-observacoes"
              placeholder='Ex: "Levar procuração original", "Confirmar presença"'
              value={observacoes}
              onChange={(event) => setObservacoes(event.target.value)}
              rows={2}
            />
          </div>

          {renderEventCategory(false)}
          {renderProcessLinking(false)}
        </form>
      </div>
      <div className="p-4 border-t bg-background/95 backdrop-blur-sm sticky bottom-0 z-10">
        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="nova-tarefa-form" className="flex-1" disabled={!canSubmit}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Criando...
              </>
            ) : (
              "Criar Tarefa"
            )}
          </Button>
        </div>
      </div>
    </DialogContent>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setAssigneePickerOpen(false);
          setPriorityPickerOpen(false);
          setAssigneeSearch("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button className={cn("gap-2 w-full sm:w-auto", triggerClassName)}>
          <Plus className="w-4 h-4" />
          {iconOnly ? <span className="sr-only">{triggerLabel}</span> : triggerLabel}
        </Button>
      </DialogTrigger>

      {isMobile ? renderMobileForm() : renderDesktopForm()}
    </Dialog>
  );
}
