import { useMemo } from "react";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { useMessages, type Message } from "@/hooks/useMessages";
import { useAuth } from "@/contexts/AuthContext";

export type UnifiedItemType = "notification" | "message" | "email";

export interface UnifiedItem {
  id: string;
  type: UnifiedItemType;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  link?: string;
  // notification fields
  notification_type?: string;
  // message fields
  sender_name?: string;
  sender_avatar?: string | null;
  from_user_id?: string;
  to_user_ids?: string[];
  read_by?: string[];
  // original refs
  raw_notification?: Notification;
  raw_message?: Message;
}

// Mock emails
const mockEmails: UnifiedItem[] = [
  {
    id: "email-mock-1",
    type: "email",
    title: "Intimação - Processo 0001234-56.2025.8.26.0100",
    body: "Fica Vossa Senhoria intimado(a) para comparecer à audiência designada para o dia 20/03/2026 às 14h.",
    is_read: true,
    created_at: "2026-02-14T10:00:00Z",
    sender_name: "tribunal@tjsp.jus.br",
  },
  {
    id: "email-mock-2",
    type: "email",
    title: "Re: Documentação pendente - Cliente Silva",
    body: "Prezado Dr., segue em anexo a procuração assinada conforme solicitado. Aguardo retorno.",
    is_read: false,
    created_at: "2026-02-13T16:30:00Z",
    sender_name: "joao.silva@email.com",
  },
  {
    id: "email-mock-3",
    type: "email",
    title: "Nota de expediente - OAB/SP",
    body: "Informamos que o prazo para renovação da anuidade 2026 encerra-se em 31/03/2026.",
    is_read: true,
    created_at: "2026-02-12T09:15:00Z",
    sender_name: "secretaria@oabsp.org.br",
  },
];

export function useComunicacoesUnificadas() {
  const { user } = useAuth();
  const {
    notifications,
    loading: notificationsLoading,
    unreadCount: notifUnread,
    markAsRead: markNotifAsRead,
    markAllAsRead: markAllNotifsAsRead,
    deleteNotification,
  } = useNotifications();

  const {
    messages,
    isLoading: messagesLoading,
    unreadCount: msgUnread,
    markAsRead: markMsgAsRead,
    sendMessage,
  } = useMessages();

  const unifiedItems = useMemo(() => {
    const notifItems: UnifiedItem[] = notifications.map((n) => ({
      id: n.id,
      type: "notification" as const,
      title: n.title,
      body: n.message,
      is_read: n.is_read,
      created_at: n.created_at,
      link: n.link,
      notification_type: n.type,
      raw_notification: n,
    }));

    const msgItems: UnifiedItem[] = messages.map((m) => ({
      id: m.id,
      type: "message" as const,
      title: m.subject,
      body: m.body,
      is_read: user ? m.read_by.includes(user.id) : false,
      created_at: m.created_at,
      sender_name: m.sender_name,
      sender_avatar: m.sender_avatar,
      from_user_id: m.from_user_id,
      to_user_ids: m.to_user_ids,
      read_by: m.read_by,
      raw_message: m,
    }));

    return [...notifItems, ...msgItems, ...mockEmails].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [notifications, messages, user]);

  const emailUnread = mockEmails.filter((e) => !e.is_read).length;

  const markAsRead = async (item: UnifiedItem) => {
    if (item.type === "notification") {
      await markNotifAsRead(item.id);
    } else if (item.type === "message") {
      await markMsgAsRead(item.id);
    }
    // emails mock — no-op
  };

  return {
    items: unifiedItems,
    loading: notificationsLoading || messagesLoading,
    counts: {
      notifications: notifUnread,
      messages: msgUnread,
      emails: emailUnread,
      total: notifUnread + msgUnread + emailUnread,
    },
    markAsRead,
    markAllNotifsAsRead,
    deleteNotification,
    sendMessage,
  };
}
