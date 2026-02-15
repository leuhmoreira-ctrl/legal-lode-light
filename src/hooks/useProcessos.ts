import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export function useProcessos() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: processes, isLoading, error } = useQuery({
    queryKey: ["processos", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("processos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const syncMutation = useMutation({
    mutationFn: async (procs: any[]) => {
      const processosComTribunal = procs.filter((p) => p.sigla_tribunal);
      if (processosComTribunal.length === 0) return { sucessos: 0, erros: 0, results: {} };

      let sucessos = 0;
      let erros = 0;
      const results: Record<string, any> = {};

      for (const proc of processosComTribunal) {
        try {
          // Fetch data from Edge Function
          const { data, error } = await supabase.functions.invoke("sync-process", {
            body: { numeroProcesso: proc.numero, tribunal: proc.sigla_tribunal },
          });

          if (error || data?.error) {
            console.warn(`⚠️ Erro sync ${proc.numero}:`, error || data?.error);
            erros++;
            continue;
          }

          results[proc.id] = data;

          // Prepare updates for processos table
          const updateData: any = {
            data_ultima_sincronizacao: new Date().toISOString()
          };

          if (data?.movimentacoes && data.movimentacoes.length > 0) {
            // Save movimentações
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

            // Update latest movement in processos table
            const latestMov = data.movimentacoes[0];
            updateData.ultima_movimentacao = latestMov.data;
            updateData.descricao_movimentacao = latestMov.descricao;
          }

          // Update processos table
          await supabase
            .from("processos")
            .update(updateData)
            .eq("id", proc.id);

          sucessos++;
        } catch (err) {
          console.error(`❌ Erro sync ${proc.numero}:`, err);
          erros++;
        }
      }

      return { sucessos, erros, results };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["processos"] });
      // Toasts are handled in the component usually, but we can do it here too.
      // Or return data to component.
    },
    onError: (err) => {
      console.error("Sync error:", err);
    }
  });

  return { processes, isLoading, error, syncMutation };
}
