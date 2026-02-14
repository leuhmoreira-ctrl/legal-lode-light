import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  Settings,
  MoreHorizontal,
  Clock,
  Calendar,
  User,
  Scale,
  Loader2,
  CheckCircle2,
  Circle,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { format, formatDistanceToNow, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { NovoWorkflowDialog } from "@/components/workflows/NovoWorkflowDialog";
import { WorkflowApprovalActions } from "@/components/workflows/WorkflowApprovalActions";

type WorkflowStatus = "rascunho" | "em_andamento" | "concluido" | "rejeitado" | "cancelado";

interface WorkflowWithEtapas {
  id: string;
  titulo: string;
  tipo_documento: string;
  processo_id: string | null;
  status: WorkflowStatus;
  criador_id: string;
  prazo_final: string | null;
  urgencia: string;
  descricao: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  etapas: {
    id: string;
    nome: string;
    ordem: number;
    responsavel_id: string | null;
    status: string;
    concluido_em: string | null;
  }[];
  processo?: { numero: string; cliente: string } | null;
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  rascunho: { label: "Rascunho", icon: Circle, className: "bg-muted text-muted-foreground border-border" },
  em_andamento: { label: "Em Andamento", icon: Clock, className: "bg-primary/10 text-primary border-primary/20" },
  concluido: { label: "Concluído", icon: CheckCircle2, className: "bg-success/10 text-success border-success/20" },
  rejeitado: { label: "Rejeitado", icon: XCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
  cancelado: { label: "Cancelado", icon: AlertCircle, className: "bg-muted text-muted-foreground border-border" },
};

const urgenciaConfig: Record<string, { label: string; className: string }> = {
  normal: { label: "Normal", className: "bg-muted text-muted-foreground" },
  importante: { label: "Importante", className: "bg-warning/10 text-warning border-warning/20" },
  urgente: { label: "Urgente", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const tipoDocLabel: Record<string, string> = {
  peticao: "Petição",
  parecer: "Parecer",
  contrato: "Contrato",
  recurso: "Recurso",
  memorando: "Memorando",
  outro: "Outro",
};

export default function Workflows() {
  const { user } = useAuth();
  const { teamMembers, isSenior } = usePermissions();
  const { toast } = useToast();
  const [workflows, setWorkflows] = useState<WorkflowWithEtapas[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState("todos");
  const [filterUrgencia, setFilterUrgencia] = useState("todos");
  const [activeTab, setActiveTab] = useState("aguardando");
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadWorkflows = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("workflows")
        .select("*, workflow_etapas(*)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Load linked processes
      const processoIds = (data || []).map((w: any) => w.processo_id).filter(Boolean);
      let processosMap: Record<string, { numero: string; cliente: string }> = {};
      if (processoIds.length > 0) {
        const { data: processos } = await supabase
          .from("processos")
          .select("id, numero, cliente")
          .in("id", processoIds);
        if (processos) {
          processos.forEach((p: any) => {
            processosMap[p.id] = { numero: p.numero, cliente: p.cliente };
          });
        }
      }

      const formatted: WorkflowWithEtapas[] = (data || []).map((w: any) => ({
        ...w,
        tags: w.tags || [],
        etapas: (w.workflow_etapas || []).sort((a: any, b: any) => a.ordem - b.ordem),
        processo: w.processo_id ? processosMap[w.processo_id] || null : null,
      }));

      setWorkflows(formatted);
    } catch (err: any) {
      toast({ title: "Erro ao carregar workflows", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflows();
  }, [user]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("workflows-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "workflows" }, () => loadWorkflows())
      .on("postgres_changes", { event: "*", schema: "public", table: "workflow_etapas" }, () => loadWorkflows())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const getMemberName = (id: string | null) =>
    teamMembers.find((m) => m.id === id)?.full_name || "—";

  const getProgress = (etapas: WorkflowWithEtapas["etapas"]) => {
    if (etapas.length === 0) return 0;
    const done = etapas.filter((e) => e.status === "concluido").length;
    return Math.round((done / etapas.length) * 100);
  };

  const getCurrentEtapa = (etapas: WorkflowWithEtapas["etapas"]) =>
    etapas.find((e) => e.status === "em_andamento") || etapas.find((e) => e.status === "pendente");

  const isMyAction = (w: WorkflowWithEtapas) => {
    const current = getCurrentEtapa(w.etapas);
    return current?.responsavel_id === user?.id;
  };

  // Filter workflows by tab
  const filteredWorkflows = useMemo(() => {
    let list = workflows;

    // Tab filter
    switch (activeTab) {
      case "aguardando":
        list = list.filter((w) => isMyAction(w) && w.status === "em_andamento");
        break;
      case "iniciados":
        list = list.filter((w) => w.criador_id === user?.id);
        break;
      case "em_andamento":
        list = list.filter((w) => w.status === "em_andamento");
        break;
      case "concluidos":
        list = list.filter((w) => w.status === "concluido" || w.status === "rejeitado");
        break;
    }

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (w) =>
          w.titulo.toLowerCase().includes(term) ||
          w.processo?.numero?.includes(term) ||
          getMemberName(w.criador_id).toLowerCase().includes(term)
      );
    }

    // Type filter
    if (filterTipo !== "todos") {
      list = list.filter((w) => w.tipo_documento === filterTipo);
    }

    // Urgency filter
    if (filterUrgencia !== "todos") {
      list = list.filter((w) => w.urgencia === filterUrgencia);
    }

    return list;
  }, [workflows, activeTab, searchTerm, filterTipo, filterUrgencia, user]);

  const aguardandoCount = workflows.filter((w) => isMyAction(w) && w.status === "em_andamento").length;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Workflows de Aprovação</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie revisões e aprovações de documentos jurídicos
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Novo Workflow
            </Button>
          </div>
        </div>

        {/* Search and filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, processo ou responsável..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="peticao">Petição</SelectItem>
              <SelectItem value="parecer">Parecer</SelectItem>
              <SelectItem value="contrato">Contrato</SelectItem>
              <SelectItem value="recurso">Recurso</SelectItem>
              <SelectItem value="memorando">Memorando</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterUrgencia} onValueChange={setFilterUrgencia}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Urgência" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="importante">Importante</SelectItem>
              <SelectItem value="urgente">Urgente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="aguardando" className="gap-1.5">
              Aguardando Minha Ação
              {aguardandoCount > 0 && (
                <Badge variant="destructive" className="h-5 min-w-5 text-[10px] px-1.5">
                  {aguardandoCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="iniciados">Iniciados por Mim</TabsTrigger>
            <TabsTrigger value="em_andamento">Em Andamento</TabsTrigger>
            <TabsTrigger value="concluidos">Concluídos</TabsTrigger>
            <TabsTrigger value="todos">Todos</TabsTrigger>
          </TabsList>

          {["aguardando", "iniciados", "em_andamento", "concluidos", "todos"].map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredWorkflows.length === 0 ? (
                <Card className="p-8">
                  <div className="text-center text-muted-foreground">
                    <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum workflow encontrado</p>
                    <p className="text-xs mt-1">Crie um novo workflow para começar</p>
                  </div>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredWorkflows.map((w) => (
                    <WorkflowCard
                      key={w.id}
                      workflow={w}
                      getMemberName={getMemberName}
                      isMyAction={isMyAction(w)}
                      currentUserId={user?.id}
                      onRefresh={loadWorkflows}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <NovoWorkflowDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={loadWorkflows}
      />
    </AppLayout>
  );
}

// ---- Workflow Card Component ----

function WorkflowCard({
  workflow: w,
  getMemberName,
  isMyAction,
  currentUserId,
  onRefresh,
}: {
  workflow: WorkflowWithEtapas;
  getMemberName: (id: string | null) => string;
  isMyAction: boolean;
  currentUserId?: string;
  onRefresh?: () => void;
}) {
  const progress = (() => {
    if (w.etapas.length === 0) return 0;
    const done = w.etapas.filter((e) => e.status === "concluido").length;
    return Math.round((done / w.etapas.length) * 100);
  })();

  const currentEtapa = w.etapas.find((e) => e.status === "em_andamento") || w.etapas.find((e) => e.status === "pendente");

  const stCfg = statusConfig[w.status] || statusConfig.rascunho;
  const StatusIcon = stCfg.icon;
  const urgCfg = urgenciaConfig[w.urgencia] || urgenciaConfig.normal;

  const prazoVencido = w.prazo_final && isPast(new Date(w.prazo_final)) && !isToday(new Date(w.prazo_final));

  return (
    <Card className={cn("p-5 transition-shadow hover:shadow-md", isMyAction && "ring-2 ring-primary/30")}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-3">
          {/* Title row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Settings className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="font-semibold text-foreground truncate">{w.titulo}</span>
            {w.processo && (
              <span className="text-xs text-muted-foreground truncate">— {w.processo.numero}</span>
            )}
          </div>

          {/* Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {w.etapas.map((etapa, idx) => {
                const icon = etapa.status === "concluido" ? "✓" : etapa.status === "em_andamento" ? "⏳" : "⭕";
                return (
                  <span key={etapa.id} className="flex items-center gap-1">
                    {idx > 0 && <span className="text-border">→</span>}
                    <span>{getMemberName(etapa.responsavel_id).split(" ")[0]}</span>
                    <span>{icon}</span>
                  </span>
                );
              })}
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Info row */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {currentEtapa && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {getMemberName(currentEtapa.responsavel_id)}
              </span>
            )}
            {currentEtapa && (
              <span>Etapa: {currentEtapa.nome}</span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(w.updated_at), { addSuffix: true, locale: ptBR })}
            </span>
            {w.prazo_final && (
              <span className={cn("flex items-center gap-1", prazoVencido && "text-destructive font-medium")}>
                <Calendar className="w-3 h-3" />
                {prazoVencido ? "Vencido: " : "Vence: "}
                {format(new Date(w.prazo_final), "dd/MM/yyyy")}
              </span>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className={stCfg.className}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {stCfg.label}
            </Badge>
            <Badge variant="outline" className={urgCfg.className}>
              {urgCfg.label}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {tipoDocLabel[w.tipo_documento] || w.tipo_documento}
            </Badge>
            {w.tags.map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px]">
                {t}
              </Badge>
            ))}
            {isMyAction && (
              <Badge className="bg-primary text-primary-foreground text-[10px] animate-pulse">
                🎯 Sua vez
              </Badge>
            )}
          </div>

          {/* Approval actions */}
          {isMyAction && currentEtapa && w.status === "em_andamento" && (
            <WorkflowApprovalActions
              workflowId={w.id}
              workflowTitulo={w.titulo}
              etapaAtualId={currentEtapa.id}
              etapaAtualNome={currentEtapa.nome}
              etapas={w.etapas}
              onSuccess={onRefresh}
            />
          )}
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Abrir</DropdownMenuItem>
            <DropdownMenuItem>Ver histórico</DropdownMenuItem>
            <DropdownMenuItem>Duplicar</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Cancelar</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
