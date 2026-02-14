import { useEffect, useRef, useState } from "react";
import { useChatMessages, type ChatMessage } from "@/hooks/useChat";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ChatMessageAreaProps {
  conversationId: string | null;
  compact?: boolean;
}

export function ChatMessageArea({ conversationId, compact }: ChatMessageAreaProps) {
  const { user } = useAuth();
  const { messages, loading, sendMessage } = useChatMessages(conversationId);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    await sendMessage(text);
    setText("");
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!conversationId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Selecione uma conversa para começar
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        <div className="space-y-3">
          {messages.length === 0 && (
            <p className="text-center text-muted-foreground text-xs py-8">
              Nenhuma mensagem ainda. Comece a conversa!
            </p>
          )}
          {messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={cn("flex gap-2", isMe ? "flex-row-reverse" : "flex-row")}>
                {!isMe && (
                  <Avatar className="w-7 h-7 shrink-0">
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {msg.sender?.full_name?.slice(0, 2).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={cn("max-w-[75%] space-y-0.5", isMe ? "items-end" : "items-start")}>
                  {!isMe && (
                    <p className="text-[10px] text-muted-foreground font-medium px-1">
                      {msg.sender?.full_name || "Usuário"}
                    </p>
                  )}
                  <div
                    className={cn(
                      "rounded-xl px-3 py-2 text-sm",
                      isMe
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted text-foreground rounded-tl-sm"
                    )}
                  >
                    {msg.content}
                  </div>
                  <p className={cn("text-[9px] text-muted-foreground px-1", isMe && "text-right")}>
                    {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="border-t border-border p-2 flex gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua mensagem..."
          className="min-h-[40px] max-h-[100px] text-sm resize-none"
          rows={1}
        />
        <Button size="icon" onClick={handleSend} disabled={!text.trim() || sending} className="shrink-0">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
