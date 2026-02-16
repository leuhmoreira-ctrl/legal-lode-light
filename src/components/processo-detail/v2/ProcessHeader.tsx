import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, MoreVertical, Copy, Building, RefreshCw, Activity,
  Calendar, Edit, ExternalLink, Trash2, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { generateDeepLink, detectarSistema } from "@/utils/tribunalLinks";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProcessHeaderProps {
  processoId: string;
  numero: string;
  cliente: string;
  parteContraria: string | null;
  siglaTribunal: string | null;
  sistemaTribunal: string | null;
  dataUltimaSincronizacao: string | null;
  movimentacoesCount: number;
  fase: string | null;
  onNewTask: () => void;
  onViewTasks: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
}

export function ProcessHeader({
  processoId,
  numero,
  cliente,
  parteContraria,
  siglaTribunal,
  sistemaTribunal,
  dataUltimaSincronizacao,
  movimentacoesCount,
  fase,
  onNewTask,
  onViewTasks,
  onDelete,
  onEdit,
}: ProcessHeaderProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(numero);
    toast({ title: "Número copiado!" });
  };

  const portalLink = siglaTribunal
    ? generateDeepLink(numero, siglaTribunal, detectarSistema(siglaTribunal))
    : null;

  const timeSinceSync = dataUltimaSincronizacao
    ? formatDistanceToNow(new Date(dataUltimaSincronizacao), { locale: ptBR, addSuffix: true })
    : "Nunca";

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/processos")}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground transition-colors">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="w-4 h-4 mr-2" /> Editar processo
            </DropdownMenuItem>
            {portalLink && (
              <DropdownMenuItem onClick={() => window.open(portalLink, '_blank', 'noopener,noreferrer')}>
                <ExternalLink className="w-4 h-4 mr-2" /> Portal do Tribunal
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="w-4 h-4 mr-2" /> Excluir processo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main Content */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-2">
          {/* Title */}
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            {cliente} <span className="text-muted-foreground font-light">×</span> {parteContraria || "Parte Contrária"}
          </h1>

          {/* Process Number */}
          <div className="flex items-center gap-2 group cursor-pointer" onClick={handleCopy}>
            <span className="text-sm font-mono text-muted-foreground group-hover:text-foreground transition-colors">
              {numero}
            </span>
            <Copy className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Inline Metadata */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground pt-1">
            {siglaTribunal && (
              <div className="flex items-center gap-1.5">
                <Building className="w-4 h-4 text-muted-foreground/70" />
                <span>{sistemaTribunal ? `${sistemaTribunal} — ` : ''}{siglaTribunal.toUpperCase()}</span>
              </div>
            )}

            {dataUltimaSincronizacao && (
              <div className="flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4 text-muted-foreground/70" />
                <span>Sincronizado {timeSinceSync}</span>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-muted-foreground/70" />
              <span>{movimentacoesCount} movimentações</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {fase && (
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 border-0 px-3 py-1.5 text-xs font-medium rounded-full">
              {fase}
            </Badge>
          )}

          <Button
            variant="secondary"
            size="sm"
            className="bg-muted hover:bg-muted/80 text-foreground border-0 gap-1.5 h-8 px-3 rounded-full text-xs font-medium transition-all"
            onClick={onNewTask}
          >
            <Plus className="w-3.5 h-3.5" /> Nova Tarefa
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground gap-1.5 h-8 px-3 rounded-full text-xs font-medium transition-all"
            onClick={onViewTasks}
          >
            <Calendar className="w-3.5 h-3.5" /> Ver Tarefas
          </Button>
        </div>
      </div>
    </div>
  );
}
