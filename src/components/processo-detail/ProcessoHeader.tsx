import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, AlertCircle, Calendar, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { generateDeepLink, detectarSistema } from "@/utils/tribunalLinks";
import { CopyProcessNumber } from "@/components/processo/CopyProcessNumber";
import { ProcessoActionBar } from "./ProcessoActionBar";

interface ProcessoHeaderProps {
  processoId: string;
  numero: string;
  cliente: string;
  vara: string;
  comarca: string;
  fase: string | null;
  siglaTribunal: string | null;
  sistemaTribunal: string | null;
  syncActive: boolean;
  unreadMovCount: number;
  pendingPrazosCount: number;
  onScrollToTimeline: () => void;
  onNewTask: () => void;
  onViewTasks: () => void;
  onViewHistory: () => void;
}

const faseColor: Record<string, string> = {
  Conhecimento: "bg-primary/10 text-primary border-primary/20",
  Recursal: "bg-[hsl(38,92%,50%)]/10 text-[hsl(38,92%,50%)] border-[hsl(38,92%,50%)]/20",
  Execução: "bg-accent/10 text-accent border-accent/20",
  Encerrado: "bg-muted text-muted-foreground border-border",
};

export function ProcessoHeader({
  processoId, numero, cliente, vara, comarca, fase, siglaTribunal, sistemaTribunal,
  syncActive, unreadMovCount, pendingPrazosCount, onScrollToTimeline,
  onNewTask, onViewTasks, onViewHistory,
}: ProcessoHeaderProps) {
  const navigate = useNavigate();

  const portalLink = siglaTribunal
    ? generateDeepLink(numero, siglaTribunal, detectarSistema(siglaTribunal))
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={() => navigate("/processos")}>
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
      </div>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground font-mono">{numero}</h1>
            <CopyProcessNumber numero={numero} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {cliente} • {vara} — {comarca}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {fase && (
            <Badge variant="outline" className={faseColor[fase] || ""}>
              {fase}
            </Badge>
          )}
          {siglaTribunal && (
            <Badge variant="outline" className="text-xs">
              {sistemaTribunal && `${sistemaTribunal} — `}{siglaTribunal.toUpperCase()}
            </Badge>
          )}
          {syncActive && (
            <Badge variant="outline" className="bg-[hsl(152,60%,40%)]/10 text-[hsl(152,60%,40%)] border-[hsl(152,60%,40%)]/20 animate-pulse">
              <RefreshCw className="w-3 h-3 mr-1" /> Sincronização ativa
            </Badge>
          )}
          {unreadMovCount > 0 && (
            <Badge
              variant="outline"
              className="bg-[hsl(38,92%,50%)]/10 text-[hsl(38,92%,50%)] border-[hsl(38,92%,50%)]/20 cursor-pointer"
              onClick={onScrollToTimeline}
            >
              <AlertCircle className="w-3 h-3 mr-1" /> {unreadMovCount} movimentações
            </Badge>
          )}
          {pendingPrazosCount > 0 && (
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
              <Calendar className="w-3 h-3 mr-1" /> {pendingPrazosCount} prazo(s) pendente(s)
            </Badge>
          )}
          {portalLink && (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" asChild>
              <a href={portalLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3 h-3" /> Portal do Tribunal
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <ProcessoActionBar
        processoId={processoId}
        onNewTask={onNewTask}
        onViewTasks={onViewTasks}
        onViewHistory={onViewHistory}
      />
    </div>
  );
}
