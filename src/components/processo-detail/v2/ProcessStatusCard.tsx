import { BarChart3, Clock, FileText, RefreshCw, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
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
}

const FASE_PROGRESS: Record<string, number> = {
  'Distribuição': 10,
  'Conhecimento': 30,
  'Instrução': 50,
  'Sentença': 70,
  'Recursal': 85,
  'Execução': 95,
  'Arquivado': 100,
  'Encerrado': 100,
};

export function ProcessStatusCard({
  fase,
  dataUltimaMovimentacao,
  dataUltimaSincronizacao,
  proximoPrazo,
  onViewTimeline,
}: ProcessStatusCardProps) {
  const progress = fase && FASE_PROGRESS[fase] ? FASE_PROGRESS[fase] : 15;

  return (
    <Card className="shadow-none border border-border/40 bg-card rounded-xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-muted-foreground" />
          Status do Processo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Fase Processual */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground font-medium">Fase Processual</span>
            <span className="text-foreground font-semibold">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2 bg-muted" />
          <p className="text-xs text-muted-foreground pt-1">
            Atualmente em: <span className="font-medium text-foreground">{fase || "Não informado"}</span>
          </p>
        </div>

        {/* Informações Temporais */}
        <div className="space-y-4 pt-2">
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
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <RefreshCw className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Sincronização</p>
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
