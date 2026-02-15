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
  AlertCircle,
  Clock,
  CheckCircle2,
  Loader2,
  FolderOpen,
  Calendar,
  Paperclip,
  Trash2,
  User,
  Building2,
  Pencil,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentUploader } from "@/components/DocumentUploader";
import { DocumentList } from "@/components/DocumentList";
import { format, parseISO } from "date-fns";
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
}

interface UltimaMovimentacao {
  data_movimento: string;
  descricao: string;
  complemento: string | null;
}

export default function Processos() {
  const { user } = useAuth();
  const { isSenior } = usePermissions();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [faseFilter, setFaseFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState<string | null>(null);
  const [novoProcessoOpen, setNovoProcessoOpen] = useState(false);
  const [docsDialogOpen, setDocsDialogOpen] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Processo | null>(null);
  const [editTarget, setEditTarget] = useState<Processo | null>(null);
  const [docsRefreshKey, setDocsRefreshKey] = useState(0);
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingAll, setSyncingAll] = useState(false);
  const [ultimasMovs, setUltimasMovs] = useState<Record<string, UltimaMovimentacao>>({});
  const [syncResults, setSyncResults] = useState<Record<string, SyncResult>>({});
  const hasSyncedRef = useRef(false);
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"meus" | "todos">(() => {
    return (localStorage.getItem("processos_view_mode") as "meus" | "todos") || "meus";
  });

  const carregarUltimasMovimentacoes = useCallback(async (processoIds: string[]) => {
    if (processoIds.length === 0) return;
    const results: Record<string, UltimaMovimentacao> = {};
    for (const pid of processoIds) {
      const { data } = await supabase
        .from("movimentacoes")
        .select("data_movimento, descricao, complemento")
        .eq("processo_id", pid)
        .order("data_movimento", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) results[pid] = data;
    }
    setUltimasMovs(results);
  }, []);

  const carregarProcessos = useCallback(async () => {
    if (!user) return [];
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("processos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const procs = data || [];
      setProcessos(procs);
      if (procs.length > 0) {
        await carregarUltimasMovimentacoes(procs.map((p) => p.id));
      }
      return procs;
    } catch (err: any) {
      console.error("Erro ao carregar processos:", err);
      toast({ title: "Erro ao carregar processos", description: err.message, variant: "destructive" });
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, toast, carregarUltimasMovimentacoes]);

  const sincronizarTodos = useCallback(async (procs: Processo[]) => {
    const processosComTribunal = procs.filter((p) => p.sigla_tribunal);
    if (processosComTribunal.length === 0) return;

    setSyncingAll(true);
    let sucessos = 0;
    let erros = 0;

    for (const proc of processosComTribunal) {
      try {
        const { data, error } = await supabase.functions.invoke("sync-process", {
          body: { numeroProcesso: proc.numero, tribunal: proc.sigla_tribunal },
        });

        if (error || data?.error) {
          console.warn(`⚠️ Erro sync ${proc.numero}:`, error || data?.error);
          erros++;
          continue;
        }

        if (data) {
          setSyncResults((prev) => ({ ...prev, [proc.id]: data }));
        }

        // Save movimentações (deduplicated via unique constraint)
        if (data?.movimentacoes && data.movimentacoes.length > 0) {
          const movsToInsert = data.movimentacoes.map((mov: any) => ({
            processo_id: proc.id,
            data_movimento: mov.data,
            descricao: mov.descricao,
            complemento: mov.complemento || null,
          }));

          const { error: insertError } = await supabase
            .from("movimentacoes")
            .upsert(movsToInsert, {
              onConflict: "processo_id,data_movimento,descricao",
              ignoreDuplicates: true,
            });

          if (insertError) {
            console.error(`❌ Erro ao salvar movimentações de ${proc.numero}:`, insertError);
          }
        }

        // Update sync timestamp
        await supabase
          .from("processos")
          .update({ data_ultima_sincronizacao: new Date().toISOString() })
          .eq("id", proc.id);

        sucessos++;
      } catch (err) {
        console.error(`❌ Erro sync ${proc.numero}:`, err);
        erros++;
      }
    }

    setSyncingAll(false);

    // Reload movimentacoes
    await carregarUltimasMovimentacoes(procs.map((p) => p.id));

    if (erros > 0) {
      toast({
        title: "⚠️ Sincronização com erros",
        description: `${erros} processo(s) com erro`,
        variant: "destructive",
      });
    }
  }, [toast, carregarUltimasMovimentacoes]);

  // Load and auto-sync on mount
  useEffect(() => {
    if (!user) return;
    const init = async () => {
      const procs = await carregarProcessos();
      if (!hasSyncedRef.current && procs.length > 0) {
        hasSyncedRef.current = true;
        sincronizarTodos(procs);
      }
    };
    init();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

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
    return matchSearch && matchFase && matchView;
  });

  const meusCount = processos.filter((p) => p.user_id === user?.id || p.advogado_id === user?.id).length;
  const todosCount = processos.length;

  const getPortalLink = (proc: Processo) => {
    if (!proc.sigla_tribunal) return null;
    const sistema = detectarSistema(proc.sigla_tribunal);
    return generateDeepLink(proc.numero, proc.sigla_tribunal, sistema);
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Processos</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {processos.length} processo{processos.length !== 1 ? "s" : ""} cadastrado{processos.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2"
              disabled={syncingAll || processos.length === 0}
              onClick={() => sincronizarTodos(processos)}
            >
              <RefreshCw className={`w-4 h-4 ${syncingAll ? "animate-spin" : ""}`} />
              {syncingAll ? "Sincronizando..." : "Atualizar Todos"}
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
                    carregarProcessos();
                  }}
                  onCancel={() => setNovoProcessoOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Sync indicator */}
        {syncingAll && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Sincronizando processos com o DataJud... Isso pode levar alguns instantes.
            </AlertDescription>
          </Alert>
        )}

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
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
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
        {!loading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((proc) => {
              const portalLink = getPortalLink(proc);
              const ultimaMov = ultimasMovs[proc.id];
              const syncResult = syncResults[proc.id];

              return (
                <Card key={proc.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/processos/${proc.id}`)}>
                  {/* Header */}
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/5">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {proc.cliente}{proc.parte_contraria ? ` × ${proc.parte_contraria}` : ''}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <p className="text-xs text-muted-foreground font-mono">{proc.numero}</p>
                          <CopyProcessNumber numero={proc.numero} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{proc.vara} - {proc.comarca}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 md:gap-4">
                      <div className="text-xs">
                        <span className="text-muted-foreground">Resp: </span>
                        <span className="font-medium text-foreground">{proc.advogado}</span>
                      </div>
                      {proc.fase && (
                        <Badge variant="outline" className={`text-[10px] ${faseColor[proc.fase] || ""}`}>
                          {proc.fase}
                        </Badge>
                      )}
                      {proc.valor_causa != null && proc.valor_causa > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(proc.valor_causa)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tags + Tribunal badge */}
                  <div className="flex items-center gap-2 mt-3 ml-12 flex-wrap">
                    {proc.tags?.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                    ))}
                    <DiasParadoBadge ultimaMovimentacao={ultimaMov?.data_movimento || proc.ultima_movimentacao || null} />
                    {proc.sigla_tribunal && (
                      <Badge variant="outline" className="text-[10px] ml-auto">
                        {proc.sistema_tribunal && `${proc.sistema_tribunal} — `}
                        {proc.sigla_tribunal.toUpperCase()}
                      </Badge>
                    )}
                  </div>

                  {/* Footer — Última movimentação */}
                  <div className="mt-3 ml-12 pt-3 border-t border-border/50">
                    {ultimaMov ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Última movimentação: {format(parseISO(ultimaMov.data_movimento), "dd/MM/yyyy")}</span>
                        </div>
                        <p className="text-xs text-foreground">
                          {ultimaMov.descricao}
                          {ultimaMov.complemento && (
                            <span className="text-muted-foreground"> — {ultimaMov.complemento}</span>
                          )}
                        </p>
                      </div>
                    ) : proc.ultima_movimentacao ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Última movimentação: {format(parseISO(proc.ultima_movimentacao), "dd/MM/yyyy")}</span>
                        </div>
                        {proc.descricao_movimentacao && (
                          <p className="text-xs text-foreground">{proc.descricao_movimentacao}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {syncingAll ? "Sincronização em andamento..." : "Nenhuma movimentação registrada."}
                      </p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="mt-3 ml-12 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                    {portalLink && (
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" asChild>
                        <a href={portalLink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3.5 h-3.5" />
                          Abrir no Portal
                        </a>
                      </Button>
                    )}

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
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => setEditTarget(proc)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Editar
                    </Button>

                    {/* Delete button - only for admin/senior */}
                    {isSenior && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteTarget(proc)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Deletar
                      </Button>
                    )}
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
              carregarProcessos();
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
              carregarProcessos();
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
