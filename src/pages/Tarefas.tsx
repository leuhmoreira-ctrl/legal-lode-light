import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { tarefasMock, type Tarefa } from "@/data/mockData";
import { useState } from "react";
import { GripVertical, Clock, User } from "lucide-react";
import { format, parseISO } from "date-fns";

const columns = [
  { key: "todo" as const, label: "A Fazer", color: "bg-muted-foreground" },
  { key: "doing" as const, label: "Em Andamento", color: "bg-warning" },
  { key: "done" as const, label: "Concluído", color: "bg-success" },
];

const prioridadeStyle: Record<string, string> = {
  alta: "urgency-high",
  media: "urgency-medium",
  baixa: "urgency-low",
};

const prioridadeLabel: Record<string, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export default function Tarefas() {
  const [tarefas, setTarefas] = useState<Tarefa[]>(tarefasMock);

  const getByStatus = (status: Tarefa["status"]) =>
    tarefas.filter((t) => t.status === status);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tarefas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quadro Kanban • {tarefas.filter((t) => t.status !== "done").length} pendentes
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {columns.map((col) => (
            <div key={col.key} className="kanban-column">
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                <h3 className="text-sm font-semibold text-foreground">
                  {col.label}
                </h3>
                <Badge variant="secondary" className="text-[10px] ml-auto">
                  {getByStatus(col.key).length}
                </Badge>
              </div>

              <div className="space-y-3">
                {getByStatus(col.key).map((tarefa) => (
                  <Card
                    key={tarefa.id}
                    className="p-3.5 cursor-grab hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="w-4 h-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {tarefa.titulo}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {tarefa.descricao}
                        </p>
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${prioridadeStyle[tarefa.prioridade]}`}
                          >
                            {prioridadeLabel[tarefa.prioridade]}
                          </span>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <User className="w-3 h-3" />
                            {tarefa.responsavel}
                          </div>
                          {tarefa.dataVencimento && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
                              <Clock className="w-3 h-3" />
                              {format(parseISO(tarefa.dataVencimento), "dd/MM")}
                            </div>
                          )}
                        </div>
                        {tarefa.processoNumero && (
                          <p className="text-[10px] text-muted-foreground mt-2 font-mono">
                            {tarefa.processoNumero}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
