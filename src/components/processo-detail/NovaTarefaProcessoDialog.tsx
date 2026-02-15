import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2 } from "lucide-react";

interface NovaTarefaProcessoDialogProps {
  processoId: string;
  processoNumero: string;
  processoCliente: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function NovaTarefaProcessoDialog({
  processoId, processoNumero, processoCliente, open, onOpenChange, onSuccess,
}: NovaTarefaProcessoDialogProps) {
  const { user } = useAuth();
  const { teamMembers } = usePermissions();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prioridade, setPrioridade] = useState("medium");
  const [responsavel, setResponsavel] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");

  const reset = () => {
    setTitulo("");
    setDescricao("");
    setPrioridade("medium");
    setResponsavel("");
    setDataVencimento("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("kanban_tasks").insert({
        title: titulo,
        description: descricao || null,
        priority: prioridade,
        status: "todo",
        position_index: Date.now(),
        due_date: dataVencimento || null,
        assigned_to: responsavel || user?.id || null,
        user_id: user!.id,
        processo_id: processoId,
        event_category: "processual",
      });
      if (error) throw error;

      if (responsavel && responsavel !== user?.id) {
        await supabase.from("notifications").insert({
          user_id: responsavel,
          title: "Nova tarefa atribuída",
          message: `Tarefa "${titulo}" vinculada ao processo ${processoNumero}`,
          type: "task_assigned",
          link: "/kanban",
        });
      }

      toast({
        title: "✅ Tarefa criada!",
        description: `"${titulo}" vinculada ao processo ${processoNumero.slice(0, 20)}...`,
      });
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
        </DialogHeader>

        {/* Pre-selected processo */}
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span className="font-medium text-foreground">Processo vinculado:</span>
          </div>
          <p className="text-xs font-mono text-muted-foreground mt-1">{processoNumero}</p>
          <p className="text-xs text-muted-foreground">{processoCliente}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input placeholder="Ex: Protocolar contestação" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea placeholder="Descrição (opcional)" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Urgência</Label>
              <RadioGroup value={prioridade} onValueChange={setPrioridade} className="flex gap-3">
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="low" id="p-low" />
                  <Label htmlFor="p-low" className="text-xs font-normal cursor-pointer">Normal</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="medium" id="p-med" />
                  <Label htmlFor="p-med" className="text-xs font-normal cursor-pointer">Importante</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="high" id="p-high" />
                  <Label htmlFor="p-high" className="text-xs font-normal cursor-pointer">Urgente</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-1.5">
              <Label>Prazo</Label>
              <Input type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Atribuir para</Label>
            <Select value={responsavel} onValueChange={setResponsavel}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {teamMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Criando...</> : "Criar Tarefa"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
