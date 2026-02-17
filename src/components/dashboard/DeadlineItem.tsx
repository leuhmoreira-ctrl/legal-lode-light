import { Prazo } from "@/data/mockData";
import { format, differenceInDays, parseISO, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  Clock,
  FileText,
  Calendar,
  Scale,
  Gavel,
  FileCheck,
  Users,
  ArrowUpRight,
  CheckCircle2
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

interface DeadlineItemProps {
  prazo: Prazo;
}

// Helper for initials
const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
};

// Helper for avatar color
const getAvatarColor = (name: string) => {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-orange-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-cyan-500",
    "bg-emerald-500"
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  return colors[Math.abs(hash) % colors.length];
};

// Helper for task type icon
const getTaskIcon = (type: string) => {
  switch (type) {
    case "Processual": return FileText;
    case "Audiência": return Gavel;
    case "Administrativo": return FileCheck;
    case "Reunião": return Users;
    default: return FileText;
  }
};

export function DeadlineItem({ prazo }: DeadlineItemProps) {
  const isMobile = useIsMobile();
  const today = new Date();
  const dueDate = parseISO(prazo.dataVencimento);
  const createdDate = prazo.dataCriacao ? parseISO(prazo.dataCriacao) : new Date(); // Fallback if missing

  const daysRemaining = differenceInDays(dueDate, today);
  const isOverdue = isPast(dueDate) && !isToday(dueDate);
  const isDueToday = isToday(dueDate);

  // Calculate progress
  const totalDuration = differenceInDays(dueDate, createdDate);
  const elapsed = differenceInDays(today, createdDate);
  let progress = 0;

  if (totalDuration > 0) {
    progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  } else if (isOverdue) {
    progress = 100;
  }

  // Visual variants based on urgency
  let badgeVariant = "";
  let progressClass = "";
  let statusText = "";
  let statusIcon = null;

  if (prazo.status === "urgente") {
    badgeVariant = "bg-[#FF3B30]/10 text-[#FF3B30] hover:bg-[#FF3B30]/20 border-0";
    progressClass = "bg-[#FF3B30]";
    statusText = "Urgente";
    statusIcon = <AlertTriangle className="w-3 h-3 mr-1" />;
  } else if (prazo.status === "proximo") {
    badgeVariant = "bg-[#FF9500]/10 text-[#FF9500] hover:bg-[#FF9500]/20 border-0";
    progressClass = "bg-[#FF9500]";
    statusText = "Próximo";
    statusIcon = <Clock className="w-3 h-3 mr-1" />;
  } else {
    badgeVariant = "bg-[#34C759]/10 text-[#34C759] hover:bg-[#34C759]/20 border-0";
    progressClass = "bg-[#34C759]";
    statusText = "Em dia";
    statusIcon = <FileCheck className="w-3 h-3 mr-1" />;
  }

  const Icon = getTaskIcon(prazo.tipo);

  // Determine remaining time text
  let timeText = "";
  let timeColorClass = "text-[#6E6E73]";

  if (isOverdue) {
    timeText = isMobile ? `${Math.abs(daysRemaining)}d atraso` : `Vencido há ${Math.abs(daysRemaining)} dias`;
    timeColorClass = "text-[#FF3B30] font-bold";
  } else if (isDueToday) {
    timeText = isMobile ? "Hoje" : "Vence hoje!";
    timeColorClass = "text-[#FF9500] font-bold";
  } else if (daysRemaining === 1) {
    timeText = isMobile ? "1 dia" : "Amanhã!";
    timeColorClass = "text-[#FF9500] font-bold";
  } else {
    timeText = isMobile ? `${daysRemaining} dias` : `${daysRemaining} dias restantes`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ y: -1, boxShadow: "0 4px 10px rgba(0,0,0,0.05)" }}
      transition={{ duration: 0.2 }}
      className="relative flex flex-col justify-between min-h-[72px] sm:min-h-[88px] px-3 sm:px-4 py-2.5 sm:py-3.5 bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.06] rounded-[10px] mb-2 hover:border-blue-500/20 transition-all group"
    >
      {/* Row 1: Header Info */}
      <div className="flex flex-wrap items-center gap-1 mb-1">
        <Badge variant="unstyled" className={cn("px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[12px] font-bold uppercase tracking-wide h-5 flex items-center gap-1 shrink-0", badgeVariant)}>
          {statusIcon}
          {statusText}
        </Badge>

        <span className={cn("text-[11px] sm:text-[12px] font-medium flex items-center gap-1 shrink-0", timeColorClass)}>
          <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          {timeText}
        </span>

        <div className="w-px h-3.5 bg-gray-200 dark:bg-gray-700 mx-0.5 hidden sm:block"></div>

        <div className="flex items-center gap-2 min-w-0">
            <Icon className="w-3.5 h-3.5 text-[#86868B] shrink-0" />
            <h3 className="text-[13px] sm:text-[15px] font-bold text-[#1D1D1F] dark:text-white truncate">
            {prazo.descricao}
            </h3>
        </div>
      </div>

      {/* Row 2: Process Number */}
      {!isMobile && (
        <div className="flex items-center gap-2 mb-2 pl-1">
           <span className="font-mono text-[12px] text-[#86868B] tracking-tight">{prazo.processoNumero}</span>
        </div>
      )}

      {/* Row 3: Footer Details */}
      <div className="flex flex-col gap-1.5 sm:gap-2 sm:flex-row sm:items-center sm:justify-between mt-auto pt-1.5 border-t border-dashed border-gray-100 dark:border-gray-800">
         <div className="flex items-center gap-2.5">
            <Avatar className="w-6 h-6 sm:w-7 sm:h-7 ring-1 ring-white dark:ring-[#1C1C1E]">
                <AvatarFallback className={cn("text-[10px] font-bold text-white", getAvatarColor(prazo.responsavel))}>
                  {getInitials(prazo.responsavel)}
                </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
                <span className="text-[11px] sm:text-[12px] text-[#1D1D1F] dark:text-white font-medium truncate max-w-[140px] leading-tight">
                {prazo.responsavel}
                </span>
            </div>
         </div>

         <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <span className="text-[11px] sm:text-[12px] text-[#6E6E73] font-medium flex items-center gap-1">
               <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#86868B]" />
               {format(dueDate, "dd/MM")}
            </span>

            {/* Progress Bar */}
             <div className="flex items-center gap-1.5 w-[88px] sm:w-[100px]">
                <div className="flex-1 h-1 bg-[#E5E5EA] dark:bg-[#38383A] rounded-full overflow-hidden">
                   <div
                      className={cn("h-full rounded-full transition-all duration-1000 ease-out", progressClass)}
                      style={{ width: `${progress}%` }}
                   />
                </div>
                <span className="text-[10px] sm:text-[11px] font-medium text-[#86868B] w-7 sm:w-8 text-right">{Math.round(progress)}%</span>
             </div>
         </div>
      </div>
    </motion.div>
  );
}
