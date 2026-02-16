import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Save, RotateCcw, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { cloneDefaultFolderStructure, parseFolderStructure, type FolderStructure } from "@/lib/processFileStructure";

function cloneStructure(base: FolderStructure): FolderStructure {
  return {
    raiz: base.raiz,
    subpastas: base.subpastas.map((cat) => ({
      nome: cat.nome,
      custom: cat.custom,
      subpastas: cat.subpastas.map((sub) => (typeof sub === "string" ? sub : { ...sub })),
    })),
  };
}

export function FileStructureSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newMainFolder, setNewMainFolder] = useState("");
  const [subfolderInputs, setSubfolderInputs] = useState<Record<number, string>>({});
  const [structure, setStructure] = useState<FolderStructure>(cloneDefaultFolderStructure("Processo"));

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("file_structure_templates")
        .select("estrutura_subpastas")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !data) {
        setStructure(cloneDefaultFolderStructure("Processo"));
      } else {
        const row = data as unknown as { estrutura_subpastas?: unknown };
        setStructure(parseFolderStructure(row.estrutura_subpastas, "Processo"));
      }
      setLoading(false);
    };
    load();
  }, [user?.id]);

  const topCount = useMemo(() => structure.subpastas.length, [structure.subpastas.length]);

  const saveTemplate = async () => {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await supabase.from("file_structure_templates").upsert(
      {
        user_id: user.id,
        estrutura_subpastas: structure,
      },
      { onConflict: "user_id" }
    );
    setSaving(false);

    if (error) {
      toast({ title: "Erro ao salvar estrutura", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Estrutura salva", description: "Novos processos usarão essa organização." });
  };

  const restoreDefault = () => {
    setStructure(cloneDefaultFolderStructure("Processo"));
    setSubfolderInputs({});
  };

  const addMainFolder = () => {
    const name = newMainFolder.trim();
    if (!name) return;
    if (structure.subpastas.some((c) => c.nome.toLowerCase() === name.toLowerCase())) {
      toast({ title: "Pasta já existe", variant: "destructive" });
      return;
    }
    setStructure((prev) => ({
      ...prev,
      subpastas: [...prev.subpastas, { nome: name, subpastas: [], custom: true }],
    }));
    setNewMainFolder("");
  };

  const addSubfolder = (index: number) => {
    const value = (subfolderInputs[index] || "").trim();
    if (!value) return;
    setStructure((prev) => {
      const next = cloneStructure(prev);
      const cat = next.subpastas[index];
      if (!cat) return prev;
      if (cat.subpastas.some((s) => (typeof s === "string" ? s : s.nome).toLowerCase() === value.toLowerCase())) {
        toast({ title: "Subpasta já existe", variant: "destructive" });
        return prev;
      }
      cat.subpastas.push({ nome: value, custom: true });
      return next;
    });
    setSubfolderInputs((prev) => ({ ...prev, [index]: "" }));
  };

  const renameMain = (index: number) => {
    const current = structure.subpastas[index];
    if (!current) return;
    const value = window.prompt("Novo nome da pasta principal", current.nome);
    if (!value || !value.trim()) return;
    setStructure((prev) => {
      const next = cloneStructure(prev);
      next.subpastas[index].nome = value.trim();
      return next;
    });
  };

  const removeMain = (index: number) => {
    if (!window.confirm("Remover pasta principal e suas subpastas?")) return;
    setStructure((prev) => {
      const next = cloneStructure(prev);
      next.subpastas.splice(index, 1);
      return next;
    });
  };

  const moveMain = (index: number, direction: "up" | "down") => {
    setStructure((prev) => {
      const next = cloneStructure(prev);
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.subpastas.length) return prev;
      const [item] = next.subpastas.splice(index, 1);
      next.subpastas.splice(targetIndex, 0, item);
      return next;
    });
  };

  const renameSub = (mainIndex: number, subIndex: number) => {
    const cat = structure.subpastas[mainIndex];
    const item = cat?.subpastas[subIndex];
    if (!cat || !item) return;
    const current = typeof item === "string" ? item : item.nome;
    const value = window.prompt("Novo nome da subpasta", current);
    if (!value || !value.trim()) return;
    setStructure((prev) => {
      const next = cloneStructure(prev);
      next.subpastas[mainIndex].subpastas[subIndex] = {
        nome: value.trim(),
        custom: true,
      };
      return next;
    });
  };

  const removeSub = (mainIndex: number, subIndex: number) => {
    if (!window.confirm("Remover esta subpasta?")) return;
    setStructure((prev) => {
      const next = cloneStructure(prev);
      next.subpastas[mainIndex].subpastas.splice(subIndex, 1);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Estrutura Padrao de Arquivos</CardTitle>
        <p className="text-sm text-muted-foreground">
          Esta estrutura sera aplicada automaticamente em todos os novos processos.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{topCount} pastas principais</Badge>
          <Badge variant="outline">
            {structure.subpastas.reduce((acc, item) => acc + item.subpastas.length, 0)} subpastas
          </Badge>
        </div>

        <div className="space-y-4">
          {structure.subpastas.map((cat, idx) => (
            <div key={`${cat.nome}-${idx}`} className="border border-border/60 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-sm">{cat.nome}</div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveMain(idx, "up")} title="Subir">
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveMain(idx, "down")} title="Descer">
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => renameMain(idx)} title="Renomear">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeMain(idx)} title="Remover">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {cat.subpastas.map((sub, subIdx) => {
                  const name = typeof sub === "string" ? sub : sub.nome;
                  return (
                    <div key={`${name}-${subIdx}`} className="flex items-center justify-between rounded-md bg-muted/40 px-2 py-1.5">
                      <span className="text-sm">{name}</span>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => renameSub(idx, subIdx)} title="Renomear">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeSub(idx, subIdx)}
                          title="Remover"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">Nova subpasta</Label>
                  <Input
                    value={subfolderInputs[idx] || ""}
                    onChange={(e) => setSubfolderInputs((prev) => ({ ...prev, [idx]: e.target.value }))}
                    placeholder="Ex: Laudos, Midias, Financeiro"
                  />
                </div>
                <Button variant="outline" onClick={() => addSubfolder(idx)}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Adicionar
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="border border-dashed border-border rounded-lg p-3">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label>Nova pasta principal</Label>
              <Input
                value={newMainFolder}
                onChange={(e) => setNewMainFolder(e.target.value)}
                placeholder="Ex: 08 - Financeiro"
              />
            </div>
            <Button onClick={addMainFolder}>
              <Plus className="w-4 h-4 mr-1.5" />
              Adicionar
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={restoreDefault}>
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Restaurar Padrao
          </Button>
          <Button onClick={saveTemplate} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
            {saving ? "Salvando..." : "Salvar Estrutura"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
