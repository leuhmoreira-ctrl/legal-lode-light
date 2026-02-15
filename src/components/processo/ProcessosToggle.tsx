'use client';

import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";

interface ProcessosToggleProps {
  viewMode: 'meus' | 'todos';
  onViewModeChange: (mode: 'meus' | 'todos') => void;
  meusCount?: number;
  todosCount?: number;
}

export const ProcessosToggle = ({
  viewMode,
  onViewModeChange,
  meusCount = 0,
  todosCount = 0,
}: ProcessosToggleProps) => {
  return (
    <div className="inline-flex items-center gap-2 bg-muted p-1 rounded-lg">
      <button
        onClick={() => onViewModeChange('meus')}
        className={cn(
          "relative px-4 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 z-10 flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          viewMode === 'meus'
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {viewMode === 'meus' && (
          <motion.div
            layoutId="processos-tab-indicator"
            className="absolute inset-0 bg-background dark:bg-gray-700 shadow-sm rounded-md"
            style={{ zIndex: -1 }}
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 35,
            }}
          />
        )}

        <span className="relative z-10 flex items-center gap-2">
          Meus Processos
          {meusCount > 0 && (
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full transition-colors",
              viewMode === 'meus'
                ? "bg-primary/10 text-primary"
                : "bg-muted-foreground/10 text-muted-foreground"
            )}>
              {meusCount}
            </span>
          )}
        </span>
      </button>

      <button
        onClick={() => onViewModeChange('todos')}
        className={cn(
          "relative px-4 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 z-10 flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          viewMode === 'todos'
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {viewMode === 'todos' && (
          <motion.div
            layoutId="processos-tab-indicator"
            className="absolute inset-0 bg-background dark:bg-gray-700 shadow-sm rounded-md"
            style={{ zIndex: -1 }}
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 35,
            }}
          />
        )}

        <span className="relative z-10 flex items-center gap-2">
          Todos
          {todosCount > 0 && (
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full transition-colors",
              viewMode === 'todos'
                ? "bg-primary/10 text-primary"
                : "bg-muted-foreground/10 text-muted-foreground"
            )}>
              {todosCount}
            </span>
          )}
        </span>
      </button>
    </div>
  );
};
