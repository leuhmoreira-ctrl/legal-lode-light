import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { CheckCircle2, MessageSquare, XCircle, Loader2 } from "lucide-react";

type ActionType = "aprovar" | "solicitar_alteracoes" | "rejeitar";

interface WorkflowApprovalActionsProps {
  workflowId: string;
  workflowTitulo: string;
  etapaAtualId: string;
  etapaAtualNome: string;
  etapas: {
    id: string;
    nome: string;
    ordem: number;
    responsavel_id: string | null;
    status: string;
  }[];
  onSuccess?: () => void;
}

const actionConfig: Record<ActionType, { label: string; icon: React.ElementType; variant: "default" | "outline" | "destructive"; dialogTitle: string; dialogDesc: string; placeholder: string }> = {
  aprovar: {
    label: "Aprovar",
    icon: CheckCircle2,
    variant: "default",
    dialogTitle: "Aprovar Etapa",
    dialogDesc: "Confirme a aprovação desta etapa. O workflow avançará para a próxima etapa automaticamente.",
    placeholder: "Comentário de aprovação (opcional)...",
  },
  solicitar_alteracoes: {
    label: "Solicitar Alterações",
    icon: MessageSquare,
    variant: "outline",
    dialogTitle: "Solicitar Alterações",
    dialogDesc: "Descreva as alterações necessárias. A etapa anterior será reaberta.",
    placeholder: "Descreva as alterações necessárias...",
  },
  rejeitar: {
    label: "Rejeitar",
    icon: XCircle,
    variant: "destructive",
    dialogTitle: "Rejeitar Workflow",
    dialogDesc: "Esta ação encerrará o workflow como rejeitado. Tem certeza?",
    placeholder: "Motivo da rejeição...",
  },
};

export function WorkflowApprovalActions({
  workflowId,
  workflowTitulo,
  etapaAtualId,
  etapaAtualNome,
  etapas,
  onSuccess,
}: WorkflowApprovalActionsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [openAction, setOpenAction] = useState<ActionType | null>(null);
  const [comentario, setComentario] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAction = async () => {
    if (!user || !openAction) return;
    if (openAction !== "aprovar" && !comentario.trim()) {
      toast({ title: "Comentário obrigatório", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const currentEtapa = etapas.find((e) => e.id === etapaAtualId);
      if (!currentEtapa) throw new Error("Etapa não encontrada");

      if (openAction === "aprovar") {
        // Mark current step as done
        await supabase
          .from("workflow_etapas")
          .update({ status: "concluido", concluido_em: new Date().toISOString() })
          .eq("id", etapaAtualId);

        // Find next step
        const nextEtapa = etapas.find((e) => e.ordem === currentEtapa.ordem + 1);

        if (nextEtapa) {
          // Advance to next step
          await supabase
            .from("workflow_etapas")
            .update({ status: "em_andamento" })
            .eq("id", nextEtapa.id);

          // Notify next assignee
          if (nextEtapa.responsavel_id && nextEtapa.responsavel_id !== user.id) {
            await supabase.from("notifications").insert({
              user_id: nextEtapa.responsavel_id,
              title: "Sua vez no workflow",
              message: `A etapa "${nextEtapa.nome}" do workflow "${workflowTitulo}" aguarda sua ação.`,
              type: "workflow",
              link: "/workflows",
            });
          }
        } else {
          // Last step — mark workflow as done
          await supabase
            .from("workflows")
            .update({ status: "concluido" })
            .eq("id", workflowId);
        }

        // Log action
        await supabase.from("workflow_acoes").insert({
          workflow_id: workflowId,
          etapa_id: etapaAtualId,
          usuario_id: user.id,
          acao: "aprovado",
          comentario: comentario.trim() || `Etapa "${etapaAtualNome}" aprovada`,
        });

        toast({ title: nextEtapa ? "✅ Etapa aprovada! Avançando..." : "🎉 Workflow concluído!" });
      } else if (openAction === "solicitar_alteracoes") {
        // Reopen previous step
        const prevEtapa = etapas.find((e) => e.ordem === currentEtapa.ordem - 1);

        // Reset current step to pending
        await supabase
          .from("workflow_etapas")
          .update({ status: "pendente" })
          .eq("id", etapaAtualId);

        if (prevEtapa) {
          await supabase
            .from("workflow_etapas")
            .update({ status: "em_andamento", concluido_em: null })
            .eq("id", prevEtapa.id);

          // Notify previous assignee
          if (prevEtapa.responsavel_id && prevEtapa.responsavel_id !== user.id) {
            await supabase.from("notifications").insert({
              user_id: prevEtapa.responsavel_id,
              title: "Alterações solicitadas",
              message: `Alterações foram solicitadas na etapa "${prevEtapa.nome}" do workflow "${workflowTitulo}": ${comentario.trim()}`,
              type: "workflow",
              link: "/workflows",
            });
          }
        }

        await supabase.from("workflow_acoes").insert({
          workflow_id: workflowId,
          etapa_id: etapaAtualId,
          usuario_id: user.id,
          acao: "alteracoes_solicitadas",
          comentario: comentario.trim(),
        });

        toast({ title: "📝 Alterações solicitadas" });
      } else if (openAction === "rejeitar") {
        // Mark all pending/in-progress steps as cancelled
        await supabase
          .from("workflow_etapas")
          .update({ status: "cancelado" })
          .eq("workflow_id", workflowId)
          .in("status", ["pendente", "em_andamento"]);

        // Mark workflow as rejected
        await supabase
          .from("workflows")
          .update({ status: "rejeitado" })
          .eq("id", workflowId);

        // Notify creator
        const { data: wf } = await supabase
          .from("workflows")
          .select("criador_id")
          .eq("id", workflowId)
          .single();

        if (wf?.criador_id && wf.criador_id !== user.id) {
          await supabase.from("notifications").insert({
            user_id: wf.criador_id,
            title: "Workflow rejeitado",
            message: `O workflow "${workflowTitulo}" foi rejeitado: ${comentario.trim()}`,
            type: "workflow",
            link: "/workflows",
          });
        }

        await supabase.from("workflow_acoes").insert({
          workflow_id: workflowId,
          etapa_id: etapaAtualId,
          usuario_id: user.id,
          acao: "rejeitado",
          comentario: comentario.trim(),
        });

        toast({ title: "❌ Workflow rejeitado" });
      }

      setOpenAction(null);
      setComentario("");
      onSuccess?.();
    } catch (err: any) {
      toast({ title: "Erro na ação", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {(["aprovar", "solicitar_alteracoes", "rejeitar"] as ActionType[]).map((action) => {
          const cfg = actionConfig[action];
          const Icon = cfg.icon;
          return (
            <Button
              key={action}
              variant={cfg.variant}
              size="sm"
              className="gap-1.5 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                setOpenAction(action);
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {cfg.label}
            </Button>
          );
        })}
      </div>

      {openAction && (
        <Dialog open={!!openAction} onOpenChange={(v) => { if (!v) { setOpenAction(null); setComentario(""); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{actionConfig[openAction].dialogTitle}</DialogTitle>
              <DialogDescription>{actionConfig[openAction].dialogDesc}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Etapa: <span className="font-medium text-foreground">{etapaAtualNome}</span>
              </p>
              <Textarea
                placeholder={actionConfig[openAction].placeholder}
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setOpenAction(null); setComentario(""); }}>
                Cancelar
              </Button>
              <Button
                variant={actionConfig[openAction].variant}
                onClick={handleAction}
                disabled={loading}
                className="gap-1.5"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {actionConfig[openAction].label}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
