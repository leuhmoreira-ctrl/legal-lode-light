import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, ClipboardList, History, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ProcessoActionBarProps {
  processoId: string;
  onNewTask: () => void;
  onViewTasks: () => void;
  onViewHistory: () => void;
}

interface TaskCounts {
  total: number;
  urgent: number;
}

export function ProcessoActionBar({ processoId, onNewTask, onViewTasks, onViewHistory }: ProcessoActionBarProps) {
  const [counts, setCounts] = useState<TaskCounts>({ total: 0, urgent: 0 });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("kanban_tasks")
        .select("id, priority, status")
        .eq("processo_id", processoId)
        .neq("status", "done");
      if (data) {
        setCounts({
          total: data.length,
          urgent: data.filter((t) => t.priority === "high").length,
        });
      }
    };
    load();
  }, [processoId]);

  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border/50">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" className="gap-1.5 h-8" onClick={onNewTask}>
              <Plus className="w-3.5 h-3.5" /> Nova Tarefa
            </Button>
          </TooltipTrigger>
          <TooltipContent>Criar tarefa vinculada (N)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={onViewTasks}>
              <ClipboardList className="w-3.5 h-3.5" />
              Ver Tarefas
              {counts.total > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {counts.total}
                </Badge>
              )}
              {counts.urgent > 0 && (
                <Badge variant="destructive" className="h-5 px-1.5 text-[10px] gap-0.5">
                  <AlertTriangle className="w-2.5 h-2.5" /> {counts.urgent}
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Ver tarefas do processo (T)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={onViewHistory}>
              <History className="w-3.5 h-3.5" /> Histórico
            </Button>
          </TooltipTrigger>
          <TooltipContent>Histórico de atividades (H)</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
