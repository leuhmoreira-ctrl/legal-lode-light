import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    loadNotifications();

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => loadNotifications()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (data) {
      setNotifications(data as Notification[]);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    }
  };

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    loadNotifications();
  };

  const markAllAsRead = async () => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user?.id)
      .eq("is_read", false);
    loadNotifications();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center font-bold">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          Notificações
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="text-xs text-primary hover:underline flex items-center gap-1">
              <Check className="w-3 h-3" /> Marcar todas
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">Nenhuma notificação</div>
        ) : (
          notifications.map((n) => (
            <DropdownMenuItem key={n.id} onClick={() => markAsRead(n.id)} className="flex flex-col items-start gap-1 cursor-pointer">
              <div className="flex items-center gap-2 w-full">
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!n.is_read ? "font-semibold" : ""}`}>{n.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                </div>
                {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
              </div>
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
