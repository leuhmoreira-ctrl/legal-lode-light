import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationItem } from "@/components/NotificationItem";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCheck, Bell } from "lucide-react";

export default function Notifications() {
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead, deleteNotification: archive } = useNotifications();
  const [filterType, setFilterType] = useState("all");
  const [tab, setTab] = useState("all");

  const filteredNotifications = notifications.filter((n) => {
    const typeMatch = filterType === "all" || n.type === filterType;
    const tabMatch = tab === "all"
      ? true
      : tab === "unread"
        ? !n.is_read
        : n.type === tab; // simplify tab logic for now, or expand tabs

    // Adjust logic:
    // Tab "all": show all
    // Tab "unread": show only unread
    // Tab "email": show emails
    // Tab "internal": show messages

    if (tab === "unread") return !n.is_read;
    if (tab === "email") return n.type === "email";
    if (tab === "internal") return n.type === "internal";

    return typeMatch;
  });

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto animate-fade-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary" /> Notificações
            </h1>
            <p className="text-sm text-muted-foreground">
              Você tem {unreadCount} nova{unreadCount !== 1 ? "s" : ""} notificação{unreadCount !== 1 ? "ões" : ""}.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => markAllAsRead()} disabled={unreadCount === 0}>
              <CheckCheck className="w-4 h-4 mr-2" /> Marcar todas como lidas
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-lg border shadow-sm">
          <Tabs value={tab} onValueChange={setTab} className="w-full sm:w-auto">
            <TabsList>
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="unread">Não lidas</TabsTrigger>
              <TabsTrigger value="email">E-mails</TabsTrigger>
              <TabsTrigger value="internal">Mensagens</TabsTrigger>
            </TabsList>
          </Tabs>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="deadline_alert">Prazos</SelectItem>
              <SelectItem value="email">E-mails</SelectItem>
              <SelectItem value="internal">Sistema</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={markAsRead}
                  onArchive={archive}
                />
              ))
            ) : (
              <div className="text-center py-16 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Nenhuma notificação encontrada.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
