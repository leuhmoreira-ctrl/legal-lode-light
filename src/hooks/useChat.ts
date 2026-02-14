import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Conversation {
  id: string;
  type: "direct" | "process" | "group";
  title: string | null;
  processo_id: string | null;
  created_at: string;
  updated_at: string;
  participants: { user_id: string; full_name: string; avatar_url: string | null }[];
  last_message?: { content: string; created_at: string; sender_id: string };
  unread_count: number;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: { full_name: string; avatar_url: string | null };
}

export function useChat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: convos } = await supabase
      .from("chat_conversations")
      .select("*")
      .order("updated_at", { ascending: false });

    if (!convos) { setLoading(false); return; }

    const enriched: Conversation[] = await Promise.all(
      convos.map(async (c) => {
        const { data: parts } = await supabase
          .from("chat_participants")
          .select("user_id, last_read_at")
          .eq("conversation_id", c.id);

        const userIds = (parts || []).map((p) => p.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds);

        const participants = (profiles || []).map((p) => ({
          user_id: p.id,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
        }));

        const { data: msgs } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("conversation_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1);

        const myParticipant = (parts || []).find((p) => p.user_id === user.id);
        const lastReadAt = myParticipant?.last_read_at;

        const { count } = await supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", c.id)
          .neq("sender_id", user.id)
          .gt("created_at", lastReadAt || "1970-01-01");

        return {
          ...c,
          type: c.type as "direct" | "process" | "group",
          participants,
          last_message: msgs?.[0] || undefined,
          unread_count: count || 0,
        };
      })
    );

    setConversations(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const createDirectConversation = useCallback(
    async (otherUserId: string) => {
      if (!user) return null;

      // Check if direct conversation already exists
      const { data: myConvos } = await supabase
        .from("chat_participants")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (myConvos) {
        for (const mc of myConvos) {
          const { data: conv } = await supabase
            .from("chat_conversations")
            .select("*")
            .eq("id", mc.conversation_id)
            .eq("type", "direct")
            .single();

          if (conv) {
            const { data: otherPart } = await supabase
              .from("chat_participants")
              .select("user_id")
              .eq("conversation_id", conv.id)
              .eq("user_id", otherUserId)
              .single();

            if (otherPart) return conv.id;
          }
        }
      }

      // Create new
      const { data: newConv } = await supabase
        .from("chat_conversations")
        .insert({ type: "direct" })
        .select()
        .single();

      if (!newConv) return null;

      await supabase.from("chat_participants").insert([
        { conversation_id: newConv.id, user_id: user.id },
        { conversation_id: newConv.id, user_id: otherUserId },
      ]);

      await loadConversations();
      return newConv.id;
    },
    [user, loadConversations]
  );

  const createProcessConversation = useCallback(
    async (processoId: string, title: string, participantIds: string[]) => {
      if (!user) return null;

      // Check if process conversation already exists
      const { data: existing } = await supabase
        .from("chat_conversations")
        .select("id")
        .eq("type", "process")
        .eq("processo_id", processoId)
        .limit(1);

      if (existing && existing.length > 0) return existing[0].id;

      const { data: newConv } = await supabase
        .from("chat_conversations")
        .insert({ type: "process", title, processo_id: processoId })
        .select()
        .single();

      if (!newConv) return null;

      const allIds = [...new Set([user.id, ...participantIds])];
      await supabase.from("chat_participants").insert(
        allIds.map((uid) => ({ conversation_id: newConv.id, user_id: uid }))
      );

      await loadConversations();
      return newConv.id;
    },
    [user, loadConversations]
  );

  return {
    conversations,
    loading,
    loadConversations,
    createDirectConversation,
    createProcessConversation,
  };
}

export function useChatMessages(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);

    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (data) {
      const senderIds = [...new Set(data.map((m) => m.sender_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", senderIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      setMessages(
        data.map((m) => ({
          ...m,
          sender: profileMap.get(m.sender_id)
            ? { full_name: profileMap.get(m.sender_id)!.full_name, avatar_url: profileMap.get(m.sender_id)!.avatar_url }
            : undefined,
        }))
      );
    }

    // Mark as read
    if (user) {
      await supabase
        .from("chat_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id);
    }

    setLoading(false);
  }, [conversationId, user]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          const newMsg = payload.new as any;
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", newMsg.sender_id)
            .single();

          setMessages((prev) => [
            ...prev,
            { ...newMsg, sender: profile || undefined },
          ]);

          // Mark as read
          if (user && newMsg.sender_id !== user.id) {
            await supabase
              .from("chat_participants")
              .update({ last_read_at: new Date().toISOString() })
              .eq("conversation_id", conversationId)
              .eq("user_id", user.id);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, user]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId || !user || !content.trim()) return;

      await supabase.from("chat_messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
      });

      // Update conversation updated_at
      await supabase
        .from("chat_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);
    },
    [conversationId, user]
  );

  return { messages, loading, sendMessage, loadMessages };
}
