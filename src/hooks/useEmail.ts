import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { EmailThread, EmailMessage } from "@/types/email";

// Email tables don't exist in the database yet - using mock data
export function useEmail() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [loading, setLoading] = useState(false);

  const loadThreads = useCallback(async () => {
    // No email tables in DB yet - return empty
    setThreads([]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  const loadThreadMessages = useCallback(async (_threadId: string): Promise<EmailMessage[]> => {
    return [];
  }, []);

  const markThreadAsRead = useCallback(async (_threadId: string) => {}, []);

  const sendEmail = async (_params: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    body: string;
    attachments?: File[];
    isDraft?: boolean;
    scheduledAt?: string;
    priority?: 'normal' | 'high' | 'low';
  }) => {
    throw new Error("Email not yet implemented");
  };

  const deleteThread = async (_id: string) => {
    throw new Error("Email not yet implemented");
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
