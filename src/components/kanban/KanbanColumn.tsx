import { cn } from "@/lib/utils";
import { KanbanColumnId } from "@/types/kanban";

interface KanbanColumnProps {
  id: KanbanColumnId;
  title: string;
  bgColor: string;
  borderColor: string; // e.g. "border-t-[#007AFF]" -> I will extract the color part
  count: number;
  totalTasks: number;
  children: React.ReactNode;
}

export function KanbanColumn({
  id,
  title,
  bgColor,
  borderColor,
  count,
  totalTasks,
  children
}: KanbanColumnProps) {
  const percentage = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;

  // Extract color from borderColor class (e.g. "border-t-[#007AFF]" -> "bg-[#007AFF]")
  // Or just map it manually since we control the props.
  const progressColor = borderColor.replace('border-t-', 'bg-');

  return (
    <div className={cn("flex flex-col h-full rounded-lg sm:rounded-xl transition-colors duration-300", bgColor)}>
      {/* Header */}
      <div className={cn("px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-t-lg sm:rounded-t-xl bg-white/50 dark:bg-white/5 backdrop-blur-sm border-t-[3px]", borderColor)}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-[13px] sm:text-[15px] text-foreground flex items-center gap-1.5 sm:gap-2">
            <span className="truncate">{title}</span>
            <span className="bg-gray-200 text-gray-700 text-[10px] sm:text-[12px] px-1.5 sm:px-2 py-0.5 rounded-full font-medium">
              {count}
            </span>
          </h3>
          <span className="text-[10px] sm:text-[12px] text-muted-foreground font-medium">{percentage}%</span>
        </div>

        {/* Custom Progress Bar */}
        <div className="h-[3px] sm:h-1 w-full bg-gray-200/50 rounded-full overflow-hidden">
          <div
            className={cn("h-full transition-all duration-500", progressColor)}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-1.5 sm:p-3 overflow-y-auto min-h-[80px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent space-y-1.5 sm:space-y-2.5">
        {children}
      </div>
    </div>
  );
}
