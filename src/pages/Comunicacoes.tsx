import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import { useMessages } from "@/hooks/useMessages";
import { MessagesList } from "@/components/comunicacoes/MessagesList";
import { MessageView } from "@/components/comunicacoes/MessageView";
import { ComposeModal } from "@/components/comunicacoes/ComposeModal";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function Comunicacoes() {
  const { messages, isLoading, sendMessage, markAsRead, unreadCount } = useMessages();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileShowMsg, setMobileShowMsg] = useState(false);

  const selectedMessage = messages.find((m) => m.id === selectedId) || null;

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setMobileShowMsg(true);
  };

  return (
    <AppLayout>
      <div className="h-[calc(100vh-100px)] flex flex-col animate-fade-up">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-primary" />
              Comunicações
            </h1>
            {unreadCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <ComposeModal onSend={async (msg) => { await sendMessage.mutateAsync(msg); }} />
        </div>

        <Card className="flex-1 flex overflow-hidden border-border/60 hover:shadow-subtle hover:translate-y-0">
          {/* Left: messages list */}
          <div className={cn(
            "w-full md:w-[320px] border-r border-border flex flex-col bg-muted/5",
            mobileShowMsg ? "hidden md:flex" : "flex"
          )}>
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Carregando...</div>
            ) : (
              <MessagesList messages={messages} selectedId={selectedId} onSelect={handleSelect} />
            )}
          </div>

          {/* Right: message view */}
          <div className={cn(
            "flex-1 flex flex-col bg-background min-w-0",
            !mobileShowMsg ? "hidden md:flex" : "flex"
          )}>
            {selectedMessage ? (
              <>
                <div className="md:hidden px-3 py-2 border-b border-border">
                  <button onClick={() => setMobileShowMsg(false)} className="text-xs text-primary font-medium flex items-center gap-1">
                    ← Voltar
                  </button>
                </div>
                <MessageView message={selectedMessage} onMarkAsRead={markAsRead} />
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <MessageSquare className="w-8 h-8 opacity-30" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Nenhuma mensagem selecionada</h3>
                <p className="text-sm text-center max-w-xs">
                  Selecione uma mensagem ao lado ou envie uma nova.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
