import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  FileText,
  Eye,
  Download,
  Trash2,
  Loader2,
  Folder,
  ChevronRight,
  ChevronDown,
  Wand2,
  FolderPlus,
  Pencil,
  FolderX,
  MoveRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { DocumentUploader } from "@/components/DocumentUploader";
import {
  cloneDefaultFolderStructure,
  countByFolder,
  folderKey,
  folderValue,
  getSubfolderName,
  isCustomSubfolder,
  listFolderOptions,
  parseFolderStructure,
  parseFolderValue,
  suggestFolderForFileName,
  type FolderStructure,
} from "@/lib/processFileStructure";

interface DocumentMeta {
  id: string;
  storage_path: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  category: string;
  created_at: string;
  uploaded_by: string;
  pasta_categoria: string | null;
  subpasta: string | null;
  caminho_completo: string | null;
  ordem_na_pasta: number;
}

interface DriveFolderRow {
  id: string;
  nome_pasta: string;
  estrutura_subpastas: unknown;
}

const CATEGORY_LABELS: Record<string, string> = {
  petition: "Peticao",
  decision: "Decisao",
  power_of_attorney: "Procuracao",
  client_document: "Doc. Cliente",
  evidence: "Prova",
  other: "Outro",
};

interface ProcessDocumentsProps {
  processId: string;
}

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

