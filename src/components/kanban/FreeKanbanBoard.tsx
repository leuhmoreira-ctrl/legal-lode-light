import React, { useRef, useState, useEffect, useLayoutEffect, useCallback } from "react";
import Draggable from "react-draggable";
import { KanbanTask, KANBAN_COLUMNS, ViewMode } from "@/types/kanban";
import { KanbanCard } from "./KanbanCard";
import { cn } from "@/lib/utils";

// Helper component to measure card height
const MeasureCard = ({
  children,
  onHeightChange
}: {
  children: React.ReactNode;
  onHeightChange: (height: number) => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const onHeightChangeRef = useRef(onHeightChange);

  useLayoutEffect(() => {
    onHeightChangeRef.current = onHeightChange;
  });

  useLayoutEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        onHeightChangeRef.current(entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height);
      }
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref} className="h-full">{children}</div>;
};

interface FreeKanbanBoardProps {
  tasks: KanbanTask[];
  teamMembers: any[];
  viewMode: ViewMode;
  onTaskMove: (taskId: string, x: number, y: number, status: string, zIndex: number) => void;
  onReorder?: (taskId: string, newStatus: string, newIndex: number) => void;
  onTaskUpdate: (task: KanbanTask) => void;
  onEdit: (id: string, e: React.MouseEvent) => void;
  onDelete: (task: KanbanTask, e: React.MouseEvent) => void;
  onToggleToday: (task: KanbanTask, e: React.MouseEvent) => void;
  onMove: (taskId: string, direction: 'left' | 'right') => void;
  onComplete: (taskId: string) => void;
  onClick: (taskId: string) => void;
  isAdmin: boolean;
  currentUserId?: string;
}

