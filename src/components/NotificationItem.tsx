import { Notification } from "@/hooks/useNotifications";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageSquare, AlertCircle, Check, Archive, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
  onArchive: (id: string) => void;
}

export function NotificationItem({ notification, onRead, onArchive }: NotificationItemProps) {
  const getIcon = () => {
    switch (notification.type) {
      case "email":
        return <Mail className="w-5 h-5 text-blue-500" />;
      case "internal":
        return <MessageSquare className="w-5 h-5 text-green-500" />;
      case "deadline_alert":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <Card className={cn(
      "p-4 transition-all hover:bg-muted/50 border-l-4",
      notification.is_read ? "border-l-transparent bg-background" : "border-l-primary bg-primary/5"
    )}>
      <div className="flex gap-4 items-start">
        <div className="mt-1 shrink-0">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <h4 className={cn("text-sm font-semibold", !notification.is_read && "text-foreground")}>
              {notification.title}
            </h4>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {notification.message}
          </p>
          <div className="flex items-center gap-2 mt-3">
            {(notification as any).from_email && (
              <Badge variant="outline" className="text-[10px]">
                {(notification as any).from_email}
              </Badge>
            )}
            {notification.link && (
              <a href={notification.link} className="text-xs text-primary hover:underline font-medium">
                Ver detalhes
              </a>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!notification.is_read && (
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onRead(notification.id)} title="Marcar como lida">
              <Check className="w-4 h-4" />
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => onArchive(notification.id)} title="Arquivar">
            <Archive className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
