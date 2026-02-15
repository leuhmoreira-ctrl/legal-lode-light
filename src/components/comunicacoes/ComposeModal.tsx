import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface Props {
  onSend: (msg: { subject: string; body: string; to_user_ids: string[] }) => Promise<void>;
}

interface UserOption {
  id: string;
  full_name: string;
}

export function ComposeModal({ onSend }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [toUserId, setToUserId] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("profiles")
      .select("id, full_name")
      .then(({ data }) => {
        setUsers((data || []).filter((u) => u.id !== user?.id));
      });
  }, [open, user?.id]);

  const handleSend = async () => {
    if (!toUserId || !subject.trim() || !body.trim()) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      await onSend({ subject: subject.trim(), body: body.trim(), to_user_ids: [toUserId] });
      toast({ title: "Mensagem enviada!" });
      setSubject("");
      setBody("");
      setToUserId("");
      setOpen(false);
    } catch {
      toast({ title: "Erro ao enviar", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          Nova Mensagem
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Mensagem</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Para</Label>
            <Select value={toUserId} onValueChange={setToUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o destinatário" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Assunto</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Assunto da mensagem" />
          </div>
          <div>
            <Label>Mensagem</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escreva sua mensagem..." rows={5} />
          </div>
          <Button onClick={handleSend} loading={sending} className="w-full">
            Enviar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
