import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  Search,
  Plus,
  FileText,
  Filter,
  ExternalLink,
  RefreshCw,
  Clock,
  CheckCircle2,
  FolderOpen,
  Calendar,
  Paperclip,
  Pencil,
  Loader2
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentUploader } from "@/components/DocumentUploader";
import { DocumentList } from "@/components/DocumentList";
import { format, parseISO } from "date-fns";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  generateDeepLink,
  detectarSistema,
} from "@/utils/tribunalLinks";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { NovoProcessoForm } from "@/components/NovoProcessoForm";
import { DeleteProcessDialog } from "@/components/DeleteProcessDialog";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { EditProcessoDialog } from "@/components/EditProcessoDialog";
import { CopyProcessNumber } from "@/components/processo/CopyProcessNumber";
import { DiasParadoBadge } from "@/components/processo/DiasParadoBadge";
import { cn } from "@/lib/utils";
import { useProcessos } from "@/hooks/useProcessos";
import { ProcessosSkeleton } from "@/components/skeletons/ProcessosSkeleton";

const faseColor: Record<string, string> = {
  Conhecimento: "bg-primary/10 text-primary border-primary/20",
  Recursal: "bg-warning/10 text-warning border-warning/20",
  Execução: "bg-accent/10 text-accent border-accent/20",
  Encerrado: "bg-muted text-muted-foreground border-border",
};

interface SyncResult {
  numero: string;
  classe: string;
  assunto: string;
  dataAjuizamento: string;
  grau: string;
  movimentacoes: Array<{
    data: string;
    descricao: string;
    complemento: string;
  }>;
}

interface Processo {
  id: string;
  numero: string;
  comarca: string;
  vara: string;
  cliente: string;
  parte_contraria: string | null;
  advogado: string;
  advogado_id: string | null;
  tipo_acao: string | null;
  valor_causa: number | null;
  fase: string | null;
  tags: string[] | null;
  data_distribuicao: string | null;
  ultima_movimentacao: string | null;
  descricao_movimentacao: string | null;
  sigla_tribunal: string | null;
  sistema_tribunal: string | null;
  user_id: string;
  [key: string]: any;
}

