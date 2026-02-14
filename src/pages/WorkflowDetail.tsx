import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WorkflowApprovalActions } from "@/components/workflows/WorkflowApprovalActions";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  User,
  AlertCircle,
  XCircle,
  Loader2,
  MessageSquare,
  FileText,
  Scale,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Etapa {
  id: string;
  nome: string;
  ordem: number;
  responsavel_id: string | null;
  status: string;
  concluido_em: string | null;
  prazo_dias: number | null;
}

interface Acao {
  id: string;
  acao: string;
  comentario: string | null;
  created_at: string;
  usuario_id: string;
  etapa_id: string | null;
}

interface WorkflowDetail {
  id: string;
  titulo: string;
  tipo_documento: string;
  processo_id: string | null;
  status: string;
  criador_id: string;
  prazo_final: string | null;
  urgencia: string;
  descricao: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  etapas: Etapa[];
  acoes: Acao[];
  processo?: { numero: string; cliente: string } | null;
}

const statusLabels: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  rascunho: { label: "Rascunho", icon: Circle, className: "bg-muted text-muted-foreground" },
  em_andamento: { label: "Em Andamento", icon: Clock, className: "bg-primary/10 text-primary" },
  concluido: { label: "Concluído", icon: CheckCircle2, className: "bg-success/10 text-success" },
  rejeitado: { label: "Rejeitado", icon: XCircle, className: "bg-destructive/10 text-destructive" },
  cancelado: { label: "Cancelado", icon: AlertCircle, className: "bg-muted text-muted-foreground" },
};

const etapaStatusIcon: Record<string, { icon: React.ElementType; className: string }> = {
  concluido: { icon: CheckCircle2, className: "text-success" },
  em_andamento: { icon: Clock, className: "text-primary" },
  pendente: { icon: Circle, className: "text-muted-foreground" },
  cancelado: { icon: XCircle, className: "text-muted-foreground" },
};

const acaoLabels: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  criado: { label: "Workflow criado", icon: FileText, className: "text-primary" },
  aprovado: { label: "Etapa aprovada", icon: CheckCircle2, className: "text-success" },
  alteracoes_solicitadas: { label: "Alterações solicitadas", icon: MessageSquare, className: "text-warning" },
  rejeitado: { label: "Workflow rejeitado", icon: XCircle, className: "text-destructive" },
};

const tipoDocLabel: Record<string, string> = {
  peticao: "Petição",
  parecer: "Parecer",
  contrato: "Contrato",
  recurso: "Recurso",
  memorando: "Memorando",
  outro: "Outro",
};

const urgenciaLabel: Record<string, { label: string; className: string }> = {
  normal: { label: "Normal", className: "bg-muted text-muted-foreground" },
  importante: { label: "Importante", className: "bg-warning/10 text-warning" },
  urgente: { label: "Urgente", className: "bg-destructive/10 text-destructive" },
};

