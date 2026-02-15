import { useEffect } from "react";
import { UserAvatar } from "@/components/UserAvatar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Message } from "@/hooks/useMessages";

interface Props {
  message: Message;
  onMarkAsRead: (id: string) => void;
}

export function MessageView({ message, onMarkAsRead }: Props) {
  useEffect(() => {
    onMarkAsRead(message.id);
  }, [message.id, onMarkAsRead]);

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto">
      <div className="flex items-center gap-3 mb-4">
        <UserAvatar name={message.sender_name || ""} avatarUrl={message.sender_avatar} size="md" />
        <div>
          <p className="font-semibold text-foreground">{message.sender_name}</p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(message.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>
      </div>
      <h2 className="text-lg font-bold text-foreground mb-4">{message.subject}</h2>
      <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
        {message.body}
      </div>
    </div>
  );
}
