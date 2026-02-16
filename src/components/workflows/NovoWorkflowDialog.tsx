import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Trash2,
  Loader2,
  ChevronRight,
  ChevronLeft,
  GripVertical,
} from "lucide-react";

interface Processo {
  id: string;
  numero: string;
  cliente: string;
}

interface EtapaForm {
  nome: string;
  responsavel_id: string;
  prazo_dias: number;
}

const TEMPLATES: Record<string, EtapaForm[]> = {
  simples: [
    { nome: "Redação", responsavel_id: "", prazo_dias: 3 },
    { nome: "Aprovação", responsavel_id: "", prazo_dias: 1 },
  ],
  padrao: [
    { nome: "Redação", responsavel_id: "", prazo_dias: 3 },
    { nome: "Revisão", responsavel_id: "", prazo_dias: 2 },
    { nome: "Aprovação Final", responsavel_id: "", prazo_dias: 1 },
  ],
  completo: [
    { nome: "Redação", responsavel_id: "", prazo_dias: 3 },
    { nome: "Revisão Técnica", responsavel_id: "", prazo_dias: 2 },
    { nome: "Revisão Jurídica", responsavel_id: "", prazo_dias: 2 },
    { nome: "Aprovação Sócio", responsavel_id: "", prazo_dias: 1 },
  ],
};

interface NovoWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  preselectedProcessoId?: string;
}

