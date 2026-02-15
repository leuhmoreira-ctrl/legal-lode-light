import { useState } from "react";
import { MessageSquare, Mail, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type FilterType = "all" | "email" | "chat";

interface CommunicationItem {
  id: string;
  type: "email" | "chat";
  date: string;
  title: string;
  subtitle: string;
  preview: string;
  hasAttachment: boolean;
  messageCount?: number;
}

const MOCK_ITEMS: CommunicationItem[] = [
  {
    id: "1",
    type: "email",
    date: new Date(Date.now() - 3600000).toISOString(),
    title: "Para: maria.silva@email.com",
    subtitle: "Atualização do processo",
    preview: "Informo que houve movimentação no seu processo...",
    hasAttachment: false,
    messageCount: 3,
  },
  {
    id: "2",
    type: "chat",
    date: new Date(Date.now() - 86400000).toISOString(),
    title: "Nota interna - Dr. Carlos",
    subtitle: "Chat Interno",
    preview: "Cliente ligou perguntando sobre prazo de contestação.",
    hasAttachment: false,
  },
  {
    id: "3",
    type: "email",
    date: new Date(Date.now() - 172800000).toISOString(),
    title: "Para: maria.silva@email.com",
    subtitle: "Cópia da petição",
    preview: "Segue em anexo a cópia da petição inicial.",
    hasAttachment: true,
    messageCount: 1,
  },
];

interface Props {
  processoId: string;
  onNewEmail?: () => void;
}

export function ProcessoComunicacoesTab({ processoId, onNewEmail }: Props) {
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered = filter === "all" ? MOCK_ITEMS : MOCK_ITEMS.filter((i) => i.type === filter);

  const tabs: { key: FilterType; label: string }[] = [
    { key: "all", label: "Todas" },
    { key: "email", label: "Emails" },
    { key: "chat", label: "Chat Interno" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                "text-xs font-medium py-1.5 px-3 rounded-lg transition-colors",
                filter === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={onNewEmail} className="gap-1.5 text-xs">
          + Nova Comunicação
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center border rounded-lg bg-muted/20 text-muted-foreground">
          <p>Nenhuma comunicação registrada para este processo.</p>
          <p className="text-xs mt-1">Emails e mensagens internas vinculadas aparecerão aqui.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={cn(
                "p-3 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors border-l-[3px]",
                item.type === "email" ? "border-l-success" : "border-l-primary"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  {item.type === "email" ? (
                    <Mail className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  ) : (
                    <MessageSquare className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{item.title}</span>
                      {item.messageCount && item.messageCount > 1 && (
                        <Badge variant="outline" className="text-[9px] h-4">
                          {item.messageCount} msgs
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.preview}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(item.date), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                  {item.hasAttachment && (
                    <Paperclip className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
