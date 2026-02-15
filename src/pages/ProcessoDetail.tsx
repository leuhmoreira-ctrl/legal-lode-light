import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentUploader } from "@/components/DocumentUploader";
import { DocumentList } from "@/components/DocumentList";
import { ProcessChat } from "@/components/chat/ProcessChat";
import { ProcessoHeader } from "@/components/processo-detail/ProcessoHeader";
import { ProcessoInfoGrid } from "@/components/processo-detail/ProcessoInfoGrid";
import { SyncStatusCard } from "@/components/processo-detail/SyncStatusCard";
import { MovimentacoesTimeline, type Movimentacao } from "@/components/processo-detail/MovimentacoesTimeline";
import { SyncLogsAccordion, type SyncLog } from "@/components/processo-detail/SyncLogsAccordion";
import { ClienteCommunicationCard } from "@/components/processo/ClienteCommunicationCard";
import { ProcessoNotes } from "@/components/processo/ProcessoNotes";
import { DiasParadoBadge } from "@/components/processo/DiasParadoBadge";
import { RegistrarAcaoManualDialog } from "@/components/processo/RegistrarAcaoManualDialog";
import { differenceInDays, format } from "date-fns";

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
  sigla_tribunal: string | null;
  sistema_tribunal: string | null;
  data_ultima_sincronizacao: string | null;
}

