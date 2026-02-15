import { useState, useEffect, useCallback, useMemo } from "react";
import { useChat, type Conversation } from "@/hooks/useChat";
import type { UnifiedConversation, UnifiedMessage, ConversationFilter } from "@/types/comunicacoes";
import { useAuth } from "@/contexts/AuthContext";

// Mock email conversations
const MOCK_EMAIL_CONVERSATIONS: UnifiedConversation[] = [
  {
    id: "email-1",
    type: "email",
    title: "Maria Silva Santos",
    subtitle: "maria.silva@email.com",
    snippet: "Re: Cópia da petição inicial conforme solicitado...",
    unread_count: 1,
    has_attachments: true,
    pinned: false,
    muted: false,
    last_message_at: new Date(Date.now() - 600000).toISOString(),
    email_from: "maria.silva@email.com",
    email_to: ["advogado@juriscontrol.com"],
    email_subject: "Re: Cópia da petição",
    thread_count: 3,
  },
  {
    id: "email-2",
    type: "email",
    title: "João Pereira",
    subtitle: "joao@empresa.com.br",
    snippet: "Proposta de acordo no valor de R$ 50.000,00...",
    unread_count: 0,
    has_attachments: false,
    pinned: false,
    muted: false,
    last_message_at: new Date(Date.now() - 7200000).toISOString(),
    email_from: "joao@empresa.com.br",
    email_to: ["advogado@juriscontrol.com"],
    email_subject: "Proposta de acordo",
    thread_count: 1,
  },
  {
    id: "email-3",
    type: "email",
    title: "Tribunal de Justiça",
    subtitle: "notificacao@tjsp.jus.br",
    snippet: "Intimação - Processo nº 1234567-89.2024...",
    unread_count: 1,
    has_attachments: true,
    pinned: false,
    muted: false,
    last_message_at: new Date(Date.now() - 86400000).toISOString(),
    email_from: "notificacao@tjsp.jus.br",
    email_to: ["advogado@juriscontrol.com"],
    email_subject: "Intimação - Processo nº 1234567-89.2024",
    thread_count: 1,
  },
];

const MOCK_EMAIL_MESSAGES: Record<string, UnifiedMessage[]> = {
  "email-1": [
    {
      id: "em1",
      conversation_id: "email-1",
      type: "email",
      sender_name: "Maria Silva Santos",
      sender_email: "maria.silva@email.com",
      content: "Olá Dr.,\n\nSegue em anexo a cópia do RG e comprovante de residência conforme solicitado.\n\nAtt,\nMaria Silva",
      is_sent: false,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      has_attachments: true,
    },
    {
      id: "em2",
      conversation_id: "email-1",
      type: "email",
      sender_name: "Você",
      sender_email: "advogado@juriscontrol.com",
      content: "Maria, obrigado pelos documentos.\n\nVou protocolar a petição hoje. Te mantenho informada sobre o andamento.",
      is_sent: true,
      created_at: new Date(Date.now() - 43200000).toISOString(),
      has_attachments: false,
    },
    {
      id: "em3",
      conversation_id: "email-1",
      type: "email",
      sender_name: "Maria Silva Santos",
      sender_email: "maria.silva@email.com",
      content: "Perfeito, Dr.! Fico no aguardo. Muito obrigada pela atenção.",
      is_sent: false,
      created_at: new Date(Date.now() - 600000).toISOString(),
      has_attachments: false,
    },
  ],
  "email-2": [
    {
      id: "em4",
      conversation_id: "email-2",
      type: "email",
      sender_name: "João Pereira",
      sender_email: "joao@empresa.com.br",
      content: "Dr.,\n\nGostaria de discutir uma proposta de acordo no valor de R$ 50.000,00 para encerrar a disputa.\n\nPodemos agendar uma reunião?\n\nJoão Pereira\nDiretor - Empresa XYZ",
      is_sent: false,
      created_at: new Date(Date.now() - 7200000).toISOString(),
      has_attachments: false,
    },
  ],
  "email-3": [
    {
      id: "em5",
      conversation_id: "email-3",
      type: "email",
      sender_name: "Tribunal de Justiça de SP",
      sender_email: "notificacao@tjsp.jus.br",
      content: "INTIMAÇÃO ELETRÔNICA\n\nProcesso nº 1234567-89.2024.8.26.0100\n\nFica V.Sa. intimado(a) para apresentar contestação no prazo de 15 dias úteis.\n\nVara Cível - Comarca de São Paulo",
      is_sent: false,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      has_attachments: true,
    },
  ],
};

