import { BarChart3, Clock, FileText, RefreshCw, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProcessStatusCardProps {
  fase: string | null;
  dataUltimaMovimentacao: string | null;
  dataUltimaSincronizacao: string | null;
  proximoPrazo?: {
    data: string;
    descricao: string;
  } | null;
  onViewTimeline: () => void;
  onSync?: () => Promise<void>;
  syncing?: boolean;
}

export function ProcessStatusCard({
  fase,
  dataUltimaMovimentacao,
  dataUltimaSincronizacao,
  proximoPrazo,
  onViewTimeline,
  onSync,
  syncing = false,
}: ProcessStatusCardProps) {
  return (
    <Card className="shadow-none border border-border/40 bg-card rounded-xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-muted-foreground" />
          Status do Processo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Fase Processual */}
        <div>
          <Badge variant="secondary" className="bg-[#007AFF]/10 text-[#007AFF] hover:bg-[#007AFF]/20 border-0 px-2 py-1.5 text-sm font-medium rounded-lg">
            {fase || "Não informado"}
          </Badge>
        </div>

        {/* Informações Temporais */}
        <div className="space-y-3">
          {/* Próximo Prazo */}
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {proximoPrazo ? "Próximo Prazo" : "Sem prazos pendentes"}
              </p>
              {proximoPrazo && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {proximoPrazo.descricao} em {formatDistanceToNow(new Date(proximoPrazo.data), { locale: ptBR })}
                </p>
              )}
            </div>
          </div>

          {/* Última Movimentação */}
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Última Movimentação</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {dataUltimaMovimentacao
                  ? formatDistanceToNow(new Date(dataUltimaMovimentacao), { locale: ptBR, addSuffix: true })
                  : "Nenhuma movimentação"}
              </p>
            </div>
          </div>

          {/* Sincronização */}
          <div
            className={`flex gap-3 items-start ${onSync && !syncing ? "cursor-pointer group" : ""}`}
            onClick={onSync && !syncing ? onSync : undefined}
            role={onSync ? "button" : undefined}
            tabIndex={onSync ? 0 : undefined}
            title="Clique para sincronizar"
          >
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-green-500/20 transition-colors">
              <RefreshCw className={`w-4 h-4 text-green-600 dark:text-green-400 ${syncing ? "animate-spin" : ""}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                {syncing ? "Sincronizando..." : "Sincronização"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {dataUltimaSincronizacao
                  ? formatDistanceToNow(new Date(dataUltimaSincronizacao), { locale: ptBR, addSuffix: true })
                  : "Nunca sincronizado"}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2 pb-6">
        <Button
          variant="ghost"
          className="w-full justify-between text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 font-medium"
          onClick={onViewTimeline}
        >
          Ver Timeline Completa
          <ArrowRight className="w-4 h-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
