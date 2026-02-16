import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { type Conversation } from "@/hooks/useChat";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Scale, Users, Search, Pin, Archive, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  // Local storage for pin/archive
  const [pinned, setPinned] = useState<string[]>(() => {
      try {
        const saved = localStorage.getItem("pinnedConversations");
        return saved ? JSON.parse(saved) : [];
      } catch { return []; }
  });

  const [archived, setArchived] = useState<string[]>(() => {
      try {
        const saved = localStorage.getItem("archivedConversations");
        return saved ? JSON.parse(saved) : [];
      } catch { return []; }
  });

  const togglePin = (id: string) => {
      setPinned(prev => {
          const next = prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id];
          localStorage.setItem("pinnedConversations", JSON.stringify(next));
          return next;
      });
  };

  const toggleArchive = (id: string) => {
      setArchived(prev => {
          const next = prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id];
          localStorage.setItem("archivedConversations", JSON.stringify(next));
          return next;
      });
  };

  const getConversationName = (conv: Conversation) => {
    if (conv.title) return conv.title;
    if (conv.type === "direct") {
      const other = conv.participants.find((p) => p.user_id !== user?.id);
      return other?.full_name || "Conversa";
    }
    return "Grupo";
  };

  const getIcon = (type: string) => {
    if (type === "process") return <Scale className="w-4 h-4 text-primary" />;
    if (type === "group") return <Users className="w-4 h-4 text-accent" />;
    return <MessageSquare className="w-4 h-4 text-muted-foreground" />;
  };

  const filteredConversations = useMemo(() => {
    return conversations
      .filter(c => !archived.includes(c.id))
      .filter(c => {
        const name = getConversationName(c).toLowerCase();
        return name.includes(search.toLowerCase());
      })
      .sort((a, b) => {
        const aPinned = pinned.includes(a.id);
        const bPinned = pinned.includes(b.id);
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        // Keep original sort (assuming input is sorted by date)
        return 0;
      });
  }, [conversations, search, pinned, archived, user]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border/50">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar conversas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8 text-xs bg-muted/30 border-none shadow-none focus-visible:ring-1"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-xs gap-2">
            <MessageSquare className="w-8 h-8 opacity-30" />
            <p>Nenhuma conversa encontrada</p>
          </div>
        ) : (
          <div className="space-y-0.5 p-1">
            {filteredConversations.map((conv) => {
              const isPinned = pinned.includes(conv.id);
              return (
                <div
                  key={conv.id}
                  className={cn(
                    "group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors text-sm cursor-pointer",
                    selectedId === conv.id
                      ? "bg-primary/10 text-foreground"
                      : "hover:bg-muted text-foreground/80",
                    isPinned && "bg-muted/30 border-l-2 border-primary pl-[10px]"
                  )}
                  onClick={() => onSelect(conv.id)}
                >
                  <div className="shrink-0">{getIcon(conv.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 justify-between">
                      <span className="font-medium text-xs truncate flex-1">{getConversationName(conv)}</span>
                      <div className="flex items-center gap-1">
                         {isPinned && <Pin className="w-3 h-3 text-muted-foreground rotate-45" />}
                         {conv.unread_count > 0 && (
                            <Badge className="bg-primary text-primary-foreground text-[9px] px-1.5 py-0 h-4 min-w-[16px] flex items-center justify-center">
                              {conv.unread_count}
                            </Badge>
                          )}
                      </div>
                    </div>
                    {conv.last_message && (
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5 pr-6">
                        {conv.last_message.content}
                      </p>
                    )}
                  </div>

                  {/* Hover Actions */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-background/80" onClick={(e) => e.stopPropagation()}>
                                <MoreVertical className="w-3 h-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); togglePin(conv.id); }}>
                                <Pin className="w-3 h-3 mr-2" /> {isPinned ? "Desafixar" : "Fixar"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toggleArchive(conv.id); }}>
                                <Archive className="w-3 h-3 mr-2" /> Arquivar
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {!isPinned && conv.last_message && (
                    <span className="absolute right-3 top-3 text-[9px] text-muted-foreground shrink-0 group-hover:opacity-0 transition-opacity">
                      {formatDistanceToNow(new Date(conv.last_message.created_at), { addSuffix: false, locale: ptBR })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
