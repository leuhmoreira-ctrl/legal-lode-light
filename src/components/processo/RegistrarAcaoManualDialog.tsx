import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface RegistrarAcaoManualDialogProps {
  processoId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function RegistrarAcaoManualDialog({ processoId, open, onOpenChange, onSuccess }: RegistrarAcaoManualDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [descricao, setDescricao] = useState("");
  const [dataAcao, setDataAcao] = useState(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!descricao.trim()) {
      toast({ title: "Descreva a ação realizada", variant: "destructive" });
      return;
    }
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("processo_acoes_manuais").insert({
        processo_id: processoId,
        descricao: descricao.trim(),
        data_acao: new Date(dataAcao).toISOString(),
        responsavel_id: user.id,
      });
      if (error) throw error;
      toast({ title: "✅ Ação registrada!" });
      setDescricao("");
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Ação no Processo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>O que foi feito *</Label>
            <Textarea
              placeholder="Ex: Ligação para cartório solicitando andamento"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Data</Label>
            <Input type="date" value={dataAcao} onChange={(e) => setDataAcao(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
