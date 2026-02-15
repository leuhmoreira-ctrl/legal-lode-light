import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Plus, Link2, PlusCircle, X, Loader2, Scale, Briefcase, UserRound } from "lucide-react";
import { NovoProcessoForm } from "@/components/NovoProcessoForm";
import { UserAvatar } from "@/components/UserAvatar";

interface Processo {
  id: string;
  numero: string;
  cliente: string;
}

interface NovaTarefaDialogProps {
  onSuccess?: () => void;
}

export function NovaTarefaDialog({ onSuccess }: NovaTarefaDialogProps) {
  const { user } = useAuth();
  const { teamMembers } = usePermissions();
  const { toast } = useToast();
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

  useEffect(() => {
    if (open) {
      carregarProcessos();
    }
  }, [open]);

  const carregarProcessos = async () => {
    const { data } = await supabase
      .from("processos")
      .select("id, numero, cliente")
      .order("created_at", { ascending: false });
    if (data) setProcessos(data);
  };

  const resetForm = () => {
    setTitulo("");
    setDescricao("");
    setObservacoes("");
    setPrioridade("medium");
    setResponsavel("");
    setDataVencimento("");
    setVinculoOpcao("nenhum");
    setProcessoSelecionado("");
    setEventCategory("escritorio");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      toast({ title: "Erro", description: "O título é obrigatório", variant: "destructive" });
      return;
    }
    if (vinculoOpcao === "existente" && !processoSelecionado) {
      toast({ title: "Erro", description: "Selecione um processo", variant: "destructive" });
      return;
    }
    if (vinculoOpcao === "novo" && !processoSelecionado) {
      toast({ title: "Atenção", description: "Cadastre o processo antes de criar a tarefa", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const finalCategory = vinculoOpcao !== "nenhum" ? "processual" : eventCategory;
      const { error } = await supabase.from("kanban_tasks").insert({
        title: titulo,
        description: descricao || null,
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

      // Notify assignee
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> Nova Tarefa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Nova Tarefa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input placeholder="Título da tarefa" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea placeholder="Descrição (opcional)" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={prioridade} onValueChange={setPrioridade}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
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
          </div>

          <div className="space-y-1.5">
            <Label>Data de Vencimento</Label>
            <Input type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea placeholder='Ex: "Levar procuração original", "Confirmar presença"' value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} />
          </div>

          {/* Event Category */}
          <div className="border-t pt-4 space-y-3">
            <Label className="text-sm font-semibold">Tipo de Evento *</Label>
            <RadioGroup value={eventCategory} onValueChange={(v) => setEventCategory(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="processual" id="cat-processual" />
                <Label htmlFor="cat-processual" className="font-normal cursor-pointer flex items-center gap-1.5">
                  <Scale className="h-3.5 w-3.5 text-orange-500" /> Prazo Processual
                  <span className="text-[10px] text-muted-foreground ml-1">— vinculado a processo judicial</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="escritorio" id="cat-escritorio" />
                <Label htmlFor="cat-escritorio" className="font-normal cursor-pointer flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-blue-500" /> Escritório
                  <span className="text-[10px] text-muted-foreground ml-1">— visível para toda a equipe</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pessoal" id="cat-pessoal" />
                <Label htmlFor="cat-pessoal" className="font-normal cursor-pointer flex items-center gap-1.5">
                  <UserRound className="h-3.5 w-3.5 text-violet-500" /> Pessoal
                  <span className="text-[10px] text-muted-foreground ml-1">— visível apenas para você</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Process linking section */}
          <div className="border-t pt-4 space-y-3">
            <Label className="text-sm font-semibold">Vincular a Processo (opcional)</Label>
            <RadioGroup value={vinculoOpcao} onValueChange={(v) => { setVinculoOpcao(v); if (v === "nenhum") setProcessoSelecionado(""); }}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nenhum" id="nenhum" />
                <Label htmlFor="nenhum" className="font-normal cursor-pointer flex items-center gap-1.5">
                  <X className="h-3.5 w-3.5" /> Não vincular
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <RadioGroupItem value="existente" id="existente" />
                <Label htmlFor="existente" className="font-normal cursor-pointer flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5" /> Processo existente
                </Label>
              </div>

              {vinculoOpcao === "existente" && (
                <div className="ml-6">
                  <Select value={processoSelecionado} onValueChange={setProcessoSelecionado}>
                    <SelectTrigger><SelectValue placeholder="Selecione um processo..." /></SelectTrigger>
                    <SelectContent>
                      {processos.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.numero} — {p.cliente}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <RadioGroupItem value="novo" id="novo" />
                <Label htmlFor="novo" className="font-normal cursor-pointer flex items-center gap-1.5">
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
                        <Button type="button" variant="outline" size="sm" className="gap-1.5">
                          <PlusCircle className="h-3.5 w-3.5" /> Cadastrar Processo
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Cadastrar Novo Processo</DialogTitle>
                        </DialogHeader>
                        <NovoProcessoForm
                          onSuccess={handleNovoProcessoCriado}
                          onCancel={() => setModalNovoProcesso(false)}
                        />
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              )}
            </RadioGroup>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Criando...</> : "Criar Tarefa"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
