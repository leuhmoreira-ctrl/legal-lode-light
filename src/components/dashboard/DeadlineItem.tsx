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
    timeText = `Vencido há ${Math.abs(daysRemaining)} dias`;
    timeColorClass = "text-[#FF3B30] font-bold";
  } else if (isDueToday) {
    timeText = "Vence hoje!";
    timeColorClass = "text-[#FF9500] font-bold";
  } else if (daysRemaining === 1) {
    timeText = "Amanhã!";
    timeColorClass = "text-[#FF9500] font-bold";
  } else {
    timeText = `${daysRemaining} dias restantes`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
      transition={{ duration: 0.2 }}
      className="relative flex flex-col justify-between min-h-[85px] px-5 py-4 bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.06] rounded-xl mb-3 hover:border-blue-500/20 transition-all group"
    >
      {/* Row 1: Header Info */}
      <div className="flex items-center gap-3 mb-2">
        <Badge className={cn("px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider h-6 flex items-center gap-1 shrink-0", badgeVariant)}>
          {statusIcon}
          {statusText}
        </Badge>

        <span className={cn("text-[13px] font-medium flex items-center gap-1.5 shrink-0", timeColorClass)}>
          <Clock className="w-3.5 h-3.5" />
          {timeText}
        </span>

        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block"></div>

        <div className="flex items-center gap-2 min-w-0">
            <Icon className="w-4 h-4 text-[#86868B] shrink-0" />
            <h3 className="text-[15px] font-bold text-[#1D1D1F] dark:text-white truncate">
            {prazo.descricao}
            </h3>
        </div>
      </div>

      {/* Row 2: Process Number */}
      <div className="flex items-center gap-2 mb-3 pl-1">
         <span className="font-mono text-[13px] text-[#86868B] tracking-tight">{prazo.processoNumero}</span>
      </div>

      {/* Row 3: Footer Details */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-dashed border-gray-100 dark:border-gray-800">
         <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8 ring-2 ring-white dark:ring-[#1C1C1E]">
                <AvatarFallback className={cn("text-[10px] font-bold text-white", getAvatarColor(prazo.responsavel))}>
                  {getInitials(prazo.responsavel)}
                </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
                <span className="text-[13px] text-[#1D1D1F] dark:text-white font-medium truncate max-w-[140px] leading-tight">
                {prazo.responsavel}
                </span>
            </div>
         </div>

         <div className="flex items-center gap-6">
            <span className="text-[13px] text-[#6E6E73] font-medium flex items-center gap-1.5">
               <Calendar className="w-3.5 h-3.5 text-[#86868B]" />
               {format(dueDate, "dd/MM")}
            </span>

            {/* Progress Bar */}
             <div className="flex items-center gap-2 w-[120px]">
                <div className="flex-1 h-1.5 bg-[#E5E5EA] dark:bg-[#38383A] rounded-full overflow-hidden">
                   <div
                      className={cn("h-full rounded-full transition-all duration-1000 ease-out", progressClass)}
                      style={{ width: `${progress}%` }}
                   />
                </div>
                <span className="text-[11px] font-medium text-[#86868B] w-8 text-right">{Math.round(progress)}%</span>
             </div>
         </div>
      </div>
    </motion.div>
  );
}
