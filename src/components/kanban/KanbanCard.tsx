import { useMemo } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Clock, GripVertical,
  Edit, Check, Star, Flame, CheckCircle2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { cn } from "@/lib/utils";
import { KanbanTask, ViewMode } from "@/types/kanban";
import { getTimeInStage, getTimeBadgeColor } from "@/utils/kanbanUtils";

interface KanbanCardProps {
  task: KanbanTask;
  index: number;
  isDragging?: boolean;
  viewMode: ViewMode;
  onEdit: (id: string, e: React.MouseEvent) => void;
  onDelete: (task: KanbanTask, e: React.MouseEvent) => void;
  onToggleToday: (task: KanbanTask, e: React.MouseEvent) => void;
  onMove: (taskId: string, direction: 'left' | 'right') => void;
  onComplete: (taskId: string) => void;
  onClick: () => void;
  dragHandleProps?: any;
  teamMembers: any[];
  canDelete: boolean;
}

const priorityConfig: Record<string, { label: string; icon: any; color: string; badgeClass: string }> = {
  high: {
    label: "Alta",
    icon: Flame,
    color: "#FF3B30",
    badgeClass: "bg-[#FF3B30] text-white shadow-sm hover:bg-[#FF3B30]/90"
  },
  medium: {
    label: "Média",
    icon: Clock,
    color: "#FFCC00",
    badgeClass: "bg-[#FFCC00] text-black hover:bg-[#FFCC00]/90"
  },
  low: {
    label: "Baixa",
    icon: CheckCircle2,
    color: "#34C759",
    badgeClass: "bg-[#34C759] text-white hover:bg-[#34C759]/90"
  },
};

