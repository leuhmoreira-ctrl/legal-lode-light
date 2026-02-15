import { useState } from "react";
import { usePermissions } from "@/contexts/PermissionsContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MessageSquare, Mail, Loader2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  onCreateDirect: (userId: string) => Promise<string | null>;
}

export function NewCommunicationDialog({ onCreateDirect }: Props) {
  const { user } = useAuth();
  const { teamMembers } = usePermissions();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  const otherMembers = teamMembers.filter((m) => m.id !== user?.id);

  const handleSelectMember = async (memberId: string) => {
    setCreating(memberId);
    const convId = await onCreateDirect(memberId);
    setCreating(null);
    if (convId) setOpen(false);
  };

  const handleSendEmail = () => {
    if (!emailTo || !emailSubject || !emailBody) return;
    toast({
      title: "Email enviado",
      description: `Email para ${emailTo} enviado com sucesso (simulação).`,
    });
    setEmailTo("");
    setEmailSubject("");
    setEmailBody("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" /> Nova Conversa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Comunicação</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="chat" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chat" className="gap-1.5 text-xs">
              <MessageSquare className="w-3.5 h-3.5" /> Chat Interno
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-1.5 text-xs">
              <Mail className="w-3.5 h-3.5" /> Email
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-3">
            <p className="text-xs text-muted-foreground mb-3">
              Selecione um membro da equipe para iniciar uma conversa:
            </p>
            <ScrollArea className="max-h-[280px]">
              <div className="space-y-1">
                {otherMembers.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">Nenhum membro encontrado</p>
                )}
                {otherMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => handleSelectMember(member.id)}
                    disabled={creating === member.id}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {member.full_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{member.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                    {creating === member.id && <Loader2 className="w-4 h-4 animate-spin" />}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="email" className="mt-3 space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Para *</Label>
              <Input
                placeholder="email@exemplo.com"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Assunto *</Label>
              <Input
                placeholder="Assunto do email"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Mensagem *</Label>
              <Textarea
                placeholder="Escreva sua mensagem..."
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="min-h-[120px] text-sm resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={handleSendEmail}
                disabled={!emailTo || !emailSubject || !emailBody}
              >
                <Send className="w-3.5 h-3.5" /> Enviar Email
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
