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
} from "lucide-react";
import { processosMock } from "@/data/mockData";
import { format, parseISO } from "date-fns";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  generateDeepLink,
  detectarSistema,
  TRIBUNAIS,
  type SistemaTribunal,
} from "@/utils/tribunalLinks";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

export default function Processos() {
  const [search, setSearch] = useState("");
  const [faseFilter, setFaseFilter] = useState("all");
  const [syncStates, setSyncStates] = useState<Record<string, SyncState>>({});
  const [tribunalMap, setTribunalMap] = useState<Record<string, string>>({});
  const [dialogOpen, setDialogOpen] = useState<string | null>(null);
  const { toast } = useToast();

  const filtered = processosMock.filter((p) => {
    const matchSearch =
      p.numero.includes(search) ||
      p.cliente.toLowerCase().includes(search.toLowerCase()) ||
      p.advogado.toLowerCase().includes(search.toLowerCase());
    const matchFase = faseFilter === "all" || p.fase === faseFilter;
    return matchSearch && matchFase;
  });

  const sincronizarProcesso = async (processoId: string, numero: string) => {
    const tribunal = tribunalMap[processoId];
    if (!tribunal) {
      toast({
        title: "Selecione o tribunal",
        description: "Escolha o tribunal antes de sincronizar.",
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

  const getPortalLink = (processoId: string, numero: string) => {
    const tribunal = tribunalMap[processoId];
    if (!tribunal) return null;
    const sistema = detectarSistema(tribunal);
    return generateDeepLink(numero, tribunal, sistema);
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Processos</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {processosMock.length} processos cadastrados
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Novo Processo
          </Button>
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

        {/* Process List */}
        <div className="space-y-3">
          {filtered.map((proc) => {
            const syncState = syncStates[proc.id];
            const portalLink = getPortalLink(proc.id, proc.numero);

            return (
              <Card
                key={proc.id}
                className="p-4 hover:shadow-md transition-shadow"
              >
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
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${faseColor[proc.fase]}`}
                    >
                      {proc.fase}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      R$ {proc.valorCausa.toLocaleString("pt-BR")}
                    </span>
                  </div>
                </div>

                {/* Tags + última movimentação */}
                <div className="flex items-center gap-2 mt-3 ml-12">
                  {proc.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    Última mov:{" "}
                    {format(parseISO(proc.ultimaMovimentacao), "dd/MM/yyyy")} —{" "}
                    {proc.descricaoMovimentacao}
                  </span>
                </div>

                {/* Integração CNJ / Portal */}
                <div className="mt-3 ml-12 pt-3 border-t border-border/50">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    {/* Tribunal select */}
                    <Select
                      value={tribunalMap[proc.id] || ""}
                      onValueChange={(val) =>
                        setTribunalMap((prev) => ({ ...prev, [proc.id]: val }))
                      }
                    >
                      <SelectTrigger className="w-full sm:w-[220px] h-8 text-xs">
                        <SelectValue placeholder="Selecione o tribunal..." />
                      </SelectTrigger>
                      <SelectContent>
                        {TRIBUNAIS.map((t) => (
                          <SelectItem key={t.sigla} value={t.sigla}>
                            {t.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5"
                        disabled={
                          !tribunalMap[proc.id] || syncState?.loading
                        }
                        onClick={() =>
                          sincronizarProcesso(proc.id, proc.numero)
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
                                  <span className="text-muted-foreground">
                                    Classe:{" "}
                                  </span>
                                  <span className="font-medium">
                                    {syncState.result.classe}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">
                                    Assunto:{" "}
                                  </span>
                                  <span className="font-medium">
                                    {syncState.result.assunto}
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                {syncState.result.movimentacoes.map(
                                  (mov, i) => (
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
                                            ? format(
                                                parseISO(mov.data),
                                                "dd/MM/yyyy HH:mm"
                                              )
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
                                  )
                                )}
                                {syncState.result.movimentacoes.length ===
                                  0 && (
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
                  </div>

                  {/* Error message */}
                  {syncState?.error && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {syncState.error}
                        {portalLink && (
                          <span>
                            {" "}
                            — Use o botão "Abrir no Portal" para consulta
                            manual.
                          </span>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
