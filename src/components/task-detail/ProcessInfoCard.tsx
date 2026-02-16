import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Scale, MapPin, User, Calendar, ArrowRight, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface ProcessInfo {
  id: string;
  numero: string;
  cliente: string;
  parte_contraria: string | null;
  vara: string;
  comarca: string;
  fase: string | null;
  advogado: string;
  data_distribuicao: string | null;
  sigla_tribunal: string | null;
}

interface ProcessInfoCardProps {
  processoId: string;
}

export function ProcessInfoCard({ processoId }: ProcessInfoCardProps) {
  const navigate = useNavigate();
  const [processo, setProcesso] = useState<ProcessInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("processos")
        .select("id, numero, cliente, parte_contraria, vara, comarca, fase, advogado, data_distribuicao, sigla_tribunal")
        .eq("id", processoId)
        .single();
      setProcesso(data);
      setLoading(false);
    };
    load();
  }, [processoId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!processo) return null;

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Processo Vinculado</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-[13px] text-primary hover:text-primary w-full sm:w-auto justify-start sm:justify-center"
          onClick={() => navigate("/processos")}
        >
          Ver processo <ArrowRight className="w-3 h-3" />
        </Button>
      </div>

      <p className="text-sm font-mono font-medium text-foreground">{processo.numero}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
        <div>
          <span className="text-muted-foreground">Autor:</span>{" "}
          <span className="font-medium text-foreground">{processo.cliente}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Réu:</span>{" "}
          <span className="font-medium text-foreground">{processo.parte_contraria || "—"}</span>
        </div>
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground">{processo.vara} · {processo.comarca}</span>
          {processo.sigla_tribunal && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1">{processo.sigla_tribunal}</Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <User className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground">{processo.advogado}</span>
        </div>
        {processo.fase && (
          <div>
            <span className="text-muted-foreground">Fase:</span>{" "}
            <Badge variant="secondary" className="text-[10px]">{processo.fase}</Badge>
          </div>
        )}
        {processo.data_distribuicao && (
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground">
              Distribuído em {format(new Date(processo.data_distribuicao), "dd/MM/yyyy")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
