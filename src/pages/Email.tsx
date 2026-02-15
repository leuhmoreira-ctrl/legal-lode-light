import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Mail,
  Paperclip,
  Star,
  Filter,
  MoreVertical,
  Reply,
  Forward,
  Trash2,
  Archive,
  RefreshCw
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { EmailThread, EmailMessage } from "@/types/email";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

// Mock data for dev
const MOCK_THREADS: EmailThread[] = [
  {
    id: "1",
    user_id: "user1",
    subject: "Andamento do Processo 12345",
    snippet: "Olá Dr., gostaria de saber se houve alguma movimentação recente...",
    unread_count: 1,
    has_attachments: true,
    last_message_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "2",
    user_id: "user1",
    subject: "Documentos Solicitados - Silva vs. Souza",
    snippet: "Segue em anexo a cópia do RG e comprovante de residência conforme...",
    unread_count: 0,
    has_attachments: true,
    last_message_at: new Date(Date.now() - 86400000).toISOString(), // yesterday
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "3",
    user_id: "user1",
    subject: "Agendamento de Reunião",
    snippet: "Podemos marcar para a próxima terça-feira às 14h?",
    unread_count: 0,
    has_attachments: false,
    last_message_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const MOCK_MESSAGES: EmailMessage[] = [
  {
    id: "m1",
    conversa_id: "1",
    from_name: "João Cliente",
    from_email: "joao@cliente.com",
    to_recipients: ["advogado@juriscontrol.com"],
    subject: "Andamento do Processo 12345",
    body_text: "Olá Dr.,\n\nGostaria de saber se houve alguma movimentação recente no meu processo.\n\nAtt,\nJoão",
    folder: "inbox",
    is_read: true,
    is_sent: false,
    has_attachments: false,
    sent_at: new Date(Date.now() - 3600000).toISOString(),
    created_at: new Date().toISOString()
  },
  {
    id: "m2",
    conversa_id: "1",
    from_name: "Advogado",
    from_email: "advogado@juriscontrol.com",
    to_recipients: ["joao@cliente.com"],
    subject: "Re: Andamento do Processo 12345",
    body_text: "Olá João,\n\nSim, houve um despacho ontem. Estamos analisando e te retorno ainda hoje.",
    folder: "sent",
    is_read: true,
    is_sent: true,
    has_attachments: false,
    sent_at: new Date(Date.now() - 1800000).toISOString(),
    created_at: new Date().toISOString()
  }
];

export default function Email() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<EmailThread[]>(MOCK_THREADS);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [replyText, setReplyText] = useState("");

  const selectedThread = threads.find(t => t.id === selectedThreadId);

  useEffect(() => {
    if (selectedThreadId) {
      // In real app, fetch messages from Supabase
      setMessages(MOCK_MESSAGES.filter(m => m.conversa_id === selectedThreadId || selectedThreadId === "1")); // Using mock data logic
    } else {
      setMessages([]);
    }
  }, [selectedThreadId]);

  return (
    <AppLayout>
      <div className="h-[calc(100vh-100px)] flex flex-col animate-fade-up">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Mail className="w-6 h-6 text-primary" /> Email
          </h1>
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-4 h-4" /> Sincronizar
          </Button>
        </div>

        <Card className="flex-1 flex overflow-hidden border-border/60">
          {/* Thread List (Left Sidebar) */}
          <div className="w-full md:w-[350px] border-r border-border flex flex-col bg-muted/10">
            <div className="p-4 border-b border-border space-y-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar emails..." className="pl-9 h-9" />
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1 text-xs">Não lidos</Button>
                <Button variant="ghost" size="sm" className="flex-1 text-xs">Com anexo</Button>
                <Button variant="ghost" size="sm" className="flex-1 text-xs"><Filter className="w-3 h-3" /></Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="flex flex-col">
                {threads.map(thread => (
                  <div
                    key={thread.id}
                    onClick={() => setSelectedThreadId(thread.id)}
                    className={`p-4 border-b border-border/50 cursor-pointer hover:bg-muted/50 transition-colors ${selectedThreadId === thread.id ? 'bg-primary/5 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-sm font-medium truncate pr-2 ${thread.unread_count > 0 ? 'text-foreground font-bold' : 'text-foreground/80'}`}>
                        {thread.subject}
                      </span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {thread.last_message_at && formatDistanceToNow(new Date(thread.last_message_at), { locale: ptBR, addSuffix: false })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {thread.snippet}
                    </p>
                    <div className="flex items-center gap-2">
                      {thread.unread_count > 0 && (
                        <Badge variant="default" className="h-5 px-1.5 text-[10px]">{thread.unread_count}</Badge>
                      )}
                      {thread.has_attachments && (
                        <Paperclip className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Message View (Main Content) */}
          <div className="flex-1 flex flex-col bg-background min-w-0">
            {selectedThread ? (
              <>
                {/* Header */}
                <div className="p-4 border-b border-border flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-1">{selectedThread.subject}</h2>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-normal">Caixa de Entrada</Badge>
                      {selectedThread.has_attachments && <Badge variant="secondary" className="text-xs font-normal gap-1"><Paperclip className="w-3 h-3" /> Anexos</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" title="Arquivar"><Archive className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" title="Excluir"><Trash2 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" title="Mais"><MoreVertical className="w-4 h-4" /></Button>
                  </div>
                </div>

                {/* Messages Area */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-6">
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex gap-3 ${msg.is_sent ? 'flex-row-reverse' : ''}`}>
                        <Avatar className="w-8 h-8 mt-1">
                          <AvatarFallback className={msg.is_sent ? "bg-primary text-primary-foreground" : "bg-muted"}>
                            {msg.from_name?.charAt(0).toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>

                        <div className={`flex flex-col max-w-[85%] ${msg.is_sent ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-center gap-2 mb-1 px-1">
                            <span className="text-sm font-semibold">{msg.from_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {msg.sent_at && formatDistanceToNow(new Date(msg.sent_at), { addSuffix: true, locale: ptBR })}
                            </span>
                          </div>

                          <div className={`rounded-lg p-4 border shadow-sm ${msg.is_sent ? 'bg-primary/5 border-primary/10' : 'bg-card border-border'}`}>
                            <div className="whitespace-pre-wrap text-sm leading-relaxed">
                              {msg.body_text}
                            </div>
                          </div>

                          <div className="flex gap-2 mt-1 px-1">
                            {!msg.is_sent && (
                              <Button variant="ghost" size="sm" className="h-6 gap-1 text-muted-foreground">
                                <Reply className="w-3 h-3" /> Responder
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Reply Box */}
                <div className="p-4 border-t border-border bg-muted/10">
                  <div className="flex gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary text-primary-foreground">Eu</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <Textarea
                        placeholder="Escreva sua resposta..."
                        className="min-h-[100px] resize-none bg-background"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                      />
                      <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8"><Paperclip className="w-4 h-4" /></Button>
                        </div>
                        <Button className="gap-2" disabled={!replyText.trim()}>
                          <Reply className="w-4 h-4" /> Enviar Resposta
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Mail className="w-8 h-8 opacity-50" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Nenhum email selecionado</h3>
                <p className="text-sm text-center max-w-xs">Selecione uma conversa ao lado para visualizar as mensagens.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