export default function ProcessoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const timelineRef = useRef<HTMLDivElement>(null);

  const [processo, setProcesso] = useState<Processo | null>(null);
  const [loading, setLoading] = useState(true);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [movsLoading, setMovsLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [docsRefreshKey, setDocsRefreshKey] = useState(0);
  const [acaoManualOpen, setAcaoManualOpen] = useState(false);
  const [ultimaAcaoManual, setUltimaAcaoManual] = useState<string | null>(null);

  // Load processo
  useEffect(() => {
    if (!id || !user) return;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("processos")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        toast({ title: "Processo não encontrado", variant: "destructive" });
        navigate("/processos");
        return;
      }
      setProcesso(data);
      setLoading(false);
    };
    load();
  }, [id, user]);

  // Load movimentações
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setMovsLoading(true);
      const { data } = await supabase
        .from("movimentacoes")
        .select("*")
        .eq("processo_id", id)
        .order("data_movimento", { ascending: false });
      setMovimentacoes(data || []);
      setMovsLoading(false);
    };
    load();
  }, [id]);

  // Load ultima acao manual
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data } = await supabase
        .from("processo_acoes_manuais")
        .select("data_acao")
        .eq("processo_id", id)
        .order("data_acao", { ascending: false })
        .limit(1)
        .maybeSingle();
      setUltimaAcaoManual(data?.data_acao || null);
    };
    load();
  }, [id]);

  // Sync handler
  const handleSync = useCallback(async () => {
    if (!processo?.sigla_tribunal) return;
    setSyncing(true);
    const startTime = Date.now();

    try {
      const { data, error } = await supabase.functions.invoke("sync-process", {
        body: { numeroProcesso: processo.numero, tribunal: processo.sigla_tribunal },
      });

      const responseTime = Date.now() - startTime;

      if (error || data?.error) {
        setSyncLogs((prev) => [
          { timestamp: new Date().toISOString(), status: "error", movsFound: 0, responseTime, errorMessage: data?.error || error?.message },
          ...prev,
        ]);
        toast({
          title: "Erro na sincronização",
          description: data?.error || error?.message || "Falha ao conectar com o tribunal",
          variant: "destructive",
        });
        return;
      }

      // Save new movimentações (deduplicated via unique constraint)
      const newMovs = data?.movimentacoes || [];
      if (newMovs.length > 0) {
        const movsToInsert = newMovs.map((mov: any) => ({
          processo_id: processo.id,
          data_movimento: mov.data,
          descricao: mov.descricao,
          complemento: mov.complemento || null,
        }));

        await supabase.from("movimentacoes").upsert(movsToInsert, {
          onConflict: "processo_id,data_movimento,descricao",
          ignoreDuplicates: true,
        });
      }

      // Update sync timestamp
      await supabase
        .from("processos")
        .update({ data_ultima_sincronizacao: new Date().toISOString() })
        .eq("id", processo.id);

      setProcesso((prev) => prev ? { ...prev, data_ultima_sincronizacao: new Date().toISOString() } : prev);

      // Reload movimentações
      const { data: updatedMovs } = await supabase
        .from("movimentacoes")
        .select("*")
        .eq("processo_id", processo.id)
        .order("data_movimento", { ascending: false });
      setMovimentacoes(updatedMovs || []);

      setSyncLogs((prev) => [
        { timestamp: new Date().toISOString(), status: "success", movsFound: newMovs.length, responseTime: Date.now() - startTime },
        ...prev,
      ]);

      toast({
        title: "✅ Sincronização concluída",
        description: `${newMovs.length} movimentação(ões) encontrada(s)`,
      });
    } catch (err: any) {
      setSyncLogs((prev) => [
        { timestamp: new Date().toISOString(), status: "error", movsFound: 0, responseTime: Date.now() - startTime, errorMessage: err.message },
        ...prev,
      ]);
      toast({ title: "Erro na sincronização", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  }, [processo, toast]);

  const getSyncStatus = () => {
    if (!processo?.sigla_tribunal) return "not_configured" as const;
    if (syncing) return "pending" as const;
    if (!processo.data_ultima_sincronizacao) return "pending" as const;
    // If last sync was more than 24h ago, show pending
    const lastSync = new Date(processo.data_ultima_sincronizacao);
    const hoursSince = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
    return hoursSince > 24 ? "pending" as const : "synced" as const;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!processo) return null;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-up">
        {/* Header with badges */}
        <ProcessoHeader
          numero={processo.numero}
          cliente={processo.cliente}
          vara={processo.vara}
          comarca={processo.comarca}
          fase={processo.fase}
          siglaTribunal={processo.sigla_tribunal}
          sistemaTribunal={processo.sistema_tribunal}
          syncActive={!!processo.sigla_tribunal && !!processo.data_ultima_sincronizacao}
          unreadMovCount={movimentacoes.length}
          pendingPrazosCount={0}
          onScrollToTimeline={() => timelineRef.current?.scrollIntoView({ behavior: "smooth" })}
        />

        {/* Days stalled indicator */}
        {movimentacoes.length > 0 && (() => {
          const ultimaMovDate = movimentacoes[0]?.data_movimento || null;
          const dias = ultimaMovDate ? differenceInDays(new Date(), new Date(ultimaMovDate)) : 0;
          return dias > 30 ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
              <DiasParadoBadge ultimaMovimentacao={ultimaMovDate} ultimaAcaoManual={ultimaAcaoManual} />
              <span className="text-xs text-muted-foreground flex-1">
                Última movimentação: {ultimaMovDate ? format(new Date(ultimaMovDate), "dd/MM/yyyy") : "—"}
              </span>
              <Button size="sm" variant="outline" className="text-xs" onClick={() => setAcaoManualOpen(true)}>
                Registrar Ação Manual
              </Button>
            </div>
          ) : null;
        })()}

        {/* Process info */}
        <ProcessoInfoGrid processo={processo} />

        {/* Three columns: Sync + Communication | Tabs | Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <SyncStatusCard
              siglaTribunal={processo.sigla_tribunal}
              sistemaTribunal={processo.sistema_tribunal}
              lastSync={processo.data_ultima_sincronizacao}
              onSync={handleSync}
              syncing={syncing}
              syncStatus={getSyncStatus()}
            />
            <SyncLogsAccordion logs={syncLogs} />
            <ClienteCommunicationCard processoId={processo.id} />
          </div>

          <div className="lg:col-span-2">
            <Tabs defaultValue="docs" className="space-y-4">
              <TabsList>
                <TabsTrigger value="docs">Documentos</TabsTrigger>
                <TabsTrigger value="upload">Upload</TabsTrigger>
                <TabsTrigger value="notas">📝 Notas</TabsTrigger>
                <TabsTrigger value="chat">Chat</TabsTrigger>
              </TabsList>
              <TabsContent value="docs">
                <DocumentList processId={processo.id} refreshKey={docsRefreshKey} />
              </TabsContent>
              <TabsContent value="upload">
                <DocumentUploader
                  processId={processo.id}
                  onUploadComplete={() => setDocsRefreshKey((k) => k + 1)}
                />
              </TabsContent>
              <TabsContent value="notas">
                <ProcessoNotes processoId={processo.id} />
              </TabsContent>
              <TabsContent value="chat">
                <ProcessChat processoId={processo.id} processoNumero={processo.numero} />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Movimentações Timeline */}
        <div ref={timelineRef}>
          <MovimentacoesTimeline movimentacoes={movimentacoes} loading={movsLoading} />
        </div>

        {/* Manual action dialog */}
        <RegistrarAcaoManualDialog
          processoId={processo.id}
          open={acaoManualOpen}
          onOpenChange={setAcaoManualOpen}
          onSuccess={() => {
            setUltimaAcaoManual(new Date().toISOString());
          }}
        />
      </div>
    </AppLayout>
  );
}