export function NovoWorkflowDialog({
  open,
  onOpenChange,
  onSuccess,
  preselectedProcessoId,
}: NovoWorkflowDialogProps) {
  const { user } = useAuth();
  const { teamMembers } = usePermissions();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1 fields
  const [titulo, setTitulo] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState("peticao");
  const [processoId, setProcessoId] = useState(preselectedProcessoId || "");
  const [descricao, setDescricao] = useState("");
  const [prazoFinal, setPrazoFinal] = useState("");
  const [urgencia, setUrgencia] = useState("normal");
  const [tagsInput, setTagsInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);

  // Step 2 fields
  const [template, setTemplate] = useState("padrao");
  const [etapas, setEtapas] = useState<EtapaForm[]>([...TEMPLATES.padrao]);

  const [processos, setProcessos] = useState<Processo[]>([]);

  useEffect(() => {
    if (open) {
      loadProcessos();
      if (preselectedProcessoId) setProcessoId(preselectedProcessoId);
    }
  }, [open]);

  useEffect(() => {
    setEtapas([...(TEMPLATES[template] || TEMPLATES.padrao)]);
  }, [template]);

  const loadProcessos = async () => {
    const { data } = await supabase
      .from("processos")
      .select("id, numero, cliente")
      .order("created_at", { ascending: false });
    if (data) setProcessos(data);
  };

  const resetForm = () => {
    setStep(1);
    setTitulo("");
    setTipoDocumento("peticao");
    setProcessoId(preselectedProcessoId || "");
    setDescricao("");
    setPrazoFinal("");
    setUrgencia("normal");
    setTags([]);
    setTagsInput("");
    setFile(null);
    setTemplate("padrao");
    setEtapas([...TEMPLATES.padrao]);
  };

  const addTag = () => {
    const trimmed = tagsInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagsInput("");
    }
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const addEtapa = () => {
    setEtapas([...etapas, { nome: "", responsavel_id: "", prazo_dias: 2 }]);
  };

  const removeEtapa = (idx: number) => {
    if (etapas.length <= 2) {
      toast({ title: "Mínimo 2 etapas", variant: "destructive" });
      return;
    }
    setEtapas(etapas.filter((_, i) => i !== idx));
  };

  const updateEtapa = (idx: number, field: keyof EtapaForm, value: any) => {
    setEtapas(etapas.map((e, i) => (i === idx ? { ...e, [field]: value } : e)));
  };

  const validateStep1 = () => {
    if (!titulo.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return false;
    }
    if (!prazoFinal) {
      toast({ title: "Prazo final obrigatório", variant: "destructive" });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    for (let i = 0; i < etapas.length; i++) {
      if (!etapas[i].nome.trim()) {
        toast({ title: `Etapa ${i + 1}: nome obrigatório`, variant: "destructive" });
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;
    setLoading(true);
    try {
      // Create workflow
      const { data: wf, error: wfErr } = await supabase
        .from("workflows")
        .insert({
          titulo,
          tipo_documento: tipoDocumento,
          processo_id: processoId || null,
          status: "em_andamento",
          criador_id: user!.id,
          prazo_final: prazoFinal || null,
          urgencia,
          descricao: descricao || null,
          tags,
        })
        .select("id")
        .single();

      if (wfErr) throw wfErr;

      // Upload file if exists
      let storagePath = null;
      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const path = `${user!.id}/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from("workflow-documents")
          .upload(path, file);

        if (uploadError) throw uploadError;
        storagePath = path;
      }

      // Create etapas
      const etapasToInsert = etapas.map((e, idx) => ({
        workflow_id: wf.id,
        ordem: idx,
        nome: e.nome,
        responsavel_id: e.responsavel_id || null,
        status: idx === 0 ? "em_andamento" : "pendente",
        prazo_dias: e.prazo_dias,
      }));

      const { error: etErr } = await supabase.from("workflow_etapas").insert(etapasToInsert);
      if (etErr) throw etErr;

      // Create initial version
      await supabase.from("workflow_versoes").insert({
        workflow_id: wf.id,
        numero_versao: 1,
        autor_id: user!.id,
        motivo: "Criação do workflow",
        storage_path: storagePath,
        file_type: file?.type,
        file_name: file?.name,
      });

      // Log action
      await supabase.from("workflow_acoes").insert({
        workflow_id: wf.id,
        usuario_id: user!.id,
        acao: "criado",
        comentario: `Workflow "${titulo}" criado${file ? ` com arquivo: ${file.name}` : ""}`,
      });

      // Notify first stage assignee
      const firstAssignee = etapas[0]?.responsavel_id;
      if (firstAssignee && firstAssignee !== user!.id) {
        await supabase.from("notifications").insert({
          user_id: firstAssignee,
          title: "Novo workflow atribuído",
          message: `Você foi designado para a etapa "${etapas[0].nome}" do workflow "${titulo}"`,
          type: "workflow",
          link: "/workflows",
        });
      }

      toast({ title: "✅ Workflow criado com sucesso!" });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast({ title: "Erro ao criar workflow", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Novo Workflow — Etapa {step} de 2
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input placeholder="Ex: Contestação Trabalhista" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo de documento *</Label>
                <Select value={tipoDocumento} onValueChange={setTipoDocumento}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="peticao">Petição</SelectItem>
                    <SelectItem value="parecer">Parecer</SelectItem>
                    <SelectItem value="contrato">Contrato</SelectItem>
                    <SelectItem value="recurso">Recurso</SelectItem>
                    <SelectItem value="memorando">Memorando</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Processo vinculado</Label>
                <Select value={processoId} onValueChange={setProcessoId}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {processos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.numero} — {p.cliente}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea placeholder="Objetivo do workflow..." value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} />
            </div>

            <div className="space-y-1.5">
              <Label>Arquivo (PDF/DOCX)</Label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file && (
                <p className="text-xs text-muted-foreground mt-1">
                  Selecionado: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Prazo final *</Label>
                <Input type="date" value={prazoFinal} onChange={(e) => setPrazoFinal(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Urgência</Label>
                <RadioGroup value={urgencia} onValueChange={setUrgencia} className="flex gap-4 pt-2">
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="normal" id="urg-normal" />
                    <Label htmlFor="urg-normal" className="font-normal text-sm cursor-pointer">Normal</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="importante" id="urg-importante" />
                    <Label htmlFor="urg-importante" className="font-normal text-sm cursor-pointer">Importante</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="urgente" id="urg-urgente" />
                    <Label htmlFor="urg-urgente" className="font-normal text-sm cursor-pointer">Urgente</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Adicionar tag..."
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                />
                <Button type="button" variant="outline" size="sm" onClick={addTag}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {tags.map((t) => (
                    <Badge key={t} variant="secondary" className="cursor-pointer" onClick={() => removeTag(t)}>
                      {t} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => { if (validateStep1()) setStep(2); }} className="gap-1.5">
                Próximo <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {/* Template selector */}
            <div className="space-y-1.5">
              <Label>Template de fluxo</Label>
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="simples">Simples (2 etapas)</SelectItem>
                  <SelectItem value="padrao">Padrão (3 etapas)</SelectItem>
                  <SelectItem value="completo">Completo (4 etapas)</SelectItem>
                  <SelectItem value="customizado">Customizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Etapas */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Etapas do Fluxo</Label>
              {etapas.map((etapa, idx) => (
                <div key={idx} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground">ETAPA {idx + 1}</span>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeEtapa(idx)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Nome *</Label>
                      <Input
                        value={etapa.nome}
                        onChange={(e) => updateEtapa(idx, "nome", e.target.value)}
                        placeholder="Ex: Redação"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Responsável</Label>
                      <Select value={etapa.responsavel_id} onValueChange={(v) => updateEtapa(idx, "responsavel_id", v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {teamMembers.map((m) => (
                            <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Prazo (dias)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={etapa.prazo_dias}
                        onChange={(e) => updateEtapa(idx, "prazo_dias", parseInt(e.target.value) || 1)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addEtapa} className="gap-1.5 w-full">
                <Plus className="w-3.5 h-3.5" /> Adicionar Etapa
              </Button>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-1.5">
                <ChevronLeft className="w-4 h-4" /> Voltar
              </Button>
              <Button onClick={handleSubmit} disabled={loading} className="gap-1.5">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando...</> : "Criar Workflow"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
