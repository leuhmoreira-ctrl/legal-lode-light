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
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  generateDeepLink,
  detectarSistema,
} from "@/utils/tribunalLinks";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { NovoProcessoForm } from "@/components/NovoProcessoForm";
import { useAuth } from "@/contexts/AuthContext";

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

interface SyncState {
  loading: boolean;
  error: string | null;
  result: SyncResult | null;
}

interface Processo {
  id: string;
  numero: string;
  comarca: string;
  vara: string;
  cliente: string;
  parte_contraria: string | null;
  advogado: string;
  tipo_acao: string | null;
  valor_causa: number | null;
  fase: string | null;
  tags: string[] | null;
  data_distribuicao: string | null;
  ultima_movimentacao: string | null;
  descricao_movimentacao: string | null;
  sigla_tribunal: string | null;
  sistema_tribunal: string | null;
}

interface UltimaMovimentacao {
  data_movimento: string;
  descricao: string;
  complemento: string | null;
}

export default function Processos() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [faseFilter, setFaseFilter] = useState("all");
  const [syncStates, setSyncStates] = useState<Record<string, SyncState>>({});
  const [dialogOpen, setDialogOpen] = useState<string | null>(null);
  const [novoProcessoOpen, setNovoProcessoOpen] = useState(false);
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [loading, setLoading] = useState(true);
  const [ultimasMovs, setUltimasMovs] = useState<Record<string, UltimaMovimentacao>>({});
  const { toast } = useToast();

  const carregarProcessos = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("processos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProcessos(data || []);
    } catch (err: any) {
      console.error("Erro ao carregar processos:", err);
      toast({
        title: "Erro ao carregar processos",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const carregarUltimasMovimentacoes = useCallback(async (processoIds: string[]) => {
    if (processoIds.length === 0) return;
    
    const results: Record<string, UltimaMovimentacao> = {};
    
    // Fetch latest movimentacao for each processo
    for (const pid of processoIds) {
      const { data } = await supabase
        .from("movimentacoes")
        .select("data_movimento, descricao, complemento")
        .eq("processo_id", pid)
        .order("data_movimento", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (data) {
        results[pid] = data;
      }
    }
    
    setUltimasMovs(results);
  }, []);

  useEffect(() => {
    carregarProcessos();
  }, [carregarProcessos]);

  useEffect(() => {
    if (processos.length > 0) {
      carregarUltimasMovimentacoes(processos.map((p) => p.id));
    }
  }, [processos, carregarUltimasMovimentacoes]);

  const filtered = processos.filter((p) => {
    const matchSearch =
      p.numero.includes(search) ||
      p.cliente.toLowerCase().includes(search.toLowerCase()) ||
      p.advogado.toLowerCase().includes(search.toLowerCase());
    const matchFase = faseFilter === "all" || p.fase === faseFilter;
    return matchSearch && matchFase;
  });

  const sincronizarProcesso = async (processoId: string, numero: string, tribunal: string) => {
    if (!tribunal) {
      toast({
        title: "Tribunal não definido",
        description: "Este processo não possui tribunal cadastrado.",
        variant: "destructive",
      });
      return;
    }

    setSyncStates((prev) => ({
      ...prev,
      [processoId]: { loading: true, error: null, result: null },
    }));

    try {
      const { data, error } = await supabase.functions.invoke("sync-process", {
        body: { numeroProcesso: numero, tribunal },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSyncStates((prev) => ({
        ...prev,
        [processoId]: { loading: false, error: null, result: data },
      }));

      // Reload movimentacoes for this processo
      await carregarUltimasMovimentacoes([processoId]);

      toast({
        title: "✅ Sincronização concluída!",
        description: `${data.movimentacoes?.length || 0} movimentações encontradas`,
      });
    } catch (err: any) {
      const errorMsg = err.message || "Erro desconhecido";
      setSyncStates((prev) => ({
        ...prev,
        [processoId]: { loading: false, error: errorMsg, result: null },
      }));
      toast({
        title: "Erro na sincronização",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

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
              {search || faseFilter !== "all"
                ? "Nenhum processo encontrado"
                : "Nenhum processo cadastrado"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {search || faseFilter !== "all"
                ? "Tente buscar por outro termo ou filtro"
                : "Comece cadastrando seu primeiro processo"}
            </p>
            {!search && faseFilter === "all" && (
              <Button
                className="mt-4 gap-2"
                onClick={() => setNovoProcessoOpen(true)}
              >
                <Plus className="w-4 h-4" /> Cadastrar Primeiro Processo
              </Button>
            )}
          </div>
        )}

        {/* Process List */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((proc) => {
              const syncState = syncStates[proc.id];
              const portalLink = getPortalLink(proc);
              const ultimaMov = ultimasMovs[proc.id];

              return (
                <Card
                  key={proc.id}
                  className="p-4 hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/5">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground font-mono">
                          {proc.numero}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {proc.vara} - {proc.comarca}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 md:gap-4">
                      <div className="text-xs">
                        <span className="text-muted-foreground">Cliente: </span>
                        <span className="font-medium text-foreground">
                          {proc.cliente}
                        </span>
                      </div>
                      <div className="text-xs">
                        <span className="text-muted-foreground">Resp: </span>
                        <span className="font-medium text-foreground">
                          {proc.advogado}
                        </span>
                      </div>
                      {proc.fase && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${faseColor[proc.fase] || ""}`}
                        >
                          {proc.fase}
                        </Badge>
                      )}
                      {proc.valor_causa != null && proc.valor_causa > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(proc.valor_causa)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tags + Tribunal badge */}
                  <div className="flex items-center gap-2 mt-3 ml-12 flex-wrap">
                    {proc.tags?.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-[10px]"
                      >
                        {tag}
                      </Badge>
                    ))}
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
                          <span>
                            Última movimentação:{" "}
                            {format(parseISO(ultimaMov.data_movimento), "dd/MM/yyyy")}
                          </span>
                        </div>
                        <p className="text-xs text-foreground">
                          {ultimaMov.descricao}
                          {ultimaMov.complemento && (
                            <span className="text-muted-foreground">
                              {" "}— {ultimaMov.complemento}
                            </span>
                          )}
                        </p>
                      </div>
                    ) : proc.ultima_movimentacao ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            Última movimentação:{" "}
                            {format(parseISO(proc.ultima_movimentacao), "dd/MM/yyyy")}
                          </span>
                        </div>
                        {proc.descricao_movimentacao && (
                          <p className="text-xs text-foreground">
                            {proc.descricao_movimentacao}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Nenhuma movimentação registrada. Sincronize para buscar dados.
                      </p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="mt-3 ml-12 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      disabled={!proc.sigla_tribunal || syncState?.loading}
                      onClick={() =>
                        sincronizarProcesso(proc.id, proc.numero, proc.sigla_tribunal || "")
                      }
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${
                          syncState?.loading ? "animate-spin" : ""
                        }`}
                      />
                      {syncState?.loading
                        ? "Sincronizando..."
                        : "Buscar no DataJud"}
                    </Button>

                    {portalLink && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5"
                        asChild
                      >
                        <a
                          href={portalLink}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Abrir no Portal
                        </a>
                      </Button>
                    )}

                    {syncState?.result && (
                      <Dialog
                        open={dialogOpen === proc.id}
                        onOpenChange={(open) =>
                          setDialogOpen(open ? proc.id : null)
                        }
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 text-xs gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Ver Movimentações
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="text-lg">
                              Movimentações — {proc.numero}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-2 mt-4">
                            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                              <div>
                                <span className="text-muted-foreground">Classe: </span>
                                <span className="font-medium">
                                  {syncState.result.classe}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Assunto: </span>
                                <span className="font-medium">
                                  {syncState.result.assunto}
                                </span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {syncState.result.movimentacoes.map((mov, i) => (
                                <div
                                  key={i}
                                  className="flex gap-3 p-3 rounded-lg bg-muted/50 text-sm"
                                >
                                  <div className="flex flex-col items-center">
                                    <Clock className="w-4 h-4 text-primary" />
                                    <div className="w-px h-full bg-border mt-1" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground">
                                      {mov.data
                                        ? format(parseISO(mov.data), "dd/MM/yyyy HH:mm")
                                        : "Data não informada"}
                                    </p>
                                    <p className="font-medium mt-0.5">
                                      {mov.descricao}
                                    </p>
                                    {mov.complemento && (
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        {mov.complemento}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {syncState.result.movimentacoes.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  Nenhuma movimentação encontrada.
                                </p>
                              )}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>

                  {/* Error message */}
                  {syncState?.error && (
                    <Alert variant="destructive" className="mt-2 ml-12">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {syncState.error}
                        {portalLink && (
                          <span>
                            {" "}— Use o botão "Abrir no Portal" para consulta manual.
                          </span>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
