import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { EmailThread, EmailMessage } from "@/types/email";
import { uploadEmailAttachment } from "@/utils/storage";

export function useEmail() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [loading, setLoading] = useState(true);

  // Load threads
  const loadThreads = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("conversas_email")
      .select("*")
      .order("last_message_at", { ascending: false });

    if (error) {
      console.error("Error loading email threads:", error);
    } else {
      setThreads(data || []);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  const loadThreadMessages = useCallback(async (threadId: string) => {
    const { data, error } = await supabase
      .from("mensagens_email")
      .select("*")
      .eq("conversa_id", threadId)
      .order("created_at", { ascending: true });

    if (error) {
        console.error("Error loading messages:", error);
        return [];
    }
    return data as EmailMessage[];
  }, []);

  const markThreadAsRead = useCallback(async (threadId: string) => {
      const { error } = await supabase
          .from("mensagens_email")
          .update({ is_read: true })
          .eq("conversa_id", threadId)
          .eq("is_read", false);

      if (!error) {
          setThreads(prev => prev.map(t => t.id === threadId ? { ...t, unread_count: 0 } : t));
      }
  }, []);

  // Send Email
  const sendEmail = async (params: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    body: string; // HTML
    attachments?: File[];
    isDraft?: boolean;
    scheduledAt?: string;
    priority?: 'normal' | 'high' | 'low';
  }) => {
    if (!user) throw new Error("User not authenticated");

    const { to, cc = [], bcc = [], subject, body, attachments = [], isDraft, scheduledAt, priority } = params;

    // 1. Upload Attachments
    const uploadedAttachments: string[] = [];
    if (attachments.length > 0) {
      for (const file of attachments) {
        try {
          const { url } = await uploadEmailAttachment(file);
          uploadedAttachments.push(`<p><a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">[Anexo: ${file.name}]</a></p>`);
        } catch (e) {
          console.error("Failed to upload attachment", file.name, e);
        }
      }
    }

    // Append metadata and attachments to body
    let bodyWithExtras = body;

    if (priority && priority !== 'normal') {
      bodyWithExtras = `<div data-priority="${priority}" style="display:none"></div>` + bodyWithExtras;
    }

    if (scheduledAt) {
       bodyWithExtras = `<div data-scheduled-at="${scheduledAt}" style="display:none"></div>` + bodyWithExtras;
    }

    if (uploadedAttachments.length > 0) {
      bodyWithExtras += `<hr/><div class="attachments"><strong>Anexos:</strong><br/>${uploadedAttachments.join("")}</div>`;
    }

    // 2. Create Thread
    const { data: thread, error: threadError } = await supabase
      .from("conversas_email")
      .insert({
        user_id: user.id,
        subject: subject,
        snippet: body.replace(/<[^>]*>/g, '').substring(0, 100),
        last_message_at: new Date().toISOString(),
        has_attachments: attachments.length > 0,
        unread_count: 0
      })
      .select()
      .single();

    if (threadError) throw threadError;

    // 3. Insert Message
    const { error: msgError } = await supabase
      .from("mensagens_email")
      .insert({
        conversa_id: thread.id,
        from_email: user.email || "usuario@sistema.com",
        from_name: user.user_metadata?.full_name || "Usuário",
        to_recipients: to,
        cc_recipients: cc,
        bcc_recipients: bcc,
        subject: subject,
        body_html: bodyWithExtras,
        body_text: body.replace(/<[^>]*>/g, ''),
        sent_at: isDraft ? null : new Date().toISOString(), // If scheduled, we still mark created now, but effective send is manual/worker
        is_read: true,
        is_sent: !isDraft,
        folder: isDraft ? 'drafts' : 'sent',
        has_attachments: attachments.length > 0
      });

    if (msgError) throw msgError;

    await loadThreads();
    return thread.id;
  };

  const deleteThread = async (id: string) => {
    const { error } = await supabase.from("conversas_email").delete().eq("id", id);
    if (error) throw error;
    setThreads(prev => prev.filter(t => t.id !== id));
  };

  return {
    threads,
    loading,
    refresh: loadThreads,
    sendEmail,
    deleteThread,
    loadThreadMessages,
    markThreadAsRead
  };
}