export default function Processos() {
  const { user } = useAuth();
  const { isSenior } = usePermissions();
  const navigate = useNavigate();
  const { toast } = useToast();

  // React Query Hook
  const { processes, isLoading, error, syncMutation } = useProcessos();
  const processos = (processes as Processo[]) || [];

  const [search, setSearch] = useState("");
  const [faseFilter, setFaseFilter] = useState("all");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [dialogOpen, setDialogOpen] = useState<string | null>(null);
  const [novoProcessoOpen, setNovoProcessoOpen] = useState(false);
  const [docsDialogOpen, setDocsDialogOpen] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Processo | null>(null);
  const [editTarget, setEditTarget] = useState<Processo | null>(null);
  const [docsRefreshKey, setDocsRefreshKey] = useState(0);
  const [syncResults, setSyncResults] = useState<Record<string, SyncResult>>({});

  const [viewMode, setViewMode] = useState<"meus" | "todos">(() => {
    const saved = localStorage.getItem("processos_view_mode") as "meus" | "todos";
    if (saved) return saved;
    // Default to 'mine' for regular users, 'all' for seniors/admins
    return isSenior ? "todos" : "meus";
  });

  const handleSyncAll = () => {
     syncMutation.mutate(processos, {
        onSuccess: (data: any) => {
            setSyncResults(prev => ({ ...prev, ...data.results }));
        }
     });
  };

  // Persist view mode
  useEffect(() => {
    localStorage.setItem("processos_view_mode", viewMode);
  }, [viewMode]);

  const filtered = processos.filter((p) => {
    const matchSearch =
      p.numero.includes(search) ||
      p.cliente.toLowerCase().includes(search.toLowerCase()) ||
      (p.parte_contraria || '').toLowerCase().includes(search.toLowerCase()) ||
      p.advogado.toLowerCase().includes(search.toLowerCase());
    const matchFase = faseFilter === "all" || p.fase === faseFilter;
    const matchView = viewMode === "todos" || p.user_id === user?.id || p.advogado_id === user?.id;

    let matchDate = true;
    if (dateStart || dateEnd) {
      if (!p.ultima_movimentacao) {
        matchDate = false;
      } else {
        const movDate = p.ultima_movimentacao.split('T')[0]; // simple YYYY-MM-DD compare
        if (dateStart && movDate < dateStart) matchDate = false;
        if (dateEnd && movDate > dateEnd) matchDate = false;
      }
    }

    return matchSearch && matchFase && matchView && matchDate;
  });

  const getPortalLink = (proc: Processo) => {
    if (!proc.sigla_tribunal) return null;
    const sistema = detectarSistema(proc.sigla_tribunal);
    return generateDeepLink(proc.numero, proc.sigla_tribunal, sistema);
  };

  const meusCount = processos.filter((p) => p.user_id === user?.id || p.advogado_id === user?.id).length;
  const todosCount = processos.length;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Processos</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {filtered.length} processo{filtered.length !== 1 ? "s" : ""} cadastrado{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              disabled={syncMutation.isPending || processos.length === 0}
              onClick={handleSyncAll}
              title={syncMutation.isPending ? "Sincronizando..." : "Atualizar Todos"}
            >
              <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
            </Button>
            <Dialog open={novoProcessoOpen} onOpenChange={setNovoProcessoOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" /> Novo Processo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Cadastrar Novo Processo</DialogTitle>
                </DialogHeader>
                <NovoProcessoForm
                  onSuccess={() => {
                    setNovoProcessoOpen(false);
                    // refetch handled by hook invalidation
                  }}
                  onCancel={() => setNovoProcessoOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Sync indicator */}
        {syncMutation.isPending && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Sincronizando processos com o DataJud... Isso pode levar alguns instantes.
            </AlertDescription>
          </Alert>
        )}

        {/* Toggle Switch - Segmented Control */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-2">
          <div className="bg-muted p-1 rounded-lg inline-flex">
            <button
              onClick={() => setViewMode("meus")}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                viewMode === "meus"
                  ? "bg-white text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Meus Processos
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px]",
                viewMode === "meus" ? "bg-primary/10 text-primary" : "bg-muted-foreground/10"
              )}>
                {meusCount}
              </span>
            </button>
            <button
              onClick={() => setViewMode("todos")}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                viewMode === "todos"
                  ? "bg-white text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Todos
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px]",
                viewMode === "todos" ? "bg-primary/10 text-primary" : "bg-muted-foreground/10"
              )}>
                {todosCount}
              </span>
            </button>
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline-block">
            {viewMode === 'meus'
              ? `Mostrando apenas processos sob sua responsabilidade`
              : `Mostrando todos os processos do escritório`}
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, cliente ou advogado..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={faseFilter} onValueChange={setFaseFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Fase" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as fases</SelectItem>
              <SelectItem value="Conhecimento">Conhecimento</SelectItem>
              <SelectItem value="Recursal">Recursal</SelectItem>
              <SelectItem value="Execução">Execução</SelectItem>
              <SelectItem value="Encerrado">Encerrado</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2 items-center">
             <Input
               type="date"
               className="w-auto"
               value={dateStart}
               onChange={e => setDateStart(e.target.value)}
               title="Data Início (Última Movimentação)"
             />
             <span className="text-muted-foreground">-</span>
             <Input
               type="date"
               className="w-auto"
               value={dateEnd}
               onChange={e => setDateEnd(e.target.value)}
               title="Data Fim (Última Movimentação)"
             />
          </div>
        </div>

        {/* Loading */}
        {isLoading && <ProcessosSkeleton />}

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <FolderOpen className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              {search || faseFilter !== "all" ? "Nenhum processo encontrado" : "Nenhum processo cadastrado"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {search || faseFilter !== "all" ? "Tente outro termo ou filtro" : "Comece cadastrando seu primeiro processo"}
            </p>
            {!search && faseFilter === "all" && (
              <Button className="mt-4 gap-2" onClick={() => setNovoProcessoOpen(true)}>
                <Plus className="w-4 h-4" /> Cadastrar Primeiro Processo
              </Button>
            )}
          </div>
        )}

        {/* Process List */}
        {!isLoading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((proc) => {
              const portalLink = getPortalLink(proc);
              const syncResult = syncResults[proc.id];

              return (
                <Card key={proc.id} className="p-0 hover:shadow-card-hover transition-all duration-200 cursor-pointer overflow-hidden border-border/60" onClick={() => navigate(`/processos/${proc.id}`)}>
                  <div className="p-5">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 shrink-0">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            {proc.fase && (
                              <Badge variant="outline" className={`text-[10px] font-semibold border-0 px-2 py-0.5 h-5 ${faseColor[proc.fase] || ""}`}>
                                {proc.fase}
                              </Badge>
                            )}
                            {proc.tags?.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-[10px] h-5 bg-secondary/50 text-secondary-foreground">{tag}</Badge>
                            ))}
                          </div>
                          <h3 className="text-base font-bold text-foreground leading-tight mb-1">
                            {proc.cliente}
                            <span className="text-muted-foreground font-normal"> vs </span>
                            {proc.parte_contraria || '...'}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-mono bg-muted/50 px-1.5 py-0.5 rounded">{proc.numero}</span>
                            <CopyProcessNumber numero={proc.numero} />
                            <span className="w-1 h-1 rounded-full bg-border" />
                            <span>{proc.vara} - {proc.comarca}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <DiasParadoBadge ultimaMovimentacao={proc.ultima_movimentacao} />
                        {proc.sigla_tribunal && (
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                              {proc.sigla_tribunal.toUpperCase()}
                            </Badge>
                            {portalLink && (
                              <a href={portalLink} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors p-1" onClick={(e) => e.stopPropagation()} title="Abrir no Portal">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Content Body */}
                    <div className="mt-4 pl-12">
                      {proc.ultima_movimentacao ? (
                        <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(parseISO(proc.ultima_movimentacao), "dd/MM/yyyy")}
                          </div>
                          {proc.descricao_movimentacao ? (
                            <p className="text-sm text-foreground line-clamp-2">{proc.descricao_movimentacao}</p>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">Descrição indisponível</p>
                          )}
                        </div>
                      ) : (
                        <div className="bg-muted/30 rounded-lg p-3 border border-border/50 text-xs text-muted-foreground italic">
                          {syncMutation.isPending ? "Sincronização em andamento..." : "Nenhuma movimentação registrada."}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between bg-muted/30 px-5 py-3 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                       <span className="font-medium">Responsável:</span> {proc.advogado}
                    </div>
                    <div className="flex gap-2">

                    {syncResult && (
                      <Dialog
                        open={dialogOpen === proc.id}
                        onOpenChange={(open) => setDialogOpen(open ? proc.id : null)}
                      >
                        <DialogTrigger asChild>
                          <Button variant="secondary" size="sm" className="h-8 text-xs gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Ver Movimentações
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="text-lg">Movimentações — {proc.numero}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-2 mt-4">
                            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                              <div>
                                <span className="text-muted-foreground">Classe: </span>
                                <span className="font-medium">{syncResult.classe}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Assunto: </span>
                                <span className="font-medium">{syncResult.assunto}</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {syncResult.movimentacoes.map((mov, i) => (
                                <div key={i} className="flex gap-3 p-3 rounded-lg bg-muted/50 text-sm">
                                  <div className="flex flex-col items-center">
                                    <Clock className="w-4 h-4 text-primary" />
                                    <div className="w-px h-full bg-border mt-1" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground">
                                      {mov.data ? format(parseISO(mov.data), "dd/MM/yyyy HH:mm") : "Data não informada"}
                                    </p>
                                    <p className="font-medium mt-0.5">{mov.descricao}</p>
                                    {mov.complemento && (
                                      <p className="text-xs text-muted-foreground mt-0.5">{mov.complemento}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {syncResult.movimentacoes.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  Nenhuma movimentação encontrada.
                                </p>
                              )}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}

                    {/* Documents button */}
                    <Dialog
                      open={docsDialogOpen === proc.id}
                      onOpenChange={(open) => setDocsDialogOpen(open ? proc.id : null)}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                          <Paperclip className="w-3.5 h-3.5" />
                          Documentos
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Documentos — {proc.numero}</DialogTitle>
                        </DialogHeader>
                        <Tabs defaultValue="list" className="mt-4">
                          <TabsList>
                            <TabsTrigger value="list">Documentos</TabsTrigger>
                            <TabsTrigger value="upload">Upload</TabsTrigger>
                          </TabsList>
                          <TabsContent value="list" className="mt-4">
                            <DocumentList processId={proc.id} refreshKey={docsRefreshKey} />
                          </TabsContent>
                          <TabsContent value="upload" className="mt-4">
                            <DocumentUploader
                              processId={proc.id}
                              onUploadComplete={() => setDocsRefreshKey(k => k + 1)}
                            />
                          </TabsContent>
                        </Tabs>
                      </DialogContent>
                    </Dialog>

                    {/* Edit button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-50 hover:opacity-100"
                      onClick={() => setEditTarget(proc)}
                      title="Editar processo"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Edit process dialog */}
        {editTarget && (
          <EditProcessoDialog
            processo={editTarget}
            open={!!editTarget}
            onOpenChange={(open) => { if (!open) setEditTarget(null); }}
            onSuccess={() => {
              setEditTarget(null);
              // refetch handled by hook invalidation
            }}
            canDelete={isSenior}
            onDelete={() => {
              setDeleteTarget(editTarget);
              setEditTarget(null);
            }}
          />
        )}

        {/* Delete process dialog */}
        {deleteTarget && (
          <DeleteProcessDialog
            processo={deleteTarget}
            open={!!deleteTarget}
            onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
            onDeleted={() => {
              setDeleteTarget(null);
              // refetch handled by hook invalidation
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
