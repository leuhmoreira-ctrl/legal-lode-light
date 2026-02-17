import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { MessageSquare, Bell, Mail, Inbox, Search, Plus, ArrowLeft } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useComunicacoesUnificadas, type UnifiedItem } from "@/hooks/useComunicacoesUnificadas";
import { ChatMessageArea } from "@/components/chat/ChatMessageArea";
import { EmailComposer } from "@/components/email/EmailComposer";
import { NewConversationDialog } from "@/components/chat/NewConversationDialog";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEmail } from "@/hooks/useEmail";
import { EmailMessage } from "@/types/email";
import DOMPurify from 'dompurify';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useChat } from "@/hooks/useChat";
import { PageHeader } from "@/components/layout/PageHeader";

function UnifiedListItem({
  item,
  selected,
  onClick,
}: {
  item: UnifiedItem;
  selected: boolean;
  onClick: () => void;
}) {
  const icon =
    item.type === "notification" ? (
      <Bell className="w-4 h-4 text-amber-500 shrink-0" />
    ) : item.type === "email" ? (
      <Mail className="w-4 h-4 text-blue-500 shrink-0" />
    ) : (
      <MessageSquare className="w-4 h-4 text-primary shrink-0" />
    );

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 border-b border-border/40 transition-colors group",
        selected ? "bg-accent" : "hover:bg-muted/50",
        !item.is_read && "bg-primary/5"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={cn("text-sm truncate font-medium", !item.is_read && "font-bold text-foreground")}>
              {item.title}
            </span>
            {!item.is_read && (
              <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
            )}
          </div>
          {item.sender_name && (
            <p className="text-xs text-muted-foreground truncate font-medium">{item.sender_name}</p>
          )}
          <p className="text-xs text-muted-foreground truncate mt-0.5 opacity-90">{item.body}</p>
          <span className="text-[10px] text-muted-foreground/60 mt-1 block">
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ptBR })}
          </span>
        </div>
      </div>
    </button>
  );
}

function EmailThreadDetail({ threadId }: { threadId: string }) {
    const { loadThreadMessages, markThreadAsRead } = useEmail();
    const [messages, setMessages] = useState<EmailMessage[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        loadThreadMessages(threadId).then(msgs => {
            setMessages(msgs || []);
            setLoading(false);
            markThreadAsRead(threadId);
        });
    }, [threadId, loadThreadMessages, markThreadAsRead]);

    if (loading) return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Carregando email...</div>;

    if (messages.length === 0) return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Nenhuma mensagem encontrada.</div>;

    const subject = messages[0]?.subject || "Sem assunto";

    return (
        <div className="flex flex-col h-full bg-muted/5">
             <div className="px-6 py-4 border-b bg-background shadow-sm">
                 <h2 className="text-lg font-semibold truncate" title={subject}>{subject}</h2>
             </div>
             <ScrollArea className="flex-1 p-6">
                <div className="space-y-6 max-w-4xl mx-auto">
                    {messages.map((msg) => (
                        <Card key={msg.id} className="p-5 border border-border/60 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4 border-b pb-3">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-sm text-foreground">{msg.from_name || "Desconhecido"}</span>
                                        <span className="text-xs text-muted-foreground">&lt;{msg.from_email}&gt;</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Para: {msg.to_recipients?.join(", ")}</p>
                                </div>
                                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                    {format(new Date(msg.created_at), "dd/MM/yyyy HH:mm")}
                                </span>
                            </div>
                            <div
                                className="prose prose-sm max-w-none dark:prose-invert text-foreground/90 leading-relaxed break-words"
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.body_html || msg.body_text || "") }}
                            />
                        </Card>
                    ))}
                </div>
             </ScrollArea>
        </div>
    );
}

function ItemDetailView({ item }: { item: UnifiedItem }) {
  if (item.type === "message" && item.conversation_id) {
    return <div className="h-full bg-background"><ChatMessageArea conversationId={item.conversation_id} /></div>;
  }

  if (item.type === "email" && item.email_thread_id) {
      return <EmailThreadDetail threadId={item.email_thread_id} />;
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-500/10 rounded-full">
            <Bell className="w-6 h-6 text-amber-500" />
        </div>
        <div>
            <h2 className="text-xl font-semibold">{item.title}</h2>
            <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ptBR })}
            </p>
        </div>
      </div>

      <Card className="p-6 border-l-4 border-l-amber-500 shadow-sm">
        <p className="text-base leading-relaxed whitespace-pre-wrap text-foreground/90">{item.body}</p>
        {item.link && (
            <div className="mt-6 pt-4 border-t">
                <a href={item.link} className="inline-flex items-center text-sm font-medium text-primary hover:underline gap-1">
                Ver detalhes →
                </a>
            </div>
        )}
      </Card>
    </div>
  );
}

