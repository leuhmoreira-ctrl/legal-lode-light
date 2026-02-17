import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useChat } from "@/hooks/useChat";
import { ConversationList } from "./ConversationList";
import { ChatMessageArea } from "./ChatMessageArea";
import { NewConversationDialog } from "./NewConversationDialog";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

export function ChatWidget() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [hideFab, setHideFab] = useState(false);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const { conversations, createDirectConversation } = useChat();
  const navigate = useNavigate();
  const location = useLocation();
  const lastScrollY = useRef(0);

  // Hide widget on process detail pages (already has integrated chat)
  const isProcessDetailPage = /^\/processos\/[^/]+$/.test(location.pathname);
  const isTaskBoardPage = location.pathname === "/kanban" || location.pathname === "/minhas-tarefas";

  useEffect(() => {
    lastScrollY.current = window.scrollY;
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobile || !isTaskBoardPage) {
      setHideFab(false);
      return;
    }

    const onScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;
      const nearTop = currentY < 28;

      if (!open) {
        if (delta > 10 && !nearTop) setHideFab(true);
        if (delta < -10 || nearTop) setHideFab(false);
      }

      lastScrollY.current = currentY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isMobile, isTaskBoardPage, open]);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  const handleCreateDirect = async (userId: string) => {
    const convId = await createDirectConversation(userId);
    if (convId) setSelectedConvId(convId);
    return convId;
  };

  if (isProcessDetailPage) return null;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "fixed z-50 rounded-full flex items-center justify-center transition-all duration-200",
          isMobile ? "bottom-4 right-4 w-11 h-11 shadow-md" : "bottom-6 right-6 w-14 h-14 shadow-lg",
          hideFab && !open && "translate-y-20 opacity-0 pointer-events-none",
          open
            ? "bg-muted text-muted-foreground hover:bg-muted/80"
            : "bg-primary text-primary-foreground hover:bg-primary/90",
          isTaskBoardPage && isMobile && !open && "bg-primary/95"
        )}
      >
        {open ? <X className={cn(isMobile ? "w-4 h-4" : "w-5 h-5")} /> : <MessageCircle className={cn(isMobile ? "w-4 h-4" : "w-5 h-5")} />}
        {!open && totalUnread > 0 && (
          <Badge variant="unstyled" className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0 h-5 min-w-[20px]">
            {totalUnread}
          </Badge>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className={cn(
            "fixed z-50 bg-card border border-border shadow-2xl flex flex-col overflow-hidden animate-fade-up",
            isMobile
              ? "left-3 right-3 bottom-16 h-[70dvh] rounded-2xl"
              : "bottom-24 right-6 w-[380px] h-[500px] rounded-xl"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
            <h3 className="text-sm font-semibold text-foreground">Mensagens</h3>
            <div className="flex items-center gap-1">
              <NewConversationDialog onCreateDirect={handleCreateDirect} />
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => { navigate("/mensagens"); setOpen(false); }}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {selectedConvId ? (
            <div className="flex flex-col flex-1 min-h-0">
              <button
                onClick={() => setSelectedConvId(null)}
                className="text-xs text-primary px-4 py-1.5 text-left hover:underline border-b border-border"
              >
                ← Voltar
              </button>
              <div className="flex-1 min-h-0">
                <ChatMessageArea conversationId={selectedConvId} compact />
              </div>
            </div>
          ) : (
            <ConversationList
              conversations={conversations}
              selectedId={selectedConvId}
              onSelect={setSelectedConvId}
            />
          )}
        </div>
      )}
    </>
  );
}
