import { useAuth } from "@/contexts/AuthContext";
import { type Conversation } from "@/hooks/useChat";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Scale, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
  const { user } = useAuth();

  const getConversationName = (conv: Conversation) => {
    if (conv.title) return conv.title;
    if (conv.type === "direct") {
      const other = conv.participants.find((p) => p.user_id !== user?.id);
      return other?.full_name || "Conversa";
    }
    return "Grupo";
  };

  const getIcon = (type: string) => {
    if (type === "process") return <Scale className="w-4 h-4 text-primary" />;
    if (type === "group") return <Users className="w-4 h-4 text-accent" />;
    return <MessageSquare className="w-4 h-4 text-muted-foreground" />;
  };

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-xs gap-2">
        <MessageSquare className="w-8 h-8 opacity-30" />
        <p>Nenhuma conversa</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-0.5 p-1">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors text-sm",
              selectedId === conv.id
                ? "bg-primary/10 text-foreground"
                : "hover:bg-muted text-foreground/80"
            )}
          >
            <div className="shrink-0">{getIcon(conv.type)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-xs truncate">{getConversationName(conv)}</span>
                {conv.unread_count > 0 && (
                  <Badge className="bg-primary text-primary-foreground text-[9px] px-1.5 py-0 h-4 min-w-[16px] flex items-center justify-center">
                    {conv.unread_count}
                  </Badge>
                )}
              </div>
              {conv.last_message && (
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {conv.last_message.content}
                </p>
              )}
            </div>
            {conv.last_message && (
              <span className="text-[9px] text-muted-foreground shrink-0">
                {formatDistanceToNow(new Date(conv.last_message.created_at), { addSuffix: false, locale: ptBR })}
              </span>
            )}
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