export function ProcessDocuments({ processId }: ProcessDocumentsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [docs, setDocs] = useState<DocumentMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [driveFolder, setDriveFolder] = useState<DriveFolderRow | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<{ pastaCategoria: string | null; subpasta: string | null }>({
    pastaCategoria: null,
    subpasta: null,
  });

  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderParent, setNewFolderParent] = useState("__root");
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<DocumentMeta | null>(null);
  const [moveValue, setMoveValue] = useState("");

  useEffect(() => {
    loadAll();
  }, [processId, refreshKey]);

  const loadAll = async () => {
    setLoading(true);
    const [docsRes, folderRes] = await Promise.all([
      supabase.from("document_metadata").select("*").eq("process_id", processId),
      (supabase as any)
        .from("drive_folders")
        .select("id, nome_pasta, estrutura_subpastas")
        .eq("processo_id", processId)
        .maybeSingle(),
    ]);

    if (docsRes.error) {
      console.error("Erro ao carregar documentos:", docsRes.error);
      setDocs([]);
    } else {
      const items = (docsRes.data || []) as unknown as DocumentMeta[];
      items.sort((a, b) => {
        if (a.pasta_categoria !== b.pasta_categoria) return (a.pasta_categoria || "").localeCompare(b.pasta_categoria || "");
        if (a.subpasta !== b.subpasta) return (a.subpasta || "").localeCompare(b.subpasta || "");
        if (a.ordem_na_pasta !== b.ordem_na_pasta) return a.ordem_na_pasta - b.ordem_na_pasta;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setDocs(items);
    }

    if (folderRes.error || !folderRes.data) {
      setDriveFolder(null);
    } else {
      setDriveFolder(folderRes.data as unknown as DriveFolderRow);
    }
    setLoading(false);
  };

  const structure = useMemo<FolderStructure>(() => {
    if (!driveFolder) {
      return cloneDefaultFolderStructure("Processo");
    }
    return parseFolderStructure(driveFolder.estrutura_subpastas, driveFolder.nome_pasta || "Processo");
  }, [driveFolder]);

  const folderOptions = useMemo(() => listFolderOptions(structure), [structure]);
  const counts = useMemo(() => countByFolder(docs), [docs]);
  const uncategorizedDocs = useMemo(() => docs.filter((d) => !d.pasta_categoria), [docs]);

  const filteredDocs = useMemo(() => {
    if (!selected.pastaCategoria) return docs;
    if (!selected.subpasta) return docs.filter((d) => d.pasta_categoria === selected.pastaCategoria);
    return docs.filter((d) => d.pasta_categoria === selected.pastaCategoria && d.subpasta === selected.subpasta);
  }, [docs, selected]);

  const selectedCategory = useMemo(
    () => structure.subpastas.find((cat) => cat.nome === selected.pastaCategoria) || null,
    [structure, selected.pastaCategoria]
  );

  const selectedIsCustom = useMemo(() => {
    if (!selectedCategory || !selected.pastaCategoria) return false;
    if (!selected.subpasta) return !!selectedCategory.custom;
    const sub = selectedCategory.subpastas.find((item) => getSubfolderName(item) === selected.subpasta);
    return !!(sub && isCustomSubfolder(sub));
  }, [selectedCategory, selected]);

  const selectedCount = useMemo(
    () => counts[folderKey(selected.pastaCategoria, selected.subpasta)] || 0,
    [counts, selected]
  );

  const persistStructure = async (nextStructure: FolderStructure) => {
    if (driveFolder?.id) {
      const { error } = await (supabase as any)
        .from("drive_folders")
        .update({ estrutura_subpastas: nextStructure })
        .eq("id", driveFolder.id);
      if (error) throw error;
      setDriveFolder((prev) => (prev ? { ...prev, estrutura_subpastas: nextStructure } : prev));
      return;
    }

    const { data, error } = await (supabase as any)
      .from("drive_folders")
      .insert({
        processo_id: processId,
        nome_pasta: nextStructure.raiz || "Processo",
        estrutura_subpastas: nextStructure,
        sincronizado: false,
      })
      .select("id, nome_pasta, estrutura_subpastas")
      .single();
    if (error) throw error;
    setDriveFolder(data as unknown as DriveFolderRow);
  };

  const handleDownload = async (doc: DocumentMeta) => {
    const { data, error } = await supabase.storage.from("process-documents").createSignedUrl(doc.storage_path, 300);

    if (error || !data?.signedUrl) {
      toast({ title: "Erro ao gerar link", variant: "destructive" });
      return;
    }

    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = doc.original_name;
    a.click();
  };

  const handlePreview = async (doc: DocumentMeta) => {
    const { data, error } = await supabase.storage.from("process-documents").createSignedUrl(doc.storage_path, 300);

    if (error || !data?.signedUrl) {
      toast({ title: "Erro ao gerar preview", variant: "destructive" });
      return;
    }

    setPreviewUrl(data.signedUrl);
    setPreviewName(doc.original_name);
  };

  const handleDelete = async (doc: DocumentMeta) => {
    if (!confirm(`Excluir "${doc.original_name}"?`)) return;

    const { error: storageError } = await supabase.storage.from("process-documents").remove([doc.storage_path]);

    if (storageError) {
      toast({ title: "Erro ao excluir arquivo", description: storageError.message, variant: "destructive" });
      return;
    }

    const { error: metaError } = await supabase.from("document_metadata").delete().eq("id", doc.id);

    if (metaError) {
      toast({ title: "Erro ao excluir metadados", description: metaError.message, variant: "destructive" });
      return;
    }

    toast({ title: "Documento excluido" });
    setRefreshKey((k) => k + 1);
  };

  const handleUploadComplete = () => {
    setUploadOpen(false);
    setRefreshKey((k) => k + 1);
  };

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) {
      toast({ title: "Informe o nome da pasta", variant: "destructive" });
      return;
    }

    const next = cloneStructure(structure);

    if (newFolderParent === "__root") {
      if (next.subpastas.some((cat) => cat.nome.toLowerCase() === name.toLowerCase())) {
        toast({ title: "Ja existe uma pasta com esse nome", variant: "destructive" });
        return;
      }
      next.subpastas.push({ nome: name, subpastas: [], custom: true });
    } else {
      const cat = next.subpastas.find((item) => item.nome === newFolderParent);
      if (!cat) return;
      const exists = cat.subpastas.some((sub) => getSubfolderName(sub).toLowerCase() === name.toLowerCase());
      if (exists) {
        toast({ title: "Ja existe subpasta com esse nome", variant: "destructive" });
        return;
      }
      cat.subpastas.push({ nome: name, custom: true });
    }

    try {
      await persistStructure(next);
      toast({ title: "Pasta criada" });
      setCreateFolderOpen(false);
      setNewFolderName("");
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      toast({ title: "Erro ao criar pasta", description: err.message, variant: "destructive" });
    }
  };

  const handleRenameFolder = async () => {
    if (!selected.pastaCategoria || !selectedIsCustom) return;
    const nextName = renameValue.trim();
    if (!nextName) {
      toast({ title: "Informe o novo nome", variant: "destructive" });
      return;
    }

    const oldCategory = selected.pastaCategoria;
    const oldSub = selected.subpasta;
    const next = cloneStructure(structure);

    if (!oldSub) {
      const idx = next.subpastas.findIndex((cat) => cat.nome === oldCategory && cat.custom);
      if (idx < 0) return;
      next.subpastas[idx].nome = nextName;
    } else {
      const cat = next.subpastas.find((item) => item.nome === oldCategory);
      if (!cat) return;
      const subIdx = cat.subpastas.findIndex((sub) => getSubfolderName(sub) === oldSub && isCustomSubfolder(sub));
      if (subIdx < 0) return;
      cat.subpastas[subIdx] = { nome: nextName, custom: true };
    }

    try {
      await persistStructure(next);

      if (!oldSub) {
        await supabase
          .from("document_metadata")
          .update({ pasta_categoria: nextName })
          .eq("process_id", processId)
          .eq("pasta_categoria", oldCategory);
        setSelected({ pastaCategoria: nextName, subpasta: null });
      } else {
        await supabase
          .from("document_metadata")
          .update({ subpasta: nextName })
          .eq("process_id", processId)
          .eq("pasta_categoria", oldCategory)
          .eq("subpasta", oldSub);
        setSelected({ pastaCategoria: oldCategory, subpasta: nextName });
      }

      toast({ title: "Pasta renomeada" });
      setRenameOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      toast({ title: "Erro ao renomear", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteFolder = async () => {
    if (!selected.pastaCategoria || !selectedIsCustom) return;
    if (selectedCount > 0) {
      toast({ title: "A pasta precisa estar vazia para excluir", variant: "destructive" });
      return;
    }

    const next = cloneStructure(structure);

    if (!selected.subpasta) {
      next.subpastas = next.subpastas.filter((cat) => !(cat.nome === selected.pastaCategoria && cat.custom));
    } else {
      const cat = next.subpastas.find((item) => item.nome === selected.pastaCategoria);
      if (!cat) return;
      cat.subpastas = cat.subpastas.filter(
        (sub) => !(getSubfolderName(sub) === selected.subpasta && isCustomSubfolder(sub))
      );
    }

    try {
      await persistStructure(next);
      setDeleteOpen(false);
      setSelected({ pastaCategoria: null, subpasta: null });
      toast({ title: "Pasta removida" });
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      toast({ title: "Erro ao remover pasta", description: err.message, variant: "destructive" });
    }
  };

  const handleMoveDocument = async () => {
    if (!moveTarget || !moveValue) return;
    const { pastaCategoria, subpasta } = parseFolderValue(moveValue);
    const { error } = await supabase
      .from("document_metadata")
      .update({
        pasta_categoria: pastaCategoria,
        subpasta,
      })
      .eq("id", moveTarget.id);

    if (error) {
      toast({ title: "Erro ao mover documento", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Documento movido" });
    setMoveTarget(null);
    setRefreshKey((k) => k + 1);
  };

  const handleAutoOrganize = async () => {
    if (uncategorizedDocs.length === 0) return;
    try {
      for (const doc of uncategorizedDocs) {
        const suggestion = suggestFolderForFileName(doc.original_name);
        const { error } = await supabase
          .from("document_metadata")
          .update({
            pasta_categoria: suggestion.pastaCategoria,
            subpasta: suggestion.subpasta,
          })
          .eq("id", doc.id);
        if (error) throw error;
      }
      toast({ title: "Documentos organizados automaticamente" });
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      toast({ title: "Erro ao organizar", description: err.message, variant: "destructive" });
    }
  };

  const breadcrumb = [
    structure.raiz || "Processo",
    selected.pastaCategoria,
    selected.subpasta,
  ].filter(Boolean) as string[];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Estrutura de Arquivos</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{docs.length} documento(s) neste processo</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {uncategorizedDocs.length > 0 && (
            <Button variant="outline" className="gap-2" onClick={handleAutoOrganize}>
              <Wand2 className="w-4 h-4" />
              Organizar ({uncategorizedDocs.length})
            </Button>
          )}
          <Button variant="outline" className="gap-2" onClick={() => setCreateFolderOpen(true)}>
            <FolderPlus className="w-4 h-4" />
            Criar Pasta
          </Button>
          <Button onClick={() => setUploadOpen(true)} className="gap-2 h-10 px-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4" />
            Adicionar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-4 border border-border/60 rounded-xl bg-card p-4">
          <button
            type="button"
            className={`w-full flex items-center justify-between p-2 rounded-lg text-left ${
              !selected.pastaCategoria ? "bg-blue-50 text-blue-700" : "hover:bg-muted/50"
            }`}
            onClick={() => setSelected({ pastaCategoria: null, subpasta: null })}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <Folder className="w-4 h-4" />
              Todos os arquivos
            </span>
            <span className="text-xs text-muted-foreground">{docs.length}</span>
          </button>

          <div className="mt-3 space-y-1">
            {structure.subpastas.map((cat) => {
              const catExpanded = expanded[cat.nome] ?? true;
              const catCount = counts[folderKey(cat.nome, null)] || 0;
              const selectedCat = selected.pastaCategoria === cat.nome && !selected.subpasta;

              return (
                <div key={cat.nome} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setSelected({ pastaCategoria: cat.nome, subpasta: null })}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left ${
                      selectedCat ? "bg-blue-50 text-blue-700" : "hover:bg-muted/50"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <span
                        className="text-muted-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpanded((prev) => ({ ...prev, [cat.nome]: !catExpanded }));
                        }}
                      >
                        {cat.subpastas.length > 0 ? (
                          catExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
                        ) : (
                          <span className="inline-block w-3.5 h-3.5" />
                        )}
                      </span>
                      <Folder className="w-4 h-4" />
                      {cat.nome}
                    </span>
                    <span className="text-xs text-muted-foreground">{catCount}</span>
                  </button>

                  {catExpanded && cat.subpastas.length > 0 && (
                    <div className="pl-7 space-y-1">
                      {cat.subpastas.map((sub) => {
                        const subName = getSubfolderName(sub);
                        const subCount = counts[folderKey(cat.nome, subName)] || 0;
                        const selectedSub = selected.pastaCategoria === cat.nome && selected.subpasta === subName;
                        return (
                          <button
                            key={`${cat.nome}-${subName}`}
                            type="button"
                            onClick={() => setSelected({ pastaCategoria: cat.nome, subpasta: subName })}
                            className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-sm ${
                              selectedSub ? "bg-blue-50 text-blue-700" : "hover:bg-muted/50"
                            }`}
                          >
                            <span className="truncate">{subName}</span>
                            <span className="text-xs text-muted-foreground">{subCount}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-border/60 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!selectedIsCustom}
              onClick={() => {
                const currentName = selected.subpasta || selected.pastaCategoria || "";
                setRenameValue(currentName);
                setRenameOpen(true);
              }}
            >
              <Pencil className="w-3.5 h-3.5 mr-1.5" />
              Renomear
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!selectedIsCustom}
              onClick={() => setDeleteOpen(true)}
            >
              <FolderX className="w-3.5 h-3.5 mr-1.5" />
              Excluir
            </Button>
          </div>
        </div>

        <div className="xl:col-span-8 border border-border/60 rounded-xl bg-card p-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-xs text-muted-foreground">Local atual</p>
              <p className="text-sm font-medium text-foreground">{breadcrumb.join(" > ")}</p>
            </div>
            <Button onClick={() => setUploadOpen(true)} className="gap-2" size="sm">
              <Plus className="w-4 h-4" />
              Adicionar nesta pasta
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            {filteredDocs.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Nenhum documento nesta pasta.
              </div>
            ) : (
              filteredDocs.map((doc) => (
                <div key={doc.id} className="flex items-start sm:items-center gap-3 p-3 border border-border/50 rounded-lg">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.original_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(doc.size_bytes / 1024 / 1024).toFixed(2)} MB • {format(parseISO(doc.created_at), "dd/MM/yyyy HH:mm")} •{" "}
                      {CATEGORY_LABELS[doc.category] || doc.category}
                    </p>
                    {doc.caminho_completo && (
                      <p className="text-[11px] text-muted-foreground truncate mt-1">{doc.caminho_completo}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setMoveTarget(doc);
                        setMoveValue(folderValue(doc.pasta_categoria || "07 - Outros", doc.subpasta || null));
                      }}
                      title="Mover"
                    >
                      <MoveRight className="w-4 h-4" />
                    </Button>
                    {(doc.mime_type === "application/pdf" || doc.mime_type.startsWith("image/")) && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePreview(doc)} title="Visualizar">
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(doc)} title="Download">
                      <Download className="w-4 h-4" />
                    </Button>
                    {doc.uploaded_by === user?.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(doc)}
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Adicionar Documentos</DialogTitle>
          </DialogHeader>
          <DocumentUploader
            processId={processId}
            defaultPastaCategoria={selected.pastaCategoria}
            defaultSubpasta={selected.subpasta}
            onUploadComplete={handleUploadComplete}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] h-[90vh] p-0 overflow-hidden bg-black/90 border-0">
          <div className="relative w-full h-full flex flex-col">
            <div className="flex items-center justify-between p-4 text-white bg-black/50 backdrop-blur-sm absolute top-0 left-0 right-0 z-10">
              <h3 className="text-sm font-medium truncate pr-8">{previewName}</h3>
            </div>
            {previewUrl && <iframe src={previewUrl} className="w-full h-full bg-white" title="Visualizacao" />}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Pasta Customizada</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome da pasta</Label>
              <Input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Ex: 08 - Laudos" />
            </div>
            <div className="space-y-1.5">
              <Label>Nivel</Label>
              <Select value={newFolderParent} onValueChange={setNewFolderParent}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__root">Pasta principal</SelectItem>
                  {structure.subpastas.map((cat) => (
                    <SelectItem key={cat.nome} value={cat.nome}>
                      Subpasta de {cat.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateFolderOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateFolder}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renomear Pasta</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Novo nome</Label>
            <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRenameFolder}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pasta customizada?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao so e permitida para pasta vazia. Documentos na pasta atual: {selectedCount}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFolder}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!moveTarget} onOpenChange={(open) => !open && setMoveTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mover Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Pasta de destino</Label>
            <Select value={moveValue} onValueChange={setMoveValue}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {folderOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveTarget(null)}>
              Cancelar
            </Button>
            <Button onClick={handleMoveDocument}>Mover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