export function FreeKanbanBoard({
  tasks,
  teamMembers,
  viewMode,
  onTaskMove,
  onReorder,
  onTaskUpdate,
  onEdit,
  onDelete,
  onToggleToday,
  onMove,
  onComplete,
  onClick,
  isAdmin,
  currentUserId
}: FreeKanbanBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [dragZ, setDragZ] = useState<number>(0);
  const [cardHeights, setCardHeights] = useState<Record<string, number>>({});
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);

  const handleHeightChange = useCallback((id: string, height: number) => {
    setCardHeights(prev => {
      if (Math.abs((prev[id] || 0) - height) < 1) return prev;
      return { ...prev, [id]: height };
    });
  }, []);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setContainerDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const getColumnForX = (x: number, width: number) => {
    if (width === 0) return "todo";
    const percentage = x / width;
    if (percentage < 0.33) return "todo";
    if (percentage < 0.66) return "in_progress";
    return "done";
  };

  const layout = React.useMemo(() => {
    const newLayout: Record<string, { x: number; y: number }> = {};
    if (containerDimensions.width === 0) return newLayout;

    const colWidth = containerDimensions.width / 3;
    const GAP = 16;
    const TOP_MARGIN = 80;

    const tasksByStatus: Record<string, KanbanTask[]> = {
      todo: [],
      in_progress: [],
      done: []
    };

    tasks.forEach(task => {
      let status = task.status;
      if (status === 'review') status = 'in_progress';

      if (tasksByStatus[status]) {
        tasksByStatus[status].push(task);
      } else {
        if (!tasksByStatus['todo']) tasksByStatus['todo'] = [];
        tasksByStatus['todo'].push(task);
      }
    });

    ['todo', 'in_progress', 'done'].forEach((status, colIndex) => {
       const colTasks = tasksByStatus[status] || [];
       colTasks.sort((a, b) => a.position_index - b.position_index);

       let currentY = TOP_MARGIN;
       const colXStart = colIndex * colWidth;

       colTasks.forEach(task => {
          const cardWidth = viewMode === 'compact' ? 250 : 320;
          const x = colXStart + (colWidth - cardWidth) / 2;

          newLayout[task.id] = { x, y: currentY };

          const height = cardHeights[task.id] || 150;
          currentY += height + GAP;
       });
    });

    return newLayout;
  }, [tasks, containerDimensions.width, cardHeights, viewMode]);

  const getMaxZ = () => Math.max(0, ...tasks.map(t => t.z_index || 0));

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full border rounded-lg bg-background/50 overflow-auto shadow-inner select-none transition-opacity duration-200",
        containerDimensions.width === 0 ? "opacity-0" : "opacity-100"
      )}
      style={{ height: 'calc(100vh - 140px)', minHeight: '800px' }}
    >
      {/* Background Columns */}
      <div className="absolute inset-0 flex pointer-events-none z-0 min-w-full min-h-full">
        {KANBAN_COLUMNS.map((col) => (
          <div
            key={col.id}
            className={cn(
              "flex-1 border-r last:border-r-0 min-h-full transition-all duration-200",
              col.bgColor,
              "bg-opacity-30 dark:bg-opacity-10",
              hoveredColumn === col.id && "brightness-110 dark:brightness-125"
            )}
          >
             <div className="p-4 font-bold text-lg opacity-40 text-center uppercase tracking-widest sticky top-0">
               {col.title}
             </div>
          </div>
        ))}
      </div>

      {/* Tasks */}
      {tasks.map((task, index) => {
        const canDelete = task.user_id === currentUserId || isAdmin;
        const calculatedPos = layout[task.id] || { x: 0, y: 0 };
        const currentPos = (draggingId === task.id) ? dragPos : calculatedPos;
        const currentZ = (draggingId === task.id) ? (getMaxZ() + 100) : (task.z_index || 10);

        return (
          <Draggable
            key={task.id}
            handle=".drag-handle"
            position={currentPos}
            onStart={(e, data) => {
               setDraggingId(task.id);
               setDragPos({ x: data.x, y: data.y });
               setDragZ(getMaxZ() + 1);
               setHoveredColumn(getColumnForX(data.x, containerDimensions.width));
            }}
            onDrag={(e, data) => {
               setDragPos({ x: data.x, y: data.y });
               setHoveredColumn(getColumnForX(data.x, containerDimensions.width));
            }}
            onStop={(e, data) => {
               setDraggingId(null);
               setHoveredColumn(null);
               const newStatus = getColumnForX(data.x, containerDimensions.width);

               if (onReorder) {
                 // Calculate insertion index based on Y position
                 const targetTasks = tasks
                   .filter(t => {
                      let s = t.status;
                      if (s === 'review') s = 'in_progress';
                      return s === newStatus && t.id !== task.id;
                   })
                   .sort((a, b) => a.position_index - b.position_index);

                 let newIndex = targetTasks.length;
                 let currentY = 80; // TOP_MARGIN
                 const GAP = 16;

                 for (let i = 0; i < targetTasks.length; i++) {
                   const t = targetTasks[i];
                   const h = cardHeights[t.id] || 150;
                   const centerY = currentY + h / 2;

                   if (data.y < centerY) {
                     newIndex = i;
                     break;
                   }
                   currentY += h + GAP;
                 }

                 onReorder(task.id, newStatus, newIndex);
               } else {
                 // Fallback
                 const xPercent = data.x / containerDimensions.width;
                 onTaskMove(task.id, xPercent, data.y, newStatus, dragZ);
               }
            }}
            bounds="parent"
          >
            <div
              className={cn(
                "absolute",
                draggingId === task.id
                  ? "shadow-2xl scale-[1.02] rotate-[1deg] opacity-90"
                  : "transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
              )}
              style={{
                width: viewMode === 'compact' ? '250px' : '320px',
                zIndex: currentZ
              }}
            >
               <MeasureCard onHeightChange={(h) => handleHeightChange(task.id, h)}>
                 <KanbanCard
                   task={task}
                   index={index}
                   viewMode={viewMode}
                   isDragging={draggingId === task.id}
                   onEdit={onEdit}
                   onDelete={onDelete}
                   onToggleToday={onToggleToday}
                   onMove={onMove}
                   onComplete={onComplete}
                   onClick={() => onClick(task.id)}
                   dragHandleProps={{ className: "drag-handle" }}
                   teamMembers={teamMembers}
                   canDelete={canDelete}
                 />
               </MeasureCard>
            </div>
          </Draggable>
        );
      })}
    </div>
  );
}