export default function WorkflowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { teamMembers } = usePermissions();
  const { toast } = useToast();
  const [workflow, setWorkflow] = useState<WorkflowDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const getMemberName = (uid: string | null) =>
    teamMembers.find((m) => m.id === uid)?.full_name || "—";

  const loadWorkflow = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: wf, error } = await supabase
        .from("workflows")
        .select("*, workflow_etapas(*), workflow_acoes(*)")
        .eq("id", id)
        .single();

      if (error) throw error;

      let processo = null;
      if (wf.processo_id) {
        const { data: p } = await supabase
          .from("processos")
          .select("numero, cliente")
          .eq("id", wf.processo_id)
          .single();
        processo = p;
      }

      setWorkflow({
        ...wf,
        tags: wf.tags || [],
        etapas: (wf.workflow_etapas || []).sort((a: any, b: any) => a.ordem - b.ordem),
        acoes: (wf.workflow_acoes || []).sort(
          (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
        processo,
      });
    } catch (err: any) {
      toast({ title: "Erro ao carregar workflow", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflow();
  }, [id]);

  // Realtime
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`wf-detail-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "workflows", filter: `id=eq.${id}` }, () => loadWorkflow())
      .on("postgres_changes", { event: "*", schema: "public", table: "workflow_etapas", filter: `workflow_id=eq.${id}` }, () => loadWorkflow())
      .on("postgres_changes", { event: "*", schema: "public", table: "workflow_acoes", filter: `workflow_id=eq.${id}` }, () => loadWorkflow())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!workflow) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Workflow não encontrado</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/workflows")}>
            Voltar
          </Button>
        </div>
      </AppLayout>
    );
  }

  const currentEtapa = workflow.etapas.find((e) => e.status === "em_andamento") ||
    workflow.etapas.find((e) => e.status === "pendente");
  const isMyAction = currentEtapa?.responsavel_id === user?.id;
  const stCfg = statusLabels[workflow.status] || statusLabels.rascunho;
  const StatusIcon = stCfg.icon;
  const urgCfg = urgenciaLabel[workflow.urgencia] || urgenciaLabel.normal;
  const progress = workflow.etapas.length > 0
    ? Math.round((workflow.etapas.filter((e) => e.status === "concluido").length / workflow.etapas.length) * 100)
    : 0;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-up">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/workflows")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{workflow.titulo}</h1>
              <Badge variant="outline" className={stCfg.className}>
                <StatusIcon className="w-3.5 h-3.5 mr-1" />
                {stCfg.label}
              </Badge>
              <Badge variant="outline" className={urgCfg.className}>{urgCfg.label}</Badge>
              <Badge variant="outline" className="text-xs">
                {tipoDocLabel[workflow.tipo_documento] || workflow.tipo_documento}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Criado por {getMemberName(workflow.criador_id)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatDistanceToNow(new Date(workflow.created_at), { addSuffix: true, locale: ptBR })}
              </span>
              {workflow.prazo_final && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Prazo: {format(new Date(workflow.prazo_final), "dd/MM/yyyy")}
                </span>
              )}
              {workflow.processo && (
                <span className="flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5" /> {workflow.processo.numero}
                </span>
              )}
            </div>
            {workflow.descricao && (
              <p className="text-sm text-muted-foreground mt-2">{workflow.descricao}</p>
            )}
            {workflow.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {workflow.tags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Steps flow */}
          <Card className="p-5 lg:col-span-1">
            <h3 className="font-semibold text-sm mb-1">Fluxo de Etapas</h3>
            <p className="text-xs text-muted-foreground mb-4">{progress}% concluído</p>
            <div className="space-y-0">
              {workflow.etapas.map((etapa, idx) => {
                const eCfg = etapaStatusIcon[etapa.status] || etapaStatusIcon.pendente;
                const EIcon = eCfg.icon;
                const isLast = idx === workflow.etapas.length - 1;
                return (
                  <div key={etapa.id} className="flex gap-3">
                    {/* Vertical line + icon */}
                    <div className="flex flex-col items-center">
                      <div className={cn("w-7 h-7 rounded-full flex items-center justify-center border-2",
                        etapa.status === "concluido" && "border-success bg-success/10",
                        etapa.status === "em_andamento" && "border-primary bg-primary/10",
                        etapa.status === "pendente" && "border-border bg-muted",
                        etapa.status === "cancelado" && "border-border bg-muted",
                      )}>
                        <EIcon className={cn("w-3.5 h-3.5", eCfg.className)} />
                      </div>
                      {!isLast && (
                        <div className={cn("w-0.5 flex-1 min-h-[24px]",
                          etapa.status === "concluido" ? "bg-success/40" : "bg-border"
                        )} />
                      )}
                    </div>
                    {/* Content */}
                    <div className="pb-4 flex-1 min-w-0">
                      <p className={cn("text-sm font-medium",
                        etapa.status === "em_andamento" && "text-primary",
                        etapa.status === "concluido" && "text-success",
                        (etapa.status === "pendente" || etapa.status === "cancelado") && "text-muted-foreground",
                      )}>
                        {etapa.nome}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {getMemberName(etapa.responsavel_id)}
                        {etapa.prazo_dias && ` · ${etapa.prazo_dias}d`}
                      </p>
                      {etapa.concluido_em && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Concluído {formatDistanceToNow(new Date(etapa.concluido_em), { addSuffix: true, locale: ptBR })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Approval actions */}
            {isMyAction && currentEtapa && workflow.status === "em_andamento" && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-2">🎯 Sua vez de agir</p>
                <WorkflowApprovalActions
                  workflowId={workflow.id}
                  workflowTitulo={workflow.titulo}
                  etapaAtualId={currentEtapa.id}
                  etapaAtualNome={currentEtapa.nome}
                  etapas={workflow.etapas}
                  onSuccess={loadWorkflow}
                />
              </div>
            )}
          </Card>

          {/* Center: Info */}
          <Card className="p-5 lg:col-span-1">
            <h3 className="font-semibold text-sm mb-4">Informações</h3>
            <div className="space-y-3 text-sm">
              <InfoRow label="Status">
                <Badge variant="outline" className={stCfg.className}>
                  <StatusIcon className="w-3 h-3 mr-1" />{stCfg.label}
                </Badge>
              </InfoRow>
              <InfoRow label="Tipo">{tipoDocLabel[workflow.tipo_documento] || workflow.tipo_documento}</InfoRow>
              <InfoRow label="Urgência">
                <Badge variant="outline" className={urgCfg.className}>{urgCfg.label}</Badge>
              </InfoRow>
              <InfoRow label="Criador">{getMemberName(workflow.criador_id)}</InfoRow>
              {currentEtapa && (
                <InfoRow label="Etapa Atual">
                  <span className="text-primary font-medium">{currentEtapa.nome}</span>
                </InfoRow>
              )}
              {currentEtapa && (
                <InfoRow label="Responsável Atual">{getMemberName(currentEtapa.responsavel_id)}</InfoRow>
              )}
              <InfoRow label="Progresso">{progress}%</InfoRow>
              <InfoRow label="Criado em">{format(new Date(workflow.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</InfoRow>
              {workflow.prazo_final && (
                <InfoRow label="Prazo Final">{format(new Date(workflow.prazo_final), "dd/MM/yyyy")}</InfoRow>
              )}
              {workflow.processo && (
                <>
                  <Separator />
                  <InfoRow label="Processo">{workflow.processo.numero}</InfoRow>
                  <InfoRow label="Cliente">{workflow.processo.cliente}</InfoRow>
                </>
              )}
            </div>
          </Card>

          {/* Right: Activity timeline */}
          <Card className="p-5 lg:col-span-1">
            <h3 className="font-semibold text-sm mb-4">Atividade</h3>
            {workflow.acoes.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Nenhuma atividade registrada</p>
            ) : (
              <ScrollArea className="h-[400px] pr-2">
                <div className="space-y-4">
                  {workflow.acoes.map((acao) => {
                    const aCfg = acaoLabels[acao.acao] || { label: acao.acao, icon: Circle, className: "text-muted-foreground" };
                    const AIcon = aCfg.icon;
                    return (
                      <div key={acao.id} className="flex gap-3">
                        <div className={cn("w-7 h-7 rounded-full flex items-center justify-center bg-muted shrink-0", aCfg.className)}>
                          <AIcon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{aCfg.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {getMemberName(acao.usuario_id)} · {formatDistanceToNow(new Date(acao.created_at), { addSuffix: true, locale: ptBR })}
                          </p>
                          {acao.comentario && (
                            <p className="text-xs text-muted-foreground mt-1 bg-muted/50 rounded p-2">
                              {acao.comentario}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-xs font-medium text-right">{children}</span>
    </div>
  );
}
