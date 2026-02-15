import { AppLayout } from "@/components/AppLayout";
import { MessageSquare, Bell, Mail, Inbox } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useComunicacoesUnificadas, type UnifiedItem } from "@/hooks/useComunicacoesUnificadas";
import { NotificationItem } from "@/components/NotificationItem";
import { MessageView } from "@/components/comunicacoes/MessageView";
import { ComposeModal } from "@/components/comunicacoes/ComposeModal";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";

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
            <span className={cn("text-sm truncate", !item.is_read && "font-semibold")}>
              {item.title}
            </span>
            {!item.is_read && (
              <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
            )}
          </div>
          {item.sender_name && (
            <p className="text-xs text-muted-foreground truncate">{item.sender_name}</p>
          )}
          <p className="text-xs text-muted-foreground truncate mt-0.5">{item.body}</p>
          <span className="text-[10px] text-muted-foreground/60 mt-1 block">
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ptBR })}
          </span>
        </div>
      </div>
    </button>
  );
}

function ItemDetailView({ item, onMarkAsRead }: { item: UnifiedItem; onMarkAsRead: (item: UnifiedItem) => void }) {
  // For messages, reuse MessageView
  if (item.type === "message" && item.raw_message) {
    return <MessageView message={item.raw_message} onMarkAsRead={onMarkAsRead ? (id: string) => onMarkAsRead(item) : undefined} />;
  }

  // For notifications and emails, show simple detail
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        {item.type === "notification" ? (
          <Bell className="w-5 h-5 text-amber-500" />
        ) : (
          <Mail className="w-5 h-5 text-blue-500" />
        )}
        <Badge variant="outline" className="text-[10px]">
          {item.type === "notification" ? "Notificação" : "E-mail"}
        </Badge>
      </div>
      <h2 className="text-lg font-semibold">{item.title}</h2>
      {item.sender_name && (
        <p className="text-sm text-muted-foreground">De: {item.sender_name}</p>
      )}
      <p className="text-xs text-muted-foreground">
        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ptBR })}
      </p>
      <div className="pt-4 border-t border-border">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.body}</p>
      </div>
      {item.link && (
        <a href={item.link} className="text-sm text-primary hover:underline font-medium">
          Ver detalhes →
        </a>
      )}
    </div>
  );
}

export default function Comunicacoes() {
  const { items, loading, counts, markAsRead, markAllNotifsAsRead, deleteNotification, sendMessage } =
    useComunicacoesUnificadas();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [activeTab, setActiveTab] = useState("todas");

  const filtered = items.filter((item) => {
    if (activeTab === "todas") return true;
    if (activeTab === "notificacoes") return item.type === "notification";
    if (activeTab === "mensagens") return item.type === "message";
    if (activeTab === "emails") return item.type === "email";
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
      <span className="ml-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
        {count}
      </span>
    ) : null;

  return (
    <AppLayout>
      <div className="h-[calc(100vh-100px)] flex flex-col animate-fade-up">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            Comunicações
            {counts.total > 0 && (
              <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                {counts.total}
              </span>
            )}
          </h1>
          <ComposeModal onSend={async (msg) => { await sendMessage.mutateAsync(msg); }} />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full justify-start bg-muted/50 mb-3">
            <TabsTrigger value="todas">
              <Inbox className="w-4 h-4 mr-1.5" />
              Todas
              <TabBadge count={counts.total} />
            </TabsTrigger>
            <TabsTrigger value="notificacoes">
              <Bell className="w-4 h-4 mr-1.5" />
              Notificações
              <TabBadge count={counts.notifications} />
            </TabsTrigger>
            <TabsTrigger value="mensagens">
              <MessageSquare className="w-4 h-4 mr-1.5" />
              Mensagens
              <TabBadge count={counts.messages} />
            </TabsTrigger>
            <TabsTrigger value="emails">
              <Mail className="w-4 h-4 mr-1.5" />
              E-mails
              <TabBadge count={counts.emails} />
            </TabsTrigger>
          </TabsList>

          {/* All tabs share the same layout — just filtered */}
          <Card className="flex-1 flex overflow-hidden border-border/60 min-h-0">
            {/* Left: list */}
            <div
              className={cn(
                "w-full md:w-[340px] border-r border-border flex flex-col bg-muted/5 min-h-0",
                mobileShowDetail ? "hidden md:flex" : "flex"
              )}
            >
              {loading ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  Carregando...
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-4 text-center">
                  Nenhum item nesta categoria.
                </div>
              ) : (
                <ScrollArea className="flex-1">
                  {filtered.map((item) => (
                    <UnifiedListItem
                      key={item.id}
                      item={item}
                      selected={selectedId === item.id}
                      onClick={() => handleSelect(item)}
                    />
                  ))}
                </ScrollArea>
              )}
            </div>

            {/* Right: detail */}
            <div
              className={cn(
                "flex-1 flex flex-col bg-background min-w-0 min-h-0",
                !mobileShowDetail ? "hidden md:flex" : "flex"
              )}
            >
              {selectedItem ? (
                <>
                  <div className="md:hidden px-3 py-2 border-b border-border">
                    <button
                      onClick={() => setMobileShowDetail(false)}
                      className="text-xs text-primary font-medium flex items-center gap-1"
                    >
                      ← Voltar
                    </button>
                  </div>
                  <ScrollArea className="flex-1">
                    <ItemDetailView item={selectedItem} onMarkAsRead={markAsRead} />
                  </ScrollArea>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <MessageSquare className="w-8 h-8 opacity-30" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">Nenhum item selecionado</h3>
                  <p className="text-sm text-center max-w-xs">
                    Selecione uma notificação, mensagem ou e-mail ao lado.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </Tabs>
      </div>
    </AppLayout>
  );
}
