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
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface DeadlineCardProps {
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

export function DeadlineCard({ prazo }: DeadlineCardProps) {
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
  let borderClass = "";
  let badgeVariant = "";
  let progressClass = "";
  let statusText = "";
  let statusIcon = null;

  if (prazo.status === "urgente") {
    borderClass = "border-l-4 border-l-[#FF3B30]"; // Apple Red
    badgeVariant = "bg-[#FF3B30]/10 text-[#FF3B30] hover:bg-[#FF3B30]/20 border-0";
    progressClass = "bg-[#FF3B30]";
    statusText = "Urgente";
    statusIcon = <AlertTriangle className="w-3 h-3 mr-1" />;
  } else if (prazo.status === "proximo") {
    borderClass = "border-l-4 border-l-[#FF9500]"; // Apple Orange
    badgeVariant = "bg-[#FF9500]/10 text-[#FF9500] hover:bg-[#FF9500]/20 border-0";
    progressClass = "bg-[#FF9500]";
    statusText = "Próximo";
    statusIcon = <Clock className="w-3 h-3 mr-1" />;
  } else {
    borderClass = "border-l-4 border-l-[#34C759]"; // Apple Green
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
      transition={{ duration: 0.2 }}
      className={cn(
        "relative overflow-hidden rounded-[16px] bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#38383A] shadow-sm transition-all p-5 group cursor-pointer",
        borderClass
      )}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <Badge variant="unstyled" className={cn("px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider", badgeVariant)}>
          {statusIcon}
          {statusText}
        </Badge>

        <div className={cn("flex items-center text-[13px] font-semibold", timeColorClass)}>
          <Clock className="w-3.5 h-3.5 mr-1.5" />
          {timeText}
        </div>
      </div>

      {/* Content */}
      <div className="mb-6 pl-1">
        <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-900/20">
              <Icon className="w-4 h-4 text-[#007AFF]" />
            </div>
            <span className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wide">{prazo.tipo}</span>
        </div>

        <h3 className="text-[17px] font-semibold text-[#1D1D1F] dark:text-white mb-3 leading-tight tracking-[-0.4px]">
          {prazo.descricao}
        </h3>

        <div className="flex items-center gap-2 font-mono text-[11px] text-[#6E6E73] bg-[#F5F5F7] dark:bg-[#2C2C2E] px-2.5 py-1.5 rounded-md w-fit group-hover:bg-[#E5E5EA] dark:group-hover:bg-[#3A3A3C] transition-colors">
          <Scale className="w-3 h-3" />
          {prazo.processoNumero}
          <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
        </div>
      </div>

      {/* Footer */}
      <div className="space-y-4 pt-2 border-t border-[#E5E5EA] dark:border-[#38383A] mt-4">
        <div className="flex justify-between items-center">
             <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8 border-[2px] border-white dark:border-[#1C1C1E] shadow-sm ring-1 ring-black/5">
                    <AvatarFallback className={cn("text-[10px] font-bold text-white", getAvatarColor(prazo.responsavel))}>
                        {getInitials(prazo.responsavel)}
                    </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <span className="text-[10px] text-[#86868B] font-medium uppercase tracking-wide">Responsável</span>
                    <span className="text-[13px] font-medium text-[#1D1D1F] dark:text-white truncate max-w-[120px]">
                      {prazo.responsavel}
                    </span>
                </div>
            </div>

            <div className="flex flex-col items-end">
                <span className="text-[10px] text-[#86868B] font-medium uppercase tracking-wide mb-0.5">Vencimento</span>
                <div className="flex items-center gap-1.5 text-[14px] font-semibold text-[#1D1D1F] dark:text-white">
                  <Calendar className="w-3.5 h-3.5 text-[#86868B]" />
                  {format(dueDate, "dd/MM/yyyy")}
                </div>
            </div>
        </div>

        {/* Progress Bar */}
        <div className="relative pt-1">
            <div className="flex justify-between text-[10px] text-[#86868B] font-medium mb-1.5">
                <span>Progresso</span>
                <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-[#E5E5EA] dark:bg-[#38383A] rounded-full h-1.5 overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-1000 ease-out", progressClass)}
                style={{ width: `${progress}%` }}
              />
            </div>
        </div>
      </div>
    </motion.div>
  );
}
