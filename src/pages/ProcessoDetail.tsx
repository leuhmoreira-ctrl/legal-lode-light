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
import { ProcessoComunicacoesTab } from "@/components/processo-detail/ProcessoComunicacoesTab";
import { ProcessoHeader } from "@/components/processo-detail/ProcessoHeader";
import { ProcessoInfoGrid } from "@/components/processo-detail/ProcessoInfoGrid";
import { EmailComposer } from "@/components/email/EmailComposer";

import { MovimentacoesTimeline, type Movimentacao } from "@/components/processo-detail/MovimentacoesTimeline";

import { ClienteCommunicationCard } from "@/components/processo/ClienteCommunicationCard";
import { ProcessoNotes } from "@/components/processo/ProcessoNotes";
import { DiasParadoBadge } from "@/components/processo/DiasParadoBadge";
import { RegistrarAcaoManualDialog } from "@/components/processo/RegistrarAcaoManualDialog";
import { ProcessoTarefasTab } from "@/components/processo-detail/ProcessoTarefasTab";
import { NovaTarefaProcessoDialog } from "@/components/processo-detail/NovaTarefaProcessoDialog";
import { ProcessoTaskHistory } from "@/components/processo-detail/ProcessoTaskHistory";
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
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [docsRefreshKey, setDocsRefreshKey] = useState(0);
  const [acaoManualOpen, setAcaoManualOpen] = useState(false);
  const [ultimaAcaoManual, setUltimaAcaoManual] = useState<string | null>(null);
  const [novaTarefaOpen, setNovaTarefaOpen] = useState(false);
  const [emailComposerOpen, setEmailComposerOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [tarefasRefreshKey, setTarefasRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState("docs");

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
  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "n" || e.key === "N") { e.preventDefault(); setNovaTarefaOpen(true); }
      if (e.key === "t" || e.key === "T") { e.preventDefault(); setActiveTab("tarefas"); }
      if (e.key === "h" || e.key === "H") { e.preventDefault(); setHistoryOpen(true); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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
          processoId={processo.id}
          numero={processo.numero}
          cliente={processo.cliente}
          parteContraria={processo.parte_contraria}
          vara={processo.vara}
          comarca={processo.comarca}
          fase={processo.fase}
          siglaTribunal={processo.sigla_tribunal}
          sistemaTribunal={processo.sistema_tribunal}
          syncActive={!!processo.sigla_tribunal && !!processo.data_ultima_sincronizacao}
          unreadMovCount={movimentacoes.length}
          pendingPrazosCount={0}
          onScrollToTimeline={() => timelineRef.current?.scrollIntoView({ behavior: "smooth" })}
          onNewTask={() => setNovaTarefaOpen(true)}
          onViewTasks={() => setActiveTab("tarefas")}
          onViewHistory={() => setHistoryOpen(true)}
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
            <ClienteCommunicationCard processoId={processo.id} />
          </div>

          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="docs">Documentos</TabsTrigger>
                <TabsTrigger value="tarefas">📋 Tarefas</TabsTrigger>
                <TabsTrigger value="notas">📝 Notas</TabsTrigger>
                <TabsTrigger value="comunicacoes">💬 Comunicações</TabsTrigger>
              </TabsList>
              <TabsContent value="docs">
                <div className="space-y-6">
                  <DocumentUploader
                    processId={processo.id}
                    onUploadComplete={() => setDocsRefreshKey((k) => k + 1)}
                  />
                  <DocumentList processId={processo.id} refreshKey={docsRefreshKey} />
                </div>
              </TabsContent>
              <TabsContent value="tarefas">
                <ProcessoTarefasTab
                  processoId={processo.id}
                  onNewTask={() => setNovaTarefaOpen(true)}
                  onViewHistory={() => setHistoryOpen(true)}
                  refreshKey={tarefasRefreshKey}
                />
              </TabsContent>
              <TabsContent value="notas">
                <ProcessoNotes processoId={processo.id} />
              </TabsContent>
              <TabsContent value="comunicacoes">
                <ProcessoComunicacoesTab
                  processoId={processo.id}
                  onNewEmail={() => setEmailComposerOpen(true)}
                />
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

        {/* Nova Tarefa Dialog */}
        <NovaTarefaProcessoDialog
          processoId={processo.id}
          processoNumero={processo.numero}
          processoCliente={processo.cliente}
          open={novaTarefaOpen}
          onOpenChange={setNovaTarefaOpen}
          onSuccess={() => setTarefasRefreshKey((k) => k + 1)}
        />

        {/* Task History Dialog */}
        <ProcessoTaskHistory
          processoId={processo.id}
          open={historyOpen}
          onOpenChange={setHistoryOpen}
        />

        {/* Email Composer */}
        <EmailComposer
          open={emailComposerOpen}
          onOpenChange={setEmailComposerOpen}
          initialSubject={`Processo ${processo.numero} - ${processo.cliente}`}
        />
      </div>
    </AppLayout>
  );
}
