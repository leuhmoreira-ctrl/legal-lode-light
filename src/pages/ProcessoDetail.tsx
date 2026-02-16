import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProcessoComunicacoesTab } from "@/components/processo-detail/ProcessoComunicacoesTab";
import { EmailComposer } from "@/components/email/EmailComposer";
import { MovimentacoesTimeline, type Movimentacao } from "@/components/processo-detail/MovimentacoesTimeline";
import { ProcessoNotes } from "@/components/processo/ProcessoNotes";
import { DiasParadoBadge } from "@/components/processo/DiasParadoBadge";
import { RegistrarAcaoManualDialog } from "@/components/processo/RegistrarAcaoManualDialog";
import { ProcessoTarefasTab } from "@/components/processo-detail/ProcessoTarefasTab";
import { NovaTarefaProcessoDialog } from "@/components/processo-detail/NovaTarefaProcessoDialog";
import { ProcessoTaskHistory } from "@/components/processo-detail/ProcessoTaskHistory";
import { differenceInDays, format } from "date-fns";

// V2 Components
import { ProcessHeaderUnified } from "@/components/processo-detail/v2/ProcessHeaderUnified";
import { ProcessStatusCard } from "@/components/processo-detail/v2/ProcessStatusCard";
import { ProcessDocuments } from "@/components/processo-detail/v2/ProcessDocuments";

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
  const [acaoManualOpen, setAcaoManualOpen] = useState(false);

  // Sync handler
  const handleSync = useCallback(async () => {
    if (!processo || !processo.sigla_tribunal || syncing) return;
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-process", {
        body: { numeroProcesso: processo.numero, tribunal: processo.sigla_tribunal },
      });

      if (error || data?.error) {
        toast({ title: "Erro na sincronização", description: data?.error || error?.message || "Tente novamente", variant: "destructive" });
        return;
      }

      // Save movimentações
      if (data?.movimentacoes?.length > 0) {
        const movsToInsert = data.movimentacoes.map((mov: any) => ({
          processo_id: processo.id,
          data_movimento: mov.data,
          descricao: mov.descricao,
          complemento: mov.complemento || null,
        }));

        await supabase.from("movimentacoes").upsert(movsToInsert, {
          onConflict: "processo_id,data_movimento,descricao",
          ignoreDuplicates: true,
        });

        // Refresh movimentações list
        const { data: freshMovs } = await supabase
          .from("movimentacoes")
          .select("*")
          .eq("processo_id", processo.id)
          .order("data_movimento", { ascending: false });
        setMovimentacoes(freshMovs || []);
      }

      // Update processo sync timestamp
      const updateData: any = { data_ultima_sincronizacao: new Date().toISOString() };
      if (data?.movimentacoes?.[0]) {
        updateData.ultima_movimentacao = data.movimentacoes[0].data;
        updateData.descricao_movimentacao = data.movimentacoes[0].descricao;
      }
      await supabase.from("processos").update(updateData).eq("id", processo.id);
      setProcesso(prev => prev ? { ...prev, ...updateData } : prev);

      toast({ title: "Sincronização concluída", description: `${data?.movimentacoes?.length || 0} movimentações atualizadas` });
    } catch (err: any) {
      toast({ title: "Erro na sincronização", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  }, [processo, syncing, toast]);
  const [ultimaAcaoManual, setUltimaAcaoManual] = useState<string | null>(null);
  const [novaTarefaOpen, setNovaTarefaOpen] = useState(false);
  const [emailComposerOpen, setEmailComposerOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [tarefasRefreshKey, setTarefasRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState("docs");
  const [proximoPrazo, setProximoPrazo] = useState<{data: string, descricao: string} | null>(null);

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

  // Load next deadline
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data } = await supabase
        .from("kanban_tasks")
        .select("due_date, title")
        .eq("processo_id", id)
        .gte("due_date", new Date().toISOString())
        .order("due_date", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (data && data.due_date) {
        setProximoPrazo({ data: data.due_date, descricao: data.title });
      } else {
        setProximoPrazo(null);
      }
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

  // Handle Delete Process
  const handleDeleteProcess = async () => {
    if (!processo || !confirm("Tem certeza que deseja excluir este processo?")) return;
    const { error } = await supabase.from("processos").delete().eq("id", processo.id);
    if (error) {
      toast({ title: "Erro ao excluir processo", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Processo excluído com sucesso" });
      navigate("/processos");
    }
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
      <div className="space-y-8 animate-fade-up max-w-[1600px] mx-auto pb-12">
        {/* Sticky Header Container */}
        <ProcessHeaderUnified
          processoId={processo.id}
          numero={processo.numero}
          cliente={processo.cliente}
          parteContraria={processo.parte_contraria}
          advogado={processo.advogado}
          vara={processo.vara}
          comarca={processo.comarca}
          tipoAcao={processo.tipo_acao}
          dataDistribuicao={processo.data_distribuicao}
          siglaTribunal={processo.sigla_tribunal}
          sistemaTribunal={processo.sistema_tribunal}
          dataUltimaSincronizacao={processo.data_ultima_sincronizacao}
          movimentacoesCount={movimentacoes.length}
          fase={processo.fase}
          onNewTask={() => setNovaTarefaOpen(true)}
          onViewTasks={() => setActiveTab("tarefas")}
          onDelete={handleDeleteProcess}
          onEdit={() => toast({ title: "Em breve", description: "Edição rápida em desenvolvimento" })}
          className="-mx-6"
        />

        {/* Status Section */}
        <div>
          <ProcessStatusCard
            fase={processo.fase}
            dataUltimaMovimentacao={movimentacoes[0]?.data_movimento || null}
            dataUltimaSincronizacao={processo.data_ultima_sincronizacao}
            proximoPrazo={proximoPrazo}
            onViewTimeline={() => setActiveTab("timeline")}
            onSync={processo.sigla_tribunal ? handleSync : undefined}
            syncing={syncing}
          />
        </div>

        {/* Days stalled indicator (Preserved functionality) */}
        {movimentacoes.length > 0 && (() => {
          const ultimaMovDate = movimentacoes[0]?.data_movimento || null;
          const dias = ultimaMovDate ? differenceInDays(new Date(), new Date(ultimaMovDate)) : 0;
          return dias > 30 ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20">
              <DiasParadoBadge ultimaMovimentacao={ultimaMovDate} ultimaAcaoManual={ultimaAcaoManual} />
              <span className="text-xs text-orange-700 dark:text-orange-300 flex-1">
                Última movimentação: {ultimaMovDate ? format(new Date(ultimaMovDate), "dd/MM/yyyy") : "—"}
              </span>
              <Button size="sm" variant="ghost" className="text-xs h-7 hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-700 dark:text-orange-300" onClick={() => setAcaoManualOpen(true)}>
                Registrar Ação Manual
              </Button>
            </div>
          ) : null;
        })()}

        {/* Tabs Content */}
        <div className="mt-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-transparent border-b border-border/40 w-full justify-start h-auto p-0 rounded-none gap-8">
              <TabsTrigger
                value="docs"
                className="bg-transparent border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-0 py-3 shadow-none text-muted-foreground hover:text-foreground transition-all"
              >
                Documentos
              </TabsTrigger>
              <TabsTrigger
                value="tarefas"
                className="bg-transparent border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-0 py-3 shadow-none text-muted-foreground hover:text-foreground transition-all"
              >
                Tarefas
              </TabsTrigger>
              <TabsTrigger
                value="notas"
                className="bg-transparent border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-0 py-3 shadow-none text-muted-foreground hover:text-foreground transition-all"
              >
                Notas
              </TabsTrigger>
              <TabsTrigger
                value="timeline"
                className="bg-transparent border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-0 py-3 shadow-none text-muted-foreground hover:text-foreground transition-all"
              >
                Timeline <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full text-foreground font-normal">{movimentacoes.length}</span>
              </TabsTrigger>
              <TabsTrigger
                value="comunicacoes"
                className="bg-transparent border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none px-0 py-3 shadow-none text-muted-foreground hover:text-foreground transition-all"
              >
                Comunicações
              </TabsTrigger>
            </TabsList>

            <TabsContent value="docs" className="focus-visible:ring-0 outline-none mt-6">
              <ProcessDocuments processId={processo.id} />
            </TabsContent>

            <TabsContent value="tarefas" className="focus-visible:ring-0 outline-none mt-6">
              <ProcessoTarefasTab
                processoId={processo.id}
                onNewTask={() => setNovaTarefaOpen(true)}
                onViewHistory={() => setHistoryOpen(true)}
                refreshKey={tarefasRefreshKey}
              />
            </TabsContent>

            <TabsContent value="notas" className="focus-visible:ring-0 outline-none mt-6">
              <ProcessoNotes processoId={processo.id} />
            </TabsContent>

            <TabsContent value="timeline" className="focus-visible:ring-0 outline-none mt-6">
              <div ref={timelineRef}>
                <MovimentacoesTimeline movimentacoes={movimentacoes} loading={movsLoading} />
              </div>
            </TabsContent>

            <TabsContent value="comunicacoes" className="focus-visible:ring-0 outline-none mt-6">
              <ProcessoComunicacoesTab
                processoId={processo.id}
                onNewEmail={() => setEmailComposerOpen(true)}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Dialogs */}
        <RegistrarAcaoManualDialog
          processoId={processo.id}
          open={acaoManualOpen}
          onOpenChange={setAcaoManualOpen}
          onSuccess={() => {
            setUltimaAcaoManual(new Date().toISOString());
          }}
        />

        <NovaTarefaProcessoDialog
          processoId={processo.id}
          processoNumero={processo.numero}
          processoCliente={processo.cliente}
          open={novaTarefaOpen}
          onOpenChange={setNovaTarefaOpen}
          onSuccess={() => setTarefasRefreshKey((k) => k + 1)}
        />

        <ProcessoTaskHistory
          processoId={processo.id}
          open={historyOpen}
          onOpenChange={setHistoryOpen}
        />

        <EmailComposer
          open={emailComposerOpen}
          onOpenChange={setEmailComposerOpen}
          initialSubject={`Processo ${processo.numero} - ${processo.cliente}`}
        />
      </div>
    </AppLayout>
  );
}
