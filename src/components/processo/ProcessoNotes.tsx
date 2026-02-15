import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProcessoNotesProps {
  processoId: string;
}

export function ProcessoNotes({ processoId }: ProcessoNotesProps) {
  const { user } = useAuth();
  const { teamMembers } = usePermissions();
  const [content, setContent] = useState("");
  const [updatedBy, setUpdatedBy] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const getMemberName = (id: string | null) =>
    teamMembers.find((m) => m.id === id)?.full_name || "—";

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("processo_notas")
        .select("*")
        .eq("processo_id", processoId)
        .maybeSingle();
      if (data) {
        setContent(data.conteudo);
        setUpdatedBy(data.updated_by);
        setUpdatedAt(data.updated_at);
      }
    };
    load();
  }, [processoId]);

  const saveNotes = useCallback(async (text: string) => {
    if (!user) return;
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("processo_notas")
        .select("id")
        .eq("processo_id", processoId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("processo_notas")
          .update({ conteudo: text, updated_by: user.id, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase.from("processo_notas").insert({
          processo_id: processoId,
          conteudo: text,
          updated_by: user.id,
        });
      }
      setUpdatedBy(user.id);
      setUpdatedAt(new Date().toISOString());
    } catch {
      // silent fail for auto-save
    } finally {
      setSaving(false);
    }
  }, [processoId, user]);

  const handleChange = (text: string) => {
    setContent(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => saveNotes(text), 3000);
  };

  // Save on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-primary" />
          Notas e Observações
        </h3>
        <span className="text-[10px] text-muted-foreground">
          {saving ? "Salvando..." : "Auto-salvamento ativado ✓"}
        </span>
      </div>

      <Textarea
        placeholder="Escreva suas anotações aqui..."
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        className="min-h-[120px] text-sm"
      />

      {updatedAt && (
        <p className="text-[10px] text-muted-foreground">
          Última edição: {formatDistanceToNow(new Date(updatedAt), { addSuffix: true, locale: ptBR })}
          {updatedBy && ` por ${getMemberName(updatedBy)}`}
        </p>
      )}
    </Card>
  );
}
