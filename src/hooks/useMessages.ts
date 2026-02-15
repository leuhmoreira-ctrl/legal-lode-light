import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Message {
  id: string;
  type: string;
  subject: string;
  body: string;
  from_user_id: string;
  to_user_ids: string[];
  read_by: string[];
  created_at: string;
  // Joined
  sender_name?: string;
  sender_avatar?: string | null;
}

export function useMessages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["messages", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch sender profiles
      const senderIds = [...new Set((data || []).map((m: any) => m.from_user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", senderIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      return (data || []).map((m: any) => ({
        ...m,
        sender_name: profileMap.get(m.from_user_id)?.full_name || "Usuário",
        sender_avatar: profileMap.get(m.from_user_id)?.avatar_url || null,
      })) as Message[];
    },
    enabled: !!user,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("messages-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        queryClient.invalidateQueries({ queryKey: ["messages", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const sendMessage = useMutation({
    mutationFn: async (msg: { subject: string; body: string; to_user_ids: string[] }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("messages").insert({
        subject: msg.subject,
        body: msg.body,
        from_user_id: user.id,
        to_user_ids: msg.to_user_ids,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["messages"] }),
  });

  const markAsRead = useCallback(async (messageId: string) => {
    if (!user) return;
    const msg = messages.find((m) => m.id === messageId);
    if (!msg || msg.read_by.includes(user.id)) return;
    await supabase
      .from("messages")
      .update({ read_by: [...msg.read_by, user.id] })
      .eq("id", messageId);
    queryClient.invalidateQueries({ queryKey: ["messages"] });
  }, [user, messages, queryClient]);

  const unreadCount = useMemo(() => {
    if (!user) return 0;
    return messages.filter((m) => 
      m.to_user_ids.includes(user.id) && !m.read_by.includes(user.id)
    ).length;
  }, [messages, user]);

  return { messages, isLoading, sendMessage, markAsRead, unreadCount };
}