export default function Comunicacoes() {
  const { items, loading, counts, markAsRead } = useComunicacoesUnificadas();
  const { createDirectConversation } = useChat();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [activeTab, setActiveTab] = useState("todas");
  const [search, setSearch] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);

  const filtered = items.filter((item) => {
    // Filter by tab
    if (activeTab === "notificacoes" && item.type !== "notification") return false;
    if (activeTab === "mensagens" && item.type !== "message") return false;
    if (activeTab === "emails" && item.type !== "email") return false;

    // Filter by search
    if (search) {
        const lower = search.toLowerCase();
        return (
            item.title.toLowerCase().includes(lower) ||
            item.body.toLowerCase().includes(lower) ||
            item.sender_name?.toLowerCase().includes(lower)
        );
    }
    return true;
  });

  const selectedItem = items.find((i) => i.id === selectedId) || null;

  const handleSelect = (item: UnifiedItem) => {
    setSelectedId(item.id);
    setMobileShowDetail(true);
    if (!item.is_read) {
      markAsRead(item);
    }
  };

  const TabBadge = ({ count }: { count: number }) =>
    count > 0 ? (
      <span className="ml-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
        {count}
      </span>
    ) : null;

  const handleCreateChat = async (userId: string) => {
      const convId = await createDirectConversation(userId);
      if (convId) {
          console.log("Chat created", convId);
      }
      return convId;
  }

  return (
    <AppLayout>
      <div className="page-shell min-h-0">
        <PageHeader
          eyebrow="Inbox unificada"
          title={counts.total > 0 ? `Comunicações (${counts.total})` : "Comunicações"}
          subtitle="Notificações, mensagens e e-mails em uma única fila."
          actions={
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar em tudo..."
                  className="pl-9 h-10 touch-target bg-background shadow-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="gap-2 shadow-sm whitespace-nowrap">
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Nova Comunicação</span>
                    <span className="sm:hidden">Novo</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEmailOpen(true)}>
                    <Mail className="w-4 h-4 mr-2" /> Novo Email
                  </DropdownMenuItem>
                  <div onClick={(e) => e.stopPropagation()}>
                    <NewConversationDialog
                      onCreateDirect={handleCreateChat}
                      trigger={
                        <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
                          <MessageSquare className="w-4 h-4 mr-2" /> Nova Mensagem
                        </div>
                      }
                    />
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full justify-start bg-muted/50 p-1 mb-4 h-auto flex-wrap gap-1">
            <TabsTrigger value="todas" className="flex-1 sm:flex-none">
              <Inbox className="w-4 h-4 mr-1.5" />
              Todas
              <TabBadge count={counts.total} />
            </TabsTrigger>
            <TabsTrigger value="notificacoes" className="flex-1 sm:flex-none">
              <Bell className="w-4 h-4 mr-1.5" />
              Notificações
              <TabBadge count={counts.notifications} />
            </TabsTrigger>
            <TabsTrigger value="mensagens" className="flex-1 sm:flex-none">
              <MessageSquare className="w-4 h-4 mr-1.5" />
              Mensagens
              <TabBadge count={counts.messages} />
            </TabsTrigger>
            <TabsTrigger value="emails" className="flex-1 sm:flex-none">
              <Mail className="w-4 h-4 mr-1.5" />
              E-mails
              <TabBadge count={counts.emails} />
            </TabsTrigger>
          </TabsList>

          <Card className="flex-1 flex overflow-hidden border-border/60 shadow-sm min-h-[68dvh] lg:min-h-[72dvh] bg-background/50 backdrop-blur-sm">
            {/* Left: List */}
            <div
              className={cn(
                "w-full md:w-[380px] border-r border-border flex flex-col bg-background/50 min-h-0 transition-all duration-300",
                mobileShowDetail ? "hidden md:flex" : "flex"
              )}
            >
              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <p>Carregando...</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm p-8 text-center gap-3">
                  <div className="p-3 bg-muted rounded-full">
                     <Inbox className="w-6 h-6 opacity-50" />
                  </div>
                  <p>Nenhum item encontrado.</p>
                </div>
              ) : (
                <ScrollArea className="flex-1">
                  <div className="flex flex-col">
                      {filtered.map((item) => (
                        <UnifiedListItem
                          key={item.id}
                          item={item}
                          selected={selectedId === item.id}
                          onClick={() => handleSelect(item)}
                        />
                      ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Right: Detail */}
            <div
              className={cn(
                "flex-1 flex flex-col bg-background min-w-0 min-h-0 transition-all duration-300 overflow-hidden",
                !mobileShowDetail ? "hidden md:flex" : "flex"
              )}
            >
              {selectedItem ? (
                <>
                  <div className="md:hidden px-4 py-3 border-b border-border flex items-center gap-2 bg-background/95 backdrop-blur">
                    <Button variant="ghost" size="sm" onClick={() => setMobileShowDetail(false)} className="-ml-2 gap-1 text-muted-foreground">
                      <ArrowLeft className="w-4 h-4" /> Voltar
                    </Button>
                  </div>
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <ItemDetailView item={selectedItem} />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
                  <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center mb-6">
                    <MessageSquare className="w-10 h-10 opacity-20" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground/80 text-center">Nenhum item selecionado</h3>
                  <p className="text-sm text-center max-w-sm leading-relaxed text-muted-foreground break-words">
                    Selecione uma notificação, mensagem ou e-mail da lista para visualizar os detalhes.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </Tabs>

        <EmailComposer open={emailOpen} onOpenChange={setEmailOpen} />
      </div>
    </AppLayout>
  );
}

function Loader2({ className }: { className?: string }) {
    return <svg className={cn("animate-spin", className)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
}
