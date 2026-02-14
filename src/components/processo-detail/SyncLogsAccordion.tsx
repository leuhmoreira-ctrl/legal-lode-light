import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, History, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SyncLog {
  timestamp: string;
  status: "success" | "error";
  movsFound: number;
  responseTime: number;
  errorMessage?: string;
}

interface Props {
  logs: SyncLog[];
}

export function SyncLogsAccordion({ logs }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between h-10 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Logs de Sincronização ({logs.length})
          </span>
          <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum log registrado.</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-xs text-muted-foreground">
                  <th className="text-left p-2 font-medium">Data/Hora</th>
                  <th className="text-left p-2 font-medium">Status</th>
                  <th className="text-left p-2 font-medium">Movimentações</th>
                  <th className="text-left p-2 font-medium">Tempo (ms)</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={i} className="border-t border-border/50">
                    <td className="p-2 text-xs">{new Date(log.timestamp).toLocaleString("pt-BR")}</td>
                    <td className="p-2">
                      {log.status === "success" ? (
                        <Badge variant="outline" className="text-[9px] bg-[hsl(152,60%,40%)]/10 text-[hsl(152,60%,40%)]">
                          <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Sucesso
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive">
                          <AlertCircle className="w-2.5 h-2.5 mr-0.5" /> Erro
                        </Badge>
                      )}
                    </td>
                    <td className="p-2 text-xs">{log.movsFound}</td>
                    <td className="p-2 text-xs">{log.responseTime}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
