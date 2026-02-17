import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { KanbanColumnId } from "@/types/kanban";

interface KanbanColumnProps {
  id: KanbanColumnId;
  title: string;
  bgColor: string;
  borderColor: string; // e.g. "border-t-[#007AFF]" -> I will extract the color part
  count: number;
  totalTasks: number;
  feedback?: { token: number; mode: "success" | "undo" };
  reduceMotion?: boolean;
  children: React.ReactNode;
}

export function KanbanColumn({
  id,
  title,
  bgColor,
  borderColor,
  count,
  totalTasks,
  feedback,
  reduceMotion = false,
  children
}: KanbanColumnProps) {
  const percentage = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
  const [activeFeedback, setActiveFeedback] = useState<{ token: number; mode: "success" | "undo" } | null>(null);

  useEffect(() => {
    if (!feedback) return;
    setActiveFeedback(feedback);

    const timeout = setTimeout(() => {
      setActiveFeedback((current) => (current?.token === feedback.token ? null : current));
    }, reduceMotion ? 120 : feedback.mode === "undo" ? 220 : 280);

    return () => clearTimeout(timeout);
  }, [feedback, reduceMotion]);

  const progressColor = borderColor.replace('border-t-', 'bg-');

  return (
    <div className={cn("relative flex flex-col h-full rounded-lg sm:rounded-xl transition-colors duration-300", bgColor)}>
      {activeFeedback ? (
        <span
          className={cn(
            "kanban-column-feedback-layer",
            activeFeedback.mode === "undo"
              ? reduceMotion
                ? "kanban-column-feedback-undo-reduced"
                : "kanban-column-feedback-undo"
              : reduceMotion
              ? "kanban-column-feedback-success-reduced"
              : "kanban-column-feedback-success"
          )}
        />
      ) : null}

      {/* Header */}
      <div className={cn("relative z-[1] px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-t-lg sm:rounded-t-xl bg-white/50 dark:bg-white/5 backdrop-blur-sm border-t-[3px]", borderColor)}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-[13px] sm:text-[15px] text-foreground flex items-center gap-1.5 sm:gap-2">
            <span className="truncate">{title}</span>
            <span className="bg-gray-200 text-gray-700 text-[10px] sm:text-[12px] px-1.5 sm:px-2 py-0.5 rounded-full font-medium">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={`${id}-count-${count}`}
                  initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -5 }}
                  transition={{ duration: reduceMotion ? 0.1 : 0.18 }}
                  className="inline-block min-w-[1ch] text-center"
                >
                  {count}
                </motion.span>
              </AnimatePresence>
            </span>
          </h3>
          <span className="text-[10px] sm:text-[12px] text-muted-foreground font-medium">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={`${id}-percentage-${percentage}`}
                initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
                transition={{ duration: reduceMotion ? 0.1 : 0.16 }}
                className="inline-block min-w-[2ch] text-right"
              >
                {percentage}%
              </motion.span>
            </AnimatePresence>
          </span>
        </div>

        {/* Custom Progress Bar */}
        <div className="h-[3px] sm:h-1 w-full bg-gray-200/50 rounded-full overflow-hidden">
          <motion.div
            className={cn("h-full", progressColor)}
            animate={{ width: `${percentage}%` }}
            transition={
              reduceMotion
                ? { duration: 0.1, ease: "linear" }
                : { duration: 0.24, ease: [0.2, 0, 0, 1] }
            }
          />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-[1] flex-1 p-1.5 sm:p-3 overflow-y-auto min-h-[80px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent space-y-1.5 sm:space-y-2.5">
        {children}
      </div>
    </div>
  );
}
