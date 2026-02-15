import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { MessageSquare, Mail, Phone, Video, Users, Loader2 } from "lucide-react";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Comunicacao {
  id: string;
  data_comunicacao: string;
  meio: string;
  resumo: string | null;
  responsavel_id: string;
}

const meioConfig: Record<string, { label: string; icon: React.ElementType }> = {
  email: { label: "Email", icon: Mail },
  whatsapp: { label: "WhatsApp", icon: MessageSquare },
  telefone: { label: "Telefone", icon: Phone },
  reuniao: { label: "Reunião presencial", icon: Users },
  outro: { label: "Outro", icon: MessageSquare },
};

const meioEmoji: Record<string, string> = {
  email: "📧", whatsapp: "💬", telefone: "📞", reuniao: "🤝", outro: "📝",
};

interface ClienteCommunicationCardProps {
  processoId: string;
}

export function ClienteCommunicationCard({ processoId }: ClienteCommunicationCardProps) {
  const { user } = useAuth();
  const { teamMembers } = usePermissions();
  const { toast } = useToast();
  const [comunicacoes, setComunicacoes] = useState<Comunicacao[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [meio, setMeio] = useState("email");
  const [resumo, setResumo] = useState("");
  const [dataCom, setDataCom] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));

  const getMemberName = (id: string) =>
    teamMembers.find((m) => m.id === id)?.full_name || "—";

  const loadComunicacoes = async () => {
    const { data } = await supabase
      .from("processo_comunicacoes")
      .select("*")
      .eq("processo_id", processoId)
      .order("data_comunicacao", { ascending: false });
    setComunicacoes(data || []);
  };

  useEffect(() => { loadComunicacoes(); }, [processoId]);

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("processo_comunicacoes").insert({
        processo_id: processoId,
        data_comunicacao: new Date(dataCom).toISOString(),
        meio,
        resumo: resumo.trim() || null,
        responsavel_id: user.id,
      });
      if (error) throw error;
      toast({ title: "✅ Atualização registrada!" });
      setDialogOpen(false);
      setResumo("");
      setMeio("email");
      loadComunicacoes();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const ultima = comunicacoes[0];
  const diasSemContato = ultima
    ? differenceInDays(new Date(), new Date(ultima.data_comunicacao))
    : null;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          Comunicação com Cliente
        </h3>
        <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => setDialogOpen(true)}>
          Registrar Atualização
        </Button>
      </div>

      {/* Alert badges */}
      {diasSemContato !== null && diasSemContato > 30 && (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">
          🔴 Cliente sem contato há {diasSemContato} dias
        </Badge>
      )}
      {diasSemContato !== null && diasSemContato > 15 && diasSemContato <= 30 && (
        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-[10px]">
          ⚠️ Cliente sem contato há {diasSemContato} dias
        </Badge>
      )}

      {/* Last communication */}
      {ultima ? (
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p>Última atualização: {format(new Date(ultima.data_comunicacao), "dd/MM/yyyy")} ({formatDistanceToNow(new Date(ultima.data_comunicacao), { addSuffix: true, locale: ptBR })})</p>
          <p>👤 Por: {getMemberName(ultima.responsavel_id)} · {meioEmoji[ultima.meio]} Via: {meioConfig[ultima.meio]?.label || ultima.meio}</p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Nenhuma comunicação registrada</p>
      )}

      {/* History */}
      {comunicacoes.length > 1 && (
        <div className="border-t pt-2 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Histórico</p>
          {comunicacoes.slice(0, 5).map((c) => (
            <div key={c.id} className="text-xs text-muted-foreground flex gap-2">
              <span>{meioEmoji[c.meio]}</span>
              <div>
                <span className="font-medium text-foreground">{format(new Date(c.data_comunicacao), "dd/MM/yyyy")}</span>
                {" - "}{meioConfig[c.meio]?.label || c.meio}
                {c.resumo && <p className="text-muted-foreground mt-0.5">{c.resumo}</p>}
                <p>Por: {getMemberName(c.responsavel_id)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Atualização ao Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Data/hora</Label>
              <Input type="datetime-local" value={dataCom} onChange={(e) => setDataCom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Como foi comunicado</Label>
              <RadioGroup value={meio} onValueChange={setMeio} className="space-y-1">
                {Object.entries(meioConfig).map(([key, cfg]) => (
                  <div key={key} className="flex items-center gap-2">
                    <RadioGroupItem value={key} id={`meio-${key}`} />
                    <Label htmlFor={`meio-${key}`} className="font-normal cursor-pointer text-sm">{cfg.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div className="space-y-1.5">
              <Label>Resumo (opcional)</Label>
              <Textarea placeholder="O que foi informado ao cliente..." value={resumo} onChange={(e) => setResumo(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
