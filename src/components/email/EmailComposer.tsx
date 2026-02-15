import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, Send, X, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EmailComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
}

export function EmailComposer({ open, onOpenChange, initialTo = "", initialSubject = "", initialBody = "" }: EmailComposerProps) {
  const { toast } = useToast();
  const [to, setTo] = useState(initialTo);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [attachments, setAttachments] = useState<File[]>([]);

  const handleSend = () => {
    if (!to || !subject) {
      toast({ title: "Campos obrigatórios", description: "Preencha o destinatário e o assunto.", variant: "destructive" });
      return;
    }

    // Logic to send email would go here (via Supabase Edge Function)
    toast({ title: "Email enviado", description: `Enviado para ${to}`, variant: "success" });
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setTo("");
    setSubject("");
    setBody("");
    setAttachments([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Nova Mensagem</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
          <div className="grid gap-2">
            <Label htmlFor="to">Para</Label>
            <Input id="to" value={to} onChange={(e) => setTo(e.target.value)} placeholder="cliente@email.com" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="subject">Assunto</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Assunto do email" />
          </div>

          <div className="flex-1 min-h-[200px]">
            <Textarea
              className="h-full resize-none border-0 focus-visible:ring-0 p-0 text-base"
              placeholder="Escreva sua mensagem aqui..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {attachments.map((file, i) => (
                <div key={i} className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full text-xs">
                  <FileText className="w-3 h-3" />
                  <span className="max-w-[150px] truncate">{file.name}</span>
                  <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}>
                    <X className="w-3 h-3 hover:text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t bg-muted/10 flex justify-between items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <label htmlFor="attach-file" className="cursor-pointer p-2 hover:bg-muted rounded-full transition-colors">
              <Paperclip className="w-5 h-5 text-muted-foreground" />
              <input id="attach-file" type="file" multiple className="hidden" onChange={handleFileChange} />
            </label>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Descartar</Button>
            <Button onClick={handleSend} className="gap-2">
              <Send className="w-4 h-4" /> Enviar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
