import { useMemo } from "react";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { useChat } from "@/hooks/useChat";
import { useEmail } from "@/hooks/useEmail";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  // message (chat) fields
  sender_name?: string;
  sender_avatar?: string | null;
  conversation_id?: string;
  // email fields
  email_thread_id?: string;
  raw_notification?: Notification;
}

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

  // Use Chat Hook
  const {
      conversations,
      loading: chatLoading,
      createDirectConversation,
  } = useChat();

  // Use Email Hook
  const {
      threads: emailThreads,
      loading: emailLoading
  } = useEmail();

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

    const chatItems: UnifiedItem[] = conversations.map((c) => {
        let title = c.title;
        let avatar: string | null = null;

        if (!title && c.type === 'direct') {
            const other = c.participants.find(p => p.user_id !== user?.id);
            title = other?.full_name || "Conversa";
            avatar = other?.avatar_url || null;
        } else if (!title) {
            title = "Grupo/Processo";
        }

        return {
          id: c.id, // Using conversation ID as Item ID
          type: "message" as const,
          title: title || "Mensagem",
          body: c.last_message?.content || "Inicie a conversa",
          is_read: c.unread_count === 0,
          created_at: c.last_message?.created_at || c.updated_at,
          sender_name: title || "Chat",
          sender_avatar: avatar,
          conversation_id: c.id
        };
    });

    const emailItems: UnifiedItem[] = emailThreads.map((t) => ({
        id: t.id,
        type: "email" as const,
        title: t.subject || "Sem assunto",
        body: t.snippet || "Sem conteúdo",
        is_read: t.unread_count === 0,
        created_at: t.last_message_at || t.created_at,
        sender_name: "Email",
        email_thread_id: t.id
    }));

    return [...notifItems, ...chatItems, ...emailItems].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [notifications, conversations, emailThreads, user]);

  const counts = {
      notifications: notifUnread,
      messages: conversations.reduce((acc, c) => acc + c.unread_count, 0),
      emails: emailThreads.reduce((acc, t) => acc + t.unread_count, 0),
      total: notifUnread + conversations.reduce((acc, c) => acc + c.unread_count, 0) + emailThreads.reduce((acc, t) => acc + t.unread_count, 0)
  };

  const markAsRead = async (item: UnifiedItem) => {
    if (item.type === "notification") {
      await markNotifAsRead(item.id);
    }
    // Chat and Email are marked as read when opening details
  };

  // Adapter for old sendMessage (if needed by existing components)
  const sendMessage = {
      mutateAsync: async (msg: { subject: string; body: string; to_user_ids: string[] }) => {
          if (msg.to_user_ids.length === 1) {
              await createDirectConversation(msg.to_user_ids[0]);
              // Note: Message sending logic is handled in the chat UI
          }
      }
  };

  return {
    items: unifiedItems,
    loading: notificationsLoading || chatLoading || emailLoading,
    counts,
    markAsRead,
    markAllNotifsAsRead,
    deleteNotification,
    sendMessage,
  };
}
