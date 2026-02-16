import React, { useRef, useState, useEffect } from "react";
import Draggable from "react-draggable";
import { KanbanTask, KANBAN_COLUMNS, ViewMode } from "@/types/kanban";
import { KanbanCard } from "./KanbanCard";
import { cn } from "@/lib/utils";

interface FreeKanbanBoardProps {
  tasks: KanbanTask[];
  teamMembers: any[];
  viewMode: ViewMode;
  onTaskMove: (taskId: string, x: number, y: number, status: string, zIndex: number) => void;
  onTaskUpdate: (task: KanbanTask) => void;
  // Pass-through props for KanbanCard
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

  const getCalculatedPosition = (task: KanbanTask, index: number, totalWidth: number) => {
    // If we have explicit coordinates
    if (task.position_x != null && task.position_y != null) {
      // Treat x as percentage (0-1), y as pixels
      // Robustness check: if x > 1, assume it's legacy pixel value and normalize?
      // Or just assume data is correct percentage.
      // Let's assume percentage if <= 1.
      let x = task.position_x;
      if (x > 1) x = x / totalWidth; // Attempt to fix legacy pixel data dynamically

      return { x: x * totalWidth, y: task.position_y };
    }

    // Fallback: Calculate default position based on column
    if (totalWidth === 0) return { x: 0, y: 0 };

    const colIndex = KANBAN_COLUMNS.findIndex(c => c.id === task.status);
    const colWidth = totalWidth / 3;

    // Simple stacking logic for tasks without coords
    const tasksInSameCol = tasks
      .filter(t => t.status === task.status && (t.position_x == null))
      .sort((a, b) => a.position_index - b.position_index);

    const relativeIndex = tasksInSameCol.findIndex(t => t.id === task.id);
    const actualIndex = relativeIndex === -1 ? index : relativeIndex;

    const x = (colIndex * colWidth) + 20;
    const y = (actualIndex * 200) + 60; // Spacing
    return { x, y };
  };

  const getMaxZ = () => Math.max(0, ...tasks.map(t => t.z_index || 0));

  return (
    <div
      ref={containerRef}
      className="relative w-full border rounded-lg bg-background/50 overflow-auto shadow-inner select-none"
      style={{ height: 'calc(100vh - 140px)', minHeight: '800px' }}
    >
      {/* Background Columns */}
      <div className="absolute inset-0 flex pointer-events-none z-0 min-w-full min-h-full">
        {KANBAN_COLUMNS.map((col) => (
          <div
            key={col.id}
            className={cn(
              "flex-1 border-r last:border-r-0 min-h-full transition-colors",
              col.bgColor,
              "bg-opacity-30 dark:bg-opacity-10"
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

        // Calculate position: either the current drag pos (if dragging) or the stored/calc pos
        const calculatedPos = getCalculatedPosition(task, index, containerDimensions.width);
        const currentPos = (draggingId === task.id) ? dragPos : calculatedPos;

        // z-index: during drag, use the new high Z, otherwise use stored Z
        const currentZ = (draggingId === task.id) ? dragZ : (task.z_index || 10);

        return (
          <Draggable
            key={task.id}
            handle=".drag-handle"
            position={currentPos}
            onStart={(e, data) => {
               setDraggingId(task.id);
               setDragPos({ x: data.x, y: data.y });
               setDragZ(getMaxZ() + 1);
            }}
            onDrag={(e, data) => {
               setDragPos({ x: data.x, y: data.y });
            }}
            onStop={(e, data) => {
               setDraggingId(null);
               const newStatus = getColumnForX(data.x, containerDimensions.width);
               // Save x as percentage
               const xPercent = data.x / containerDimensions.width;
               onTaskMove(task.id, xPercent, data.y, newStatus, dragZ);
            }}
            bounds="parent"
          >
            <div
              className="absolute transition-shadow"
              style={{
                width: viewMode === 'compact' ? '250px' : '320px',
                zIndex: currentZ
              }}
            >
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
               {/* Debug coords */}
               {draggingId === task.id && (
                  <div className="absolute -top-6 left-0 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    X: {Math.round(dragPos.x)} ({Math.round((dragPos.x / containerDimensions.width) * 100)}%), Y: {Math.round(dragPos.y)}, Z: {dragZ}
                  </div>
               )}
            </div>
          </Draggable>
        );
      })}
    </div>
  );
}
