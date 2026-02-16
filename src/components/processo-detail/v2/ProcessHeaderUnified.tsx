import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Copy,
  User,
  Shield,
  Scale,
  MapPin,
  FileText,
  Calendar,
  ArrowLeft,
  MoreVertical,
  Edit,
  ExternalLink,
  Trash2,
  Plus,
  List,
  LucideIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { generateDeepLink, detectarSistema } from "@/utils/tribunalLinks";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProcessHeaderUnifiedProps {
  processoId: string;
  numero: string;
  cliente: string;
  parteContraria: string | null;
  advogado: string;
  vara: string;
  comarca: string;
  tipoAcao: string | null;
  dataDistribuicao: string | null;
  siglaTribunal: string | null;
  sistemaTribunal: string | null;
  dataUltimaSincronizacao: string | null;
  movimentacoesCount: number;
  fase: string | null;
  onNewTask: () => void;
  onViewTasks: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  className?: string;
}

export function ProcessHeaderUnified({
  processoId,
  numero,
  cliente,
  parteContraria,
  advogado,
  vara,
  comarca,
  tipoAcao,
  dataDistribuicao,
  siglaTribunal,
  sistemaTribunal,
  onNewTask,
  onViewTasks,
  onDelete,
  onEdit,
  className = ""
}: ProcessHeaderUnifiedProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 60);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(numero);
    toast({ title: "Número copiado!", duration: 2000 });
  };

  const portalLink = siglaTribunal
    ? generateDeepLink(numero, siglaTribunal, detectarSistema(siglaTribunal))
    : null;

  const formattedDate = dataDistribuicao
    ? format(parseISO(dataDistribuicao), "dd/MM/yyyy", { locale: ptBR })
    : "Não informada";

  const Item = ({
    label,
    value,
    icon: Icon,
    colorClass,
    valueClass = "",
    className = ""
  }: {
    label: string;
    value: string;
    icon: LucideIcon;
    colorClass: string;
    valueClass?: string;
    className?: string;
  }) => (
    <div className={`flex flex-col items-start gap-1.5 ${className}`}>
      <div className="flex items-center gap-1.5">
        <Icon className={`w-3.5 h-3.5 ${colorClass}`} />
        <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wide">
          {label}
        </span>
      </div>
      <span className={`text-[16px] text-[#1D1D1F] leading-snug ${valueClass}`}>
        {value}
      </span>
    </div>
  );

  return (
    <header
      className={`
        sticky top-0 z-50 transition-all duration-200 ease-in-out
        ${isScrolled
          ? "bg-white/85 backdrop-blur-[20px] shadow-[0_2px_16px_rgba(0,0,0,0.08)] py-4"
          : "bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03),0_2px_8px_rgba(0,0,0,0.02)] py-8"
        }
        border-b border-[#F0F0F2]
        ${className}
      `}
    >
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-12">
        {/* Layer 1: Navigation & Title & Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">

          <div className="flex flex-col gap-2">
            {/* Back Button & Title Row */}
            <div className="flex items-start gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/processos")}
                className="mt-1 -ml-3 h-8 w-8 text-[#86868B] hover:text-[#1D1D1F] hover:bg-transparent"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>

              <div>
                <h1 className="text-[32px] leading-[1.2] font-bold text-[#000000] tracking-tight">
                  {cliente} <span className="text-[#86868B] font-light mx-1">×</span> {parteContraria || "Parte Contrária"}
                </h1>

                <div
                  className="flex items-center gap-2 mt-2 group cursor-pointer w-fit"
                  onClick={handleCopy}
                >
                  <span className="text-[15px] font-mono text-[#86868B] tracking-wide group-hover:text-[#007AFF] transition-colors">
                    {numero}
                  </span>
                  <Copy className="w-3.5 h-3.5 text-[#86868B] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 self-end md:self-start">
            <Button
              onClick={onNewTask}
              className="bg-[#007AFF] hover:bg-[#007AFF]/90 text-white h-10 px-4 rounded-[10px] text-[15px] font-semibold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Nova Tarefa
            </Button>

            <Button
              variant="outline"
              onClick={onViewTasks}
              className="bg-transparent text-[#007AFF] border border-[#007AFF]/30 hover:bg-[#007AFF]/5 h-10 px-4 rounded-[10px] text-[15px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <List className="w-4 h-4 mr-1.5" />
              Ver Tarefas
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 text-[#007AFF] hover:bg-[#007AFF]/10 rounded-[10px]">
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
        </div>

        {/* Layer 2: Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
          {/*
             DOM Order for Mobile: Client, Parte, Lawyer, Tipo, Vara, Dist
             Desktop Order (via flex/grid order):
               Row 1: Client | Lawyer
               Row 2: Parte  | Vara
               Row 3: Tipo   | Dist
          */}

          {/* 1. Cliente (Mobile: 1, Desktop: 1) */}
          <Item
            label="Cliente"
            value={cliente}
            icon={User}
            colorClass="text-[#007AFF]"
            valueClass="font-semibold"
            className="md:order-1"
          />

          {/* 2. Parte Contrária (Mobile: 2, Desktop: 3 -> Row 2 Col 1) */}
          <Item
            label="Parte Contrária"
            value={parteContraria || "Não informada"}
            icon={Shield}
            colorClass="text-[#FF3B30]"
            valueClass="font-semibold"
            className="md:order-3"
          />

          {/* 3. Advogado (Mobile: 3, Desktop: 2 -> Row 1 Col 2) */}
          <Item
            label="Advogado"
            value={advogado}
            icon={Scale}
            colorClass="text-[#5856D6]"
            valueClass="font-semibold"
            className="md:order-2"
          />

          {/* 4. Tipo de Ação (Mobile: 4, Desktop: 5 -> Row 3 Col 1) */}
          <Item
            label="Tipo de Ação"
            value={tipoAcao || "Não informado"}
            icon={FileText}
            colorClass="text-[#86868B]"
            className="md:order-5"
          />

          {/* 5. Vara (Mobile: 5, Desktop: 4 -> Row 2 Col 2) */}
          <Item
            label="Vara / Comarca"
            value={`${vara} — ${comarca}`}
            icon={MapPin}
            colorClass="text-[#86868B]"
            className="md:order-4"
          />

          {/* 6. Distribuição (Mobile: 6, Desktop: 6 -> Row 3 Col 2) */}
          <Item
            label="Distribuição"
            value={formattedDate}
            icon={Calendar}
            colorClass="text-[#86868B]"
            className="md:order-6"
          />
        </div>
      </div>
    </header>
  );
}
