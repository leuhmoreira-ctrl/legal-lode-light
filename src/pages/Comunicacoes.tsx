import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { MessageSquare, Mail } from "lucide-react";
import { useComunicacoes } from "@/hooks/useComunicacoes";
import { ConversationListUnified } from "@/components/comunicacoes/ConversationListUnified";
import { UnifiedMessageArea } from "@/components/comunicacoes/UnifiedMessageArea";
import { NewCommunicationDialog } from "@/components/comunicacoes/NewCommunicationDialog";
import { CommunicationSettings } from "@/components/comunicacoes/CommunicationSettings";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function Comunicacoes() {
  const {
    conversations,
    selectedConversation,
    selectedId,
    setSelectedId,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    totalUnread,
    chatUnread,
    emailUnread,
    getEmailMessages,
    sendEmailReply,
    createDirectConversation,
  } = useComunicacoes();

  // Mobile: show list or conversation
  const [mobileShowConv, setMobileShowConv] = useState(false);

  const handleSelectConversation = (id: string) => {
    setSelectedId(id);
    setMobileShowConv(true);
  };

  const handleBack = () => {
    setMobileShowConv(false);
  };

  return (
    <AppLayout>
      <div className="h-[calc(100vh-100px)] flex flex-col animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-primary" />
              Comunicações
            </h1>
            {totalUnread > 0 && (
              <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                {totalUnread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <NewCommunicationDialog onCreateDirect={createDirectConversation} />
            <CommunicationSettings />
          </div>
        </div>

        {/* Main Content */}
        <Card className="flex-1 flex overflow-hidden border-border/60">
          {/* Left sidebar - conversation list */}
          <div className={cn(
            "w-full md:w-[320px] border-r border-border flex flex-col bg-muted/5",
            mobileShowConv ? "hidden md:flex" : "flex"
          )}>
            <ConversationListUnified
              conversations={conversations}
              selectedId={selectedId}
              onSelect={handleSelectConversation}
              filter={filter}
              onFilterChange={setFilter}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              totalUnread={totalUnread}
              chatUnread={chatUnread}
              emailUnread={emailUnread}
            />
          </div>

          {/* Right area - messages */}
          <div className={cn(
            "flex-1 flex flex-col bg-background min-w-0",
            !mobileShowConv ? "hidden md:flex" : "flex"
          )}>
            {selectedConversation ? (
              <>
                {/* Mobile back button */}
                <div className="md:hidden px-3 py-2 border-b border-border">
                  <button
                    onClick={handleBack}
                    className="text-xs text-primary font-medium flex items-center gap-1"
                  >
                    ← Voltar
                  </button>
                </div>
                <div className="flex-1 min-h-0">
                  <UnifiedMessageArea
                    conversation={selectedConversation}
                    emailMessages={
                      selectedConversation.type === "email"
                        ? getEmailMessages(selectedConversation.id)
                        : []
                    }
                    onSendEmailReply={(content) =>
                      sendEmailReply(selectedConversation.id, content)
                    }
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <MessageSquare className="w-8 h-8 opacity-30" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Nenhuma conversa selecionada</h3>
                <p className="text-sm text-center max-w-xs">
                  Selecione uma conversa ao lado ou inicie uma nova comunicação.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