function chatConversationToUnified(conv: Conversation, currentUserId?: string): UnifiedConversation {
  const otherParticipant = conv.participants.find((p) => p.user_id !== currentUserId);
  const title = conv.title || otherParticipant?.full_name || "Conversa";
  
  return {
    id: conv.id,
    type: "chat",
    title,
    snippet: conv.last_message?.content || "Nenhuma mensagem ainda",
    unread_count: conv.unread_count,
    has_attachments: false,
    pinned: false,
    muted: false,
    last_message_at: conv.last_message?.created_at || conv.updated_at,
    processo_id: conv.processo_id,
    participants: conv.participants,
    chat_type: conv.type,
  };
}

export function useComunicacoes() {
  const { user } = useAuth();
  const { conversations: chatConversations, loading: chatLoading, loadConversations, createDirectConversation } = useChat();
  const [filter, setFilter] = useState<ConversationFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [emailMessages, setEmailMessages] = useState<Record<string, UnifiedMessage[]>>(MOCK_EMAIL_MESSAGES);

  const allConversations = useMemo(() => {
    const chatUnified = chatConversations.map((c) => chatConversationToUnified(c, user?.id));
    const all = [...chatUnified, ...MOCK_EMAIL_CONVERSATIONS];
    
    // Sort by last_message_at descending
    all.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
    
    return all;
  }, [chatConversations, user?.id]);

  const filteredConversations = useMemo(() => {
    let filtered = allConversations;
    
    if (filter === "chat") filtered = filtered.filter((c) => c.type === "chat");
    if (filter === "email") filtered = filtered.filter((c) => c.type === "email");
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.snippet.toLowerCase().includes(q) ||
          c.subtitle?.toLowerCase().includes(q) ||
          c.email_subject?.toLowerCase().includes(q)
      );
    }
    
    return filtered;
  }, [allConversations, filter, searchQuery]);

  const selectedConversation = allConversations.find((c) => c.id === selectedId) || null;

  const totalUnread = useMemo(() => allConversations.reduce((sum, c) => sum + c.unread_count, 0), [allConversations]);
  const chatUnread = useMemo(() => allConversations.filter((c) => c.type === "chat").reduce((sum, c) => sum + c.unread_count, 0), [allConversations]);
  const emailUnread = useMemo(() => allConversations.filter((c) => c.type === "email").reduce((sum, c) => sum + c.unread_count, 0), [allConversations]);

  const getEmailMessages = useCallback((conversationId: string): UnifiedMessage[] => {
    return emailMessages[conversationId] || [];
  }, [emailMessages]);

  const sendEmailReply = useCallback((conversationId: string, content: string) => {
    const newMsg: UnifiedMessage = {
      id: `em-${Date.now()}`,
      conversation_id: conversationId,
      type: "email",
      sender_name: "Você",
      sender_email: "advogado@juriscontrol.com",
      content,
      is_sent: true,
      created_at: new Date().toISOString(),
      has_attachments: false,
    };
    setEmailMessages((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), newMsg],
    }));
  }, []);

  return {
    conversations: filteredConversations,
    allConversations,
    selectedConversation,
    selectedId,
    setSelectedId,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    loading: chatLoading,
    totalUnread,
    chatUnread,
    emailUnread,
    getEmailMessages,
    sendEmailReply,
    createDirectConversation,
    loadConversations,
  };
}
