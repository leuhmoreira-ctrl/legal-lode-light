import { useEffect, useRef, useState } from "react";
import { useChatMessages, type ChatMessage } from "@/hooks/useChat";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Smile, Paperclip, File as FileIcon, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ChatMessageAreaProps {
  conversationId: string | null;
  compact?: boolean;
}

export function ChatMessageArea({ conversationId, compact }: ChatMessageAreaProps) {
  const { user } = useAuth();
  const { messages, loading, sendMessage, sendFile, typingUsers, setTyping } = useChatMessages(conversationId);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typingUsers]); // Scroll when typing users change too

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    await sendMessage(text);
    setText("");
    setTyping(false);
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setText((prev) => prev + emojiData.emoji);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        setSending(true); // Show sending state
        await sendFile(file);
        setSending(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
      if (!text && e.target.value) {
          setTyping(true);
      } else if (text && !e.target.value) {
          setTyping(false);
      }
  }

  // Render content logic
  const renderContent = (content: string) => {
      const fileMatch = content.match(/^\[Arquivo\] (.*?) \((.*?)\)$/);
      if (fileMatch) {
          const name = fileMatch[1];
          const url = fileMatch[2];
          return (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-background/50 p-2 rounded border border-border/50 hover:bg-background/80 transition-colors group"
              >
                  <div className="bg-primary/10 p-1.5 rounded text-primary group-hover:bg-primary/20">
                    <FileIcon className="w-4 h-4" />
                  </div>
                  <span className="text-sm underline decoration-dotted underline-offset-4 truncate max-w-[200px]">{name}</span>
              </a>
          );
      }
      return <div className="whitespace-pre-wrap break-words">{content}</div>;
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
    <div className="flex flex-col h-full relative">
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        <div className="space-y-3 pb-2">
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
                      "rounded-xl px-3 py-2 text-sm shadow-sm",
                      isMe
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted text-foreground rounded-tl-sm border border-border/50"
                    )}
                  >
                    {renderContent(msg.content)}
                  </div>
                  <p className={cn("text-[9px] text-muted-foreground px-1 opacity-70", isMe && "text-right")}>
                    {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {typingUsers && typingUsers.length > 0 && (
              <div className="flex items-center gap-2 px-1 animate-pulse">
                  <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce delay-0"></span>
                      <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce delay-150"></span>
                      <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce delay-300"></span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">digitando...</span>
              </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-border p-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-end gap-2 bg-muted/30 p-1.5 rounded-lg border border-border/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
          <div className="flex gap-0.5 pb-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary rounded-full">
                  <Smile className="w-5 h-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0 border-none shadow-xl" align="start" side="top">
                <EmojiPicker onEmojiClick={handleEmojiClick} lazyLoadEmojis={true} theme={"auto" as any} width={300} height={400} />
              </PopoverContent>
            </Popover>

            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-primary rounded-full"
                onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="w-5 h-5" />
            </Button>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
            />
          </div>

          <Textarea
            value={text}
            onChange={handleTyping}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            className="flex-1 min-h-[40px] max-h-[120px] bg-transparent border-none focus-visible:ring-0 resize-none py-2.5 px-2 text-sm placeholder:text-muted-foreground/50"
            rows={1}
          />

          <Button
            size="icon"
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className={cn(
                "h-8 w-8 shrink-0 rounded-full mb-1 transition-all",
                text.trim() ? "opacity-100 scale-100" : "opacity-50 scale-90"
            )}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