export function KanbanCard({
  task,
  index,
  isDragging,
  viewMode,
  onEdit,
  onDelete,
  onToggleToday,
  onMove,
  onComplete,
  onClick,
  dragHandleProps,
  teamMembers,
  canDelete
}: KanbanCardProps) {
  const timeInStage = useMemo(() => {
    if (!task.stage_entry_date) return null;
    return getTimeInStage(task.stage_entry_date);
  }, [task.stage_entry_date]);

  const priority = priorityConfig[task.priority] || priorityConfig.medium;
  const PriorityIcon = priority.icon;

  const getMember = (id: string | null) => teamMembers.find((m: any) => m.id === id);

  const isCompact = viewMode === 'compact';
  const isExpanded = viewMode === 'expanded';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="group relative"
    >
      <Card
        className={cn(
          "hover:shadow-lg transition-all duration-200 cursor-pointer bg-white dark:bg-card border-l-4",
          task.marked_for_today && "ring-2 ring-yellow-400/50 bg-yellow-50/30 dark:bg-yellow-900/10",
          isDragging && "shadow-xl rotate-2 scale-105",
          `border-l-[${priority.color}]`,
          isCompact ? "p-2 min-h-[50px] flex items-center" : "p-3.5"
        )}
        style={{ borderLeftColor: priority.color }}
        onClick={onClick}
      >
        {/* Quick Actions Overlay (Hover) - Hide in compact to save space */}
        {!isDragging && !isCompact && (
           <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
             {task.status !== 'done' && (
               <Button variant="secondary" size="icon" className="h-7 w-7 bg-white/90 hover:bg-white shadow-sm" onClick={(e) => { e.stopPropagation(); onComplete(task.id); }} title="Concluir">
                 <Check className="w-3.5 h-3.5 text-green-600" />
               </Button>
             )}
             <Button variant="secondary" size="icon" className="h-7 w-7 bg-white/90 hover:bg-white shadow-sm" onClick={(e) => onEdit(task.id, e)} title="Editar">
               <Edit className="w-3.5 h-3.5 text-blue-600" />
             </Button>
           </div>
        )}

        {/* Navigation Arrows (Hover) - Hide in compact */}
        {!isCompact && !isDragging && (
           <>
             <div className="absolute -left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
               {task.status !== 'todo' && (
                 <Button
                   variant="outline"
                   size="icon"
                   className="h-6 w-6 rounded-full bg-background shadow-md border hover:bg-accent"
                   onClick={(e) => { e.stopPropagation(); onMove(task.id, 'left'); }}
                 >
                   <ArrowLeft className="w-3 h-3" />
                 </Button>
               )}
             </div>
             <div className="absolute -right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
               {task.status !== 'done' && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-6 w-6 rounded-full bg-background shadow-md border hover:bg-accent"
                    onClick={(e) => { e.stopPropagation(); onMove(task.id, 'right'); }}
                  >
                    <ArrowRight className="w-3 h-3" />
                  </Button>
               )}
             </div>
           </>
        )}

        <div className="flex items-start gap-2 w-full">
          <div {...dragHandleProps} className={cn("cursor-grab active:cursor-grabbing", isCompact ? "mt-0.5" : "mt-1")}>
            <GripVertical className="w-4 h-4 text-muted-foreground/40" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Header: Title */}
            <div className={cn("flex gap-1 mb-1", isCompact ? "items-center" : "items-start justify-between")}>
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                {!isCompact && (
                  <button
                    className="shrink-0 transition-transform hover:scale-110"
                    onClick={(e) => onToggleToday(task, e)}
                    title={task.marked_for_today ? "Desmarcar de hoje" : "Fazer hoje"}
                  >
                    <Star className={cn("w-3.5 h-3.5", task.marked_for_today ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40 hover:text-yellow-400")} />
                  </button>
                )}
                <p className={cn("text-sm font-semibold text-foreground leading-tight truncate", isExpanded && "whitespace-normal line-clamp-none")}>
                   {task.title}
                </p>
              </div>

            </div>

            {/* Compact Mode Content */}
            {isCompact && (
               <div className="flex items-center gap-2 mt-1">
                  <Badge className={cn("px-1.5 py-0 text-[9px] font-bold uppercase tracking-wide border-none", priority.badgeClass)}>
                    {priority.label}
                  </Badge>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground ml-auto">
                    <UserAvatar
                      name={getMember(task.assigned_to)?.full_name}
                      avatarUrl={getMember(task.assigned_to)?.avatar_url}
                      size="sm"
                      className="w-4 h-4 text-[8px]"
                    />
                    {task.due_date && (
                      <span className={cn(
                         "px-1.5 py-0.5 rounded bg-muted font-medium",
                         new Date(task.due_date) < new Date() && "text-destructive bg-destructive/10"
                      )}>
                        {format(new Date(task.due_date), "dd/MM")}
                      </span>
                    )}
                  </div>
               </div>
            )}

            {/* Normal/Expanded Content */}
            {!isCompact && (
               <>
                  {/* Time in Stage */}
                  {timeInStage && (
                    <div className={cn("flex items-center gap-1 text-[10px] font-medium mb-2 w-fit px-1.5 py-0.5 rounded", getTimeBadgeColor(timeInStage.days))}>
                      <Clock className="w-3 h-3" />
                      {timeInStage.label}
                    </div>
                  )}

                  {/* Process Info */}
                  {task.processo && (
                    <div className="text-[11px] text-primary font-medium truncate mb-1">
                      {task.processo.numero}
                    </div>
                  )}

                  {/* Description Preview */}
                  {task.description && (
                    <p className={cn("text-xs text-muted-foreground mb-3", isExpanded ? "line-clamp-none whitespace-pre-wrap" : "line-clamp-2")}>
                       {task.description}
                    </p>
                  )}

                  {/* Footer: Badges, Avatar, Date */}
                  <div className="flex items-center gap-2 flex-wrap mt-auto pt-2 border-t border-dashed">
                    <Badge className={cn("px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide border-none gap-1", priority.badgeClass)}>
                      <PriorityIcon className="w-3 h-3" />
                      {priority.label}
                    </Badge>

                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground ml-auto">
                      <UserAvatar
                        name={getMember(task.assigned_to)?.full_name}
                        avatarUrl={getMember(task.assigned_to)?.avatar_url}
                        size="sm"
                        className="w-4 h-4 text-[8px]"
                      />
                      {task.due_date && (
                        <span className={cn(
                           "px-1.5 py-0.5 rounded bg-muted font-medium",
                           new Date(task.due_date) < new Date() && "text-destructive bg-destructive/10"
                        )}>
                          {format(new Date(task.due_date), "dd/MM")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Visual Timeline (Expanded Only) */}
                  {isExpanded && (
                     <div className="mt-3 pt-2 relative animate-fade-in">
                        <div className="h-0.5 bg-gray-100 w-full absolute top-2.5 left-0 -z-10" />
                        <div className="flex justify-between text-[8px] text-muted-foreground">
                           <div className="flex flex-col items-center gap-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                              <span>Criado</span>
                           </div>
                           <div className="flex flex-col items-center gap-1">
                              <div className={cn("w-1.5 h-1.5 rounded-full", task.started_at ? "bg-blue-400" : "bg-gray-200")} />
                              <span>Iniciado</span>
                           </div>
                           <div className="flex flex-col items-center gap-1">
                              <div className={cn("w-1.5 h-1.5 rounded-full", task.completed_at ? "bg-green-400" : "bg-gray-200")} />
                              <span>Fim</span>
                           </div>
                        </div>
                     </div>
                  )}
               </>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
