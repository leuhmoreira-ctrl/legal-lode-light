import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useChat } from "@/hooks/useChat";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatMessageArea } from "@/components/chat/ChatMessageArea";
import { NewConversationDialog } from "@/components/chat/NewConversationDialog";
import { MessageSquare } from "lucide-react";

export default function Mensagens() {
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const { conversations, loading, createDirectConversation } = useChat();

  const handleCreateDirect = async (userId: string) => {
    const convId = await createDirectConversation(userId);
    if (convId) setSelectedConvId(convId);
    return convId;
  };

  const selectedConv = conversations.find((c) => c.id === selectedConvId);

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-48px)] -m-6">
        {/* Sidebar */}
        <div className="w-80 border-r border-border flex flex-col bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Mensagens</h2>
            <NewConversationDialog onCreateDirect={handleCreateDirect} />
          </div>
          <ConversationList
            conversations={conversations}
            selectedId={selectedConvId}
            onSelect={setSelectedConvId}
          />
        </div>

        {/* Main area */}
        <div className="flex-1 flex flex-col">
          {selectedConvId ? (
            <>
              <div className="px-4 py-3 border-b border-border bg-card">
                <h3 className="text-sm font-semibold text-foreground">
                  {selectedConv?.title ||
                    selectedConv?.participants
                      .filter((p) => p.user_id !== selectedConv?.participants[0]?.user_id)
                      .map((p) => p.full_name)
                      .join(", ") ||
                    "Conversa"}
                </h3>
              </div>
              <div className="flex-1 min-h-0">
                <ChatMessageArea conversationId={selectedConvId} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <MessageSquare className="w-12 h-12 opacity-20" />
              <p className="text-sm">Selecione uma conversa ou inicie uma nova</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
