import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { supabase } from "@/integrations/supabase/client";
import { ChatMessageArea } from "./ChatMessageArea";
import { Button } from "@/components/ui/button";
import { MessageSquare, Loader2 } from "lucide-react";

interface ProcessChatProps {
  processoId: string;
  processoNumero: string;
}

export function ProcessChat({ processoId, processoNumero }: ProcessChatProps) {
  const { user } = useAuth();
  const { teamMembers } = usePermissions();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOrCreate = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Check if process conversation exists
    const { data: existing } = await supabase
      .from("chat_conversations")
      .select("id")
      .eq("type", "process")
      .eq("processo_id", processoId)
      .limit(1);

    if (existing && existing.length > 0) {
      setConversationId(existing[0].id);

      // Ensure current user is a participant
      const { data: part } = await supabase
        .from("chat_participants")
        .select("id")
        .eq("conversation_id", existing[0].id)
        .eq("user_id", user.id)
        .limit(1);

      if (!part || part.length === 0) {
        await supabase.from("chat_participants").insert({
          conversation_id: existing[0].id,
          user_id: user.id,
        });
      }
    } else {
      // Create
      const { data: newConv } = await supabase
        .from("chat_conversations")
        .insert({
          type: "process",
          title: `Processo ${processoNumero}`,
          processo_id: processoId,
        })
        .select()
        .single();

      if (newConv) {
        await supabase.from("chat_participants").insert({
          conversation_id: newConv.id,
          user_id: user.id,
        });
        setConversationId(newConv.id);
      }
    }

    setLoading(false);
  }, [processoId, processoNumero, user]);

  useEffect(() => {
    loadOrCreate();
  }, [loadOrCreate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[400px] border border-border rounded-lg overflow-hidden bg-card">
      <ChatMessageArea conversationId={conversationId} />
    </div>
  );
}
