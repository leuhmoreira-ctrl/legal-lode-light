import { useState } from "react";
import { MessageSquare, Mail, Paperclip, Send, MoreVertical, Pin, BellOff, Trash2, Star, Link, Archive } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { UnifiedConversation, UnifiedMessage } from "@/types/comunicacoes";
import { ChatMessageArea } from "@/components/chat/ChatMessageArea";

interface Props {
  conversation: UnifiedConversation;
  emailMessages: UnifiedMessage[];
  onSendEmailReply: (content: string) => void;
}

export function UnifiedMessageArea({ conversation, emailMessages, onSendEmailReply }: Props) {
  const [replyText, setReplyText] = useState("");

  if (conversation.type === "chat") {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <ChatHeader conversation={conversation} />
        {/* Reuse existing chat message area */}
        <div className="flex-1 min-h-0">
          <ChatMessageArea conversationId={conversation.id} />
        </div>
      </div>
    );
  }

  // Email view
  const handleSendEmail = () => {
    if (!replyText.trim()) return;
    onSendEmailReply(replyText);
    setReplyText("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <ChatHeader conversation={conversation} />

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-3xl mx-auto">
          {emailMessages.map((msg) => (
            <div key={msg.id} className={cn("flex gap-3", msg.is_sent ? "flex-row-reverse" : "")}>
              <Avatar className="w-8 h-8 mt-1 shrink-0">
                <AvatarFallback className={cn(
                  "text-xs",
                  msg.is_sent ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  {msg.sender_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className={cn("flex flex-col max-w-[80%]", msg.is_sent ? "items-end" : "items-start")}>
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className="text-sm font-semibold">{msg.sender_name}</span>
                  {msg.sender_email && !msg.is_sent && (
                    <span className="text-[11px] text-muted-foreground">&lt;{msg.sender_email}&gt;</span>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    {format(new Date(msg.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <div className={cn(
                  "rounded-lg p-4 border shadow-sm text-sm leading-relaxed whitespace-pre-wrap",
                  msg.is_sent ? "bg-primary/5 border-primary/10" : "bg-card border-border"
                )}>
                  {msg.content}
                </div>
                {msg.has_attachments && (
                  <div className="flex items-center gap-1 mt-1 px-1 text-muted-foreground">
                    <Paperclip className="w-3 h-3" />
                    <span className="text-[11px]">Anexo</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Email Reply */}
      <div className="border-t border-border p-4 bg-muted/10">
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Mail className="w-3 h-3 text-success" />
              <span>Enviar via Email</span>
            </div>
            <span>Para: {conversation.email_from}</span>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground shrink-0">Assunto:</Label>
            <Input
              value={`Re: ${conversation.email_subject || ""}`}
              readOnly
              className="h-7 text-xs bg-background"
            />
          </div>
          <Textarea
            placeholder="Escreva sua resposta..."
            className="min-h-[80px] resize-none bg-background text-sm"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
          />
          <div className="flex justify-between items-center">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
              <Paperclip className="w-4 h-4" /> Anexar
            </Button>
            <Button onClick={handleSendEmail} disabled={!replyText.trim()} className="gap-2">
              <Mail className="w-4 h-4" /> Enviar Email
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatHeader({ conversation }: { conversation: UnifiedConversation }) {
  const isChat = conversation.type === "chat";

  return (
    <div className="px-4 py-3 border-b border-border flex justify-between items-center bg-card">
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
          isChat ? "bg-primary/10" : "bg-success/10"
        )}>
          {isChat ? (
            <MessageSquare className="w-4 h-4 text-primary" />
          ) : (
            <Mail className="w-4 h-4 text-success" />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground truncate">{conversation.title}</h3>
          <div className="flex items-center gap-2">
            {isChat ? (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> Chat Interno
                <span className="w-1.5 h-1.5 rounded-full bg-success inline-block ml-1" />
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Mail className="w-3 h-3" /> {conversation.email_from}
                {conversation.thread_count && conversation.thread_count > 1 && (
                  <Badge variant="outline" className="text-[9px] h-4 ml-1">
                    {conversation.thread_count} msgs
                  </Badge>
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem className="gap-2 text-xs cursor-pointer">
            <Pin className="w-3.5 h-3.5" /> Fixar no topo
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2 text-xs cursor-pointer">
            <BellOff className="w-3.5 h-3.5" /> Silenciar
          </DropdownMenuItem>
          {!isChat && (
            <>
              <DropdownMenuItem className="gap-2 text-xs cursor-pointer">
                <Star className="w-3.5 h-3.5" /> Marcar com estrela
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-xs cursor-pointer">
                <Link className="w-3.5 h-3.5" /> Vincular a processo
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-xs cursor-pointer">
                <Archive className="w-3.5 h-3.5" /> Arquivar
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2 text-xs cursor-pointer text-destructive">
            <Trash2 className="w-3.5 h-3.5" /> {isChat ? "Excluir conversa" : "Arquivar"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
