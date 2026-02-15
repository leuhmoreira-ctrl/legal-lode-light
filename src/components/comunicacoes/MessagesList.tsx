import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/UserAvatar";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Message } from "@/hooks/useMessages";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  messages: Message[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function MessagesList({ messages, selectedId, onSelect }: Props) {
  const { user } = useAuth();

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-muted-foreground text-sm">
        Nenhuma mensagem ainda.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {messages.map((msg) => {
        const isUnread = user && msg.to_user_ids.includes(user.id) && !msg.read_by.includes(user.id);
        return (
          <button
            key={msg.id}
            onClick={() => onSelect(msg.id)}
            className={cn(
              "w-full text-left px-4 py-3 border-b border-border/40 hover:bg-muted/50 transition-colors",
              selectedId === msg.id && "bg-muted",
              isUnread && "bg-primary/5"
            )}
          >
            <div className="flex items-center gap-3">
              <UserAvatar name={msg.sender_name || ""} avatarUrl={msg.sender_avatar} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={cn("text-sm truncate", isUnread ? "font-semibold text-foreground" : "text-foreground/80")}>
                    {msg.sender_name}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
                <p className={cn("text-xs truncate mt-0.5", isUnread ? "font-medium text-foreground" : "text-muted-foreground")}>
                  {msg.subject}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">{msg.body.slice(0, 80)}</p>
              </div>
              {isUnread && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
            </div>
          </button>
        );
      })}
    </div>
  );
}
