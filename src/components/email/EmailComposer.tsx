import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Send, X, Loader2, Maximize2, Minimize2, MoreVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RecipientInput } from "./RecipientInput";
import { AttachmentManager } from "./AttachmentManager";
import { RichTextEditor } from "./RichTextEditor";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EmailComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
}

export function EmailComposer({ open, onOpenChange, initialTo = "", initialSubject = "", initialBody = "" }: EmailComposerProps) {
  const { toast } = useToast();

  // State
  const [to, setTo] = useState<string[]>(initialTo ? [initialTo] : []);
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);
  const [showCc, setShowCc] = useState(false);

  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [attachments, setAttachments] = useState<File[]>([]);

  const [isExpanded, setIsExpanded] = useState(false);
  const [sending, setSending] = useState(false);

  // Sync props when opening
  useEffect(() => {
    if (open) {
      if (initialTo && to.length === 0) setTo([initialTo]);
      if (initialSubject && !subject) setSubject(initialSubject);
      if (initialBody && !body) setBody(initialBody);
    }
  }, [open, initialTo, initialSubject, initialBody]);

  const handleSend = async () => {
    // 1. Validations
    if (to.length === 0) {
      toast({ title: "Destinatário ausente", description: "Adicione pelo menos um email no campo Para.", variant: "destructive" });
      return;
    }
    if (!subject.trim()) {
      toast({ title: "Assunto ausente", description: "O email precisa de um assunto.", variant: "destructive" });
      return;
    }
    const cleanBody = body.replace(/<(.|\n)*?>/g, '').trim();
    if (!cleanBody && attachments.length === 0) {
      toast({ title: "Email vazio", description: "Escreva uma mensagem ou adicione um anexo.", variant: "destructive" });
      return;
    }

    // 2. Simulation
    setSending(true);
    setTimeout(() => {
      setSending(false);
      toast({
        title: "Email enviado com sucesso!",
        description: `Enviado para ${to.join(", ")}`,
        variant: "success"
      });
      onOpenChange(false);
      resetForm();
    }, 1500);
  };

  const resetForm = () => {
    setTo([]);
    setCc([]);
    setBcc([]);
    setShowCc(false);
    setSubject("");
    setBody("");
    setAttachments([]);
    setIsExpanded(false);
  };

  const handleClose = () => {
    if (to.length > 0 || subject || body || attachments.length > 0) {
      if (window.confirm("Descartar rascunho? As alterações serão perdidas.")) {
        onOpenChange(false);
        resetForm();
      }
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={cn(
          "flex flex-col p-0 gap-0 transition-all duration-300",
          isExpanded ? "w-[95vw] h-[95vh] max-w-none" : "max-w-3xl h-[85vh]"
        )}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Header */}
        <DialogHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0">
          <DialogTitle>Nova Mensagem</DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 space-y-4 overflow-y-auto">
            {/* Recipients */}
            <div className="space-y-2">
              <div className="relative">
                <RecipientInput
                  label="Para"
                  recipients={to}
                  onChange={setTo}
                  placeholder="Adicionar destinatários..."
                />
                {!showCc && (
                  <Button
                    variant="link"
                    className="absolute right-0 top-0 h-9 text-xs text-muted-foreground no-underline hover:text-primary"
                    onClick={() => setShowCc(true)}
                  >
                    Cc / Cco
                  </Button>
                )}
              </div>

              {showCc && (
                <div className="animate-accordion-down space-y-2">
                  <RecipientInput
                    label="Cc"
                    recipients={cc}
                    onChange={setCc}
                    placeholder="Com cópia..."
                  />
                  <RecipientInput
                    label="Cco"
                    recipients={bcc}
                    onChange={setBcc}
                    placeholder="Cópia oculta..."
                  />
                </div>
              )}
            </div>

            <Separator />

            {/* Subject */}
            <div className="flex items-center gap-4">
              <Label htmlFor="subject" className="w-12 text-right text-muted-foreground">Assunto</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Assunto do email"
                className="flex-1 border-0 shadow-none px-0 text-base font-medium focus-visible:ring-0 placeholder:font-normal"
              />
            </div>

            <Separator />

            {/* Editor */}
            <div className="min-h-[250px] flex-1">
              <RichTextEditor
                value={body}
                onChange={setBody}
                placeholder="Escreva sua mensagem aqui..."
              />
            </div>

            {/* Attachments */}
            <div className="mt-4">
              <AttachmentManager
                attachments={attachments}
                onChange={setAttachments}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t bg-muted/10 flex justify-between items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem>Salvar como rascunho</DropdownMenuItem>
                <DropdownMenuItem>Solicitar confirmação de leitura</DropdownMenuItem>
                <DropdownMenuItem>Definir prioridade</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleClose} disabled={sending}>
              Descartar
            </Button>
            <Button onClick={handleSend} className="gap-2 min-w-[120px]" disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Enviar
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
