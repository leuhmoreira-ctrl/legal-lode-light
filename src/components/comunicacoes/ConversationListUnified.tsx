import { MessageSquare, Mail, Paperclip, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { UnifiedConversation, ConversationFilter } from "@/types/comunicacoes";

interface Props {
  conversations: UnifiedConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  filter: ConversationFilter;
  onFilterChange: (filter: ConversationFilter) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  totalUnread: number;
  chatUnread: number;
  emailUnread: number;
}

export function ConversationListUnified({
  conversations,
  selectedId,
  onSelect,
  filter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  totalUnread,
  chatUnread,
  emailUnread,
}: Props) {
  const tabs: { key: ConversationFilter; label: string; count: number }[] = [
    { key: "all", label: "Todas", count: totalUnread },
    { key: "chat", label: "Internas", count: chatUnread },
    { key: "email", label: "Email", count: emailUnread },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="p-3 border-b border-border space-y-3">
        <div className="flex gap-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onFilterChange(tab.key)}
              className={cn(
                "flex-1 text-xs font-medium py-1.5 px-3 rounded-lg transition-colors",
                filter === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={cn(
                  "ml-1.5 text-[10px] px-1.5 py-0 rounded-full",
                  filter === tab.key ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted-foreground/20"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            className="h-9 pl-8 text-xs"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col">
          {conversations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <MessageSquare className="w-8 h-8 opacity-20" />
              <p className="text-xs">Nenhuma conversa encontrada</p>
            </div>
          )}
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                "w-full text-left p-3 border-b border-border/50 transition-colors border-l-[3px]",
                selectedId === conv.id
                  ? "bg-primary/5"
                  : "hover:bg-muted/50",
                conv.type === "chat"
                  ? selectedId === conv.id ? "border-l-primary" : "border-l-primary/30"
                  : selectedId === conv.id ? "border-l-success" : "border-l-success/30"
              )}
            >
              <div className="flex justify-between items-start mb-1 gap-2">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {conv.type === "chat" ? (
                    <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0" />
                  ) : (
                    <Mail className="w-3.5 h-3.5 text-success shrink-0" />
                  )}
                  <span
                    className={cn(
                      "text-sm truncate",
                      conv.unread_count > 0 ? "font-bold text-foreground" : "font-medium text-foreground/80"
                    )}
                  >
                    {conv.title}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                  {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false, locale: ptBR })}
                </span>
              </div>

              {conv.subtitle && (
                <p className="text-[11px] text-muted-foreground truncate mb-0.5 ml-5">
                  {conv.subtitle}
                </p>
              )}

              <p className="text-xs text-muted-foreground line-clamp-1 ml-5">
                {conv.snippet}
              </p>

              <div className="flex items-center gap-2 mt-1.5 ml-5">
                {conv.unread_count > 0 && (
                  <Badge variant="default" className="h-4 px-1.5 text-[10px]">
                    {conv.unread_count}
                  </Badge>
                )}
                {conv.has_attachments && (
                  <Paperclip className="w-3 h-3 text-muted-foreground" />
                )}
                {conv.type === "email" && conv.thread_count && conv.thread_count > 1 && (
                  <span className="text-[10px] text-muted-foreground">
                    {conv.thread_count} msgs
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
