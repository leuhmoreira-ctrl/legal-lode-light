import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  FileText,
  Eye,
  Download,
  Trash2,
  Loader2,
  Folder,
  ChevronRight,
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
  buildDocumentPath,
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

interface FolderTarget {
  pastaCategoria: string;
  subpasta: string | null;
}

interface MoveHistory {
  docId: string;
  from: FolderTarget;
  to: FolderTarget;
  oldName: string;
  newName: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  petition: "Peticao",
  decision: "Decisao",
  power_of_attorney: "Procuracao",
  client_document: "Doc. Cliente",
  evidence: "Prova",
  other: "Outro",
};

const CATEGORY_FOLDER_RULES: Record<string, string[]> = {
  petition: ["01 - Peticoes"],
  decision: ["02 - Decisoes e Sentencas"],
  power_of_attorney: ["03 - Documentos"],
  client_document: ["03 - Documentos"],
  evidence: ["04 - Provas"],
  other: [],
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

function sortDocuments(items: DocumentMeta[]): DocumentMeta[] {
  return [...items].sort((a, b) => {
    if ((a.pasta_categoria || "") !== (b.pasta_categoria || "")) {
      return (a.pasta_categoria || "").localeCompare(b.pasta_categoria || "");
    }
    if ((a.subpasta || "") !== (b.subpasta || "")) {
      return (a.subpasta || "").localeCompare(b.subpasta || "");
    }
    if (a.ordem_na_pasta !== b.ordem_na_pasta) return a.ordem_na_pasta - b.ordem_na_pasta;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

function splitFileName(name: string): { base: string; ext: string } {
  const lastDot = name.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === name.length - 1) return { base: name, ext: "" };
  return {
    base: name.slice(0, lastDot),
    ext: name.slice(lastDot),
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

  const [draggingDocId, setDraggingDocId] = useState<string | null>(null);
  const [dragOverTargetKey, setDragOverTargetKey] = useState<string | null>(null);
  const [recentlyMovedDocId, setRecentlyMovedDocId] = useState<string | null>(null);
  const [shakeDocId, setShakeDocId] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<MoveHistory | null>(null);

  const expandedStorageKey = useMemo(() => `process-files-expanded:${processId}`, [processId]);

  useEffect(() => {
    loadAll();
  }, [processId, refreshKey]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(expandedStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, boolean>;
        setExpanded(parsed);
      } else {
        setExpanded({});
      }
    } catch {
      setExpanded({});
    }
  }, [expandedStorageKey]);

  useEffect(() => {
    localStorage.setItem(expandedStorageKey, JSON.stringify(expanded));
  }, [expanded, expandedStorageKey]);

  useEffect(() => {
    return () => {
      document.body.classList.remove("dragging-documents-cursor");
    };
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const [docsRes, folderRes] = await Promise.all([
      supabase.from("document_metadata").select("*").eq("process_id", processId),
      supabase
        .from("drive_folders")
        .select("id, nome_pasta, estrutura_subpastas")
        .eq("processo_id", processId)
        .maybeSingle(),
    ]);

    if (docsRes.error) {
      console.error("Erro ao carregar documentos:", docsRes.error);
      setDocs([]);
    } else {
      const items = (docsRes.data || []) as DocumentMeta[];
      setDocs(sortDocuments(items));
    }

    if (folderRes.error || !folderRes.data) {
      setDriveFolder(null);
    } else {
      setDriveFolder(folderRes.data as unknown as DriveFolderRow);
    }
    setLoading(false);
  };

  const structure = useMemo<FolderStructure>(() => {
    if (!driveFolder) return cloneDefaultFolderStructure("Processo");
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
      const { error } = await supabase
        .from("drive_folders")
        .update({ estrutura_subpastas: nextStructure })
        .eq("id", driveFolder.id);
      if (error) throw error;
      setDriveFolder((prev) => (prev ? { ...prev, estrutura_subpastas: nextStructure } : prev));
      return;
    }

    const { data, error } = await supabase
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

  const isSameFolder = useCallback((doc: DocumentMeta, target: FolderTarget) => {
    return (doc.pasta_categoria || "") === target.pastaCategoria && (doc.subpasta || "") === (target.subpasta || "");
  }, []);

  const findConflictInTarget = useCallback(
    (doc: DocumentMeta, target: FolderTarget) =>
      docs.find(
        (d) =>
          d.id !== doc.id &&
          (d.pasta_categoria || "") === target.pastaCategoria &&
          (d.subpasta || "") === (target.subpasta || "") &&
          d.original_name.toLowerCase() === doc.original_name.toLowerCase()
      ) || null,
    [docs]
  );

  const ensureUniqueNameForTarget = useCallback(
    (rawName: string, target: FolderTarget, excludeId: string) => {
      const { base, ext } = splitFileName(rawName);
      const existing = new Set(
        docs
          .filter(
            (d) =>
              d.id !== excludeId &&
              (d.pasta_categoria || "") === target.pastaCategoria &&
              (d.subpasta || "") === (target.subpasta || "")
          )
          .map((d) => d.original_name.toLowerCase())
      );

      if (!existing.has(rawName.toLowerCase())) return rawName;

      let index = 2;
      let candidate = `${base} (${index})${ext}`;
      while (existing.has(candidate.toLowerCase())) {
        index += 1;
        candidate = `${base} (${index})${ext}`;
      }
      return candidate;
    },
    [docs]
  );

  const canDropDocumentIntoFolder = useCallback(
    (doc: DocumentMeta, target: FolderTarget) => {
      const allowed = CATEGORY_FOLDER_RULES[doc.category] || [];
      if (allowed.length === 0) return true;
      const targetCategory = structure.subpastas.find((cat) => cat.nome === target.pastaCategoria);
      if (!targetCategory) return false;
      if (targetCategory.custom) return true;
      return allowed.includes(target.pastaCategoria);
    },
    [structure.subpastas]
  );

  const markMoveSuccess = useCallback((docId: string) => {
    setRecentlyMovedDocId(docId);
    window.setTimeout(() => {
      setRecentlyMovedDocId((prev) => (prev === docId ? null : prev));
    }, 500);
  }, []);

  const markMoveError = useCallback((docId: string) => {
    setShakeDocId(docId);
    window.setTimeout(() => {
      setShakeDocId((prev) => (prev === docId ? null : prev));
    }, 350);
  }, []);

  const moveDocumentToFolder = useCallback(
    async (doc: DocumentMeta, target: FolderTarget, source: "drag" | "dialog" | "undo") => {
      if (!canDropDocumentIntoFolder(doc, target)) {
        toast({
          title: "Pasta incompatível",
          description: "Este tipo de documento não pode ser movido para esta pasta.",
          variant: "destructive",
        });
        markMoveError(doc.id);
        return false;
      }

      if (source !== "undo" && isSameFolder(doc, target)) {
        return false;
      }

      let nextName = doc.original_name;
      const conflict = findConflictInTarget(doc, target);

      try {
        if (source !== "undo" && conflict) {
          const choice = window.prompt(
            `Já existe "${conflict.original_name}" nesta pasta.\nDigite "S" para substituir ou "R" para renomear.`,
            "R"
          );
          if (!choice) return false;

          if (choice.trim().toUpperCase().startsWith("S")) {
            const { error: storageError } = await supabase.storage
              .from("process-documents")
              .remove([conflict.storage_path]);
            if (storageError) {
              throw new Error(`Não foi possível substituir: ${storageError.message}`);
            }
            const { error: deleteError } = await supabase.from("document_metadata").delete().eq("id", conflict.id);
            if (deleteError) {
              throw new Error(`Não foi possível substituir: ${deleteError.message}`);
            }
            setDocs((prev) => prev.filter((item) => item.id !== conflict.id));
          } else {
            nextName = ensureUniqueNameForTarget(doc.original_name, target, doc.id);
          }
        }

        const { error } = await supabase
          .from("document_metadata")
          .update({
            pasta_categoria: target.pastaCategoria,
            subpasta: target.subpasta,
            ordem_na_pasta: 0,
            original_name: nextName,
          })
          .eq("id", doc.id);

        if (error) throw error;

        const updatedDoc: DocumentMeta = {
          ...doc,
          pasta_categoria: target.pastaCategoria,
          subpasta: target.subpasta,
          ordem_na_pasta: 0,
          original_name: nextName,
          caminho_completo: buildDocumentPath(
            structure.raiz || "Processo",
            target.pastaCategoria,
            target.subpasta,
            nextName
          ),
        };

        setDocs((prev) => sortDocuments(prev.map((item) => (item.id === doc.id ? updatedDoc : item))));

        if (source !== "undo") {
          setLastMove({
            docId: doc.id,
            from: {
              pastaCategoria: doc.pasta_categoria || "07 - Outros",
              subpasta: doc.subpasta || null,
            },
            to: target,
            oldName: doc.original_name,
            newName: nextName,
          });
        } else {
          setLastMove(null);
        }

        markMoveSuccess(doc.id);
        const targetLabel = target.subpasta ? `${target.pastaCategoria} > ${target.subpasta}` : target.pastaCategoria;
        toast({
          title: source === "undo" ? "Movimento desfeito" : "Documento movido",
          description: source === "undo" ? `Documento voltou para ${targetLabel}` : `Documento movido para ${targetLabel}`,
        });
        return true;
      } catch (err: any) {
        toast({ title: "Não foi possível mover documento", description: err.message, variant: "destructive" });
        markMoveError(doc.id);
        return false;
      }
    },
    [
      canDropDocumentIntoFolder,
      isSameFolder,
      findConflictInTarget,
      ensureUniqueNameForTarget,
      markMoveError,
      markMoveSuccess,
      structure.raiz,
      toast,
    ]
  );

  const undoLastMove = useCallback(async () => {
    if (!lastMove) return;
    const doc = docs.find((d) => d.id === lastMove.docId);
    if (!doc) {
      setLastMove(null);
      return;
    }

    const { error } = await supabase
      .from("document_metadata")
      .update({
        pasta_categoria: lastMove.from.pastaCategoria,
        subpasta: lastMove.from.subpasta,
        ordem_na_pasta: 0,
        original_name: lastMove.oldName,
      })
      .eq("id", lastMove.docId);

    if (error) {
      toast({ title: "Erro ao desfazer movimento", description: error.message, variant: "destructive" });
      return;
    }

    const restoredDoc: DocumentMeta = {
      ...doc,
      pasta_categoria: lastMove.from.pastaCategoria,
      subpasta: lastMove.from.subpasta,
      ordem_na_pasta: 0,
      original_name: lastMove.oldName,
      caminho_completo: buildDocumentPath(
        structure.raiz || "Processo",
        lastMove.from.pastaCategoria,
        lastMove.from.subpasta,
        lastMove.oldName
      ),
    };

    setDocs((prev) => sortDocuments(prev.map((item) => (item.id === doc.id ? restoredDoc : item))));
    setLastMove(null);
    markMoveSuccess(restoredDoc.id);
    toast({ title: "Movimento desfeito", description: "Documento voltou para a pasta anterior." });
  }, [docs, lastMove, markMoveSuccess, structure.raiz, toast]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "z") {
        if (!lastMove) return;
        event.preventDefault();
        void undoLastMove();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lastMove, undoLastMove]);

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

    setDocs((prev) => prev.filter((item) => item.id !== doc.id));
    toast({ title: "Documento excluido" });
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
    } catch (err: any) {
      toast({ title: "Erro ao remover pasta", description: err.message, variant: "destructive" });
    }
  };

  const handleMoveDocumentFromDialog = async () => {
    if (!moveTarget || !moveValue) return;
    const { pastaCategoria, subpasta } = parseFolderValue(moveValue);
    const moved = await moveDocumentToFolder(moveTarget, { pastaCategoria, subpasta }, "dialog");
    if (moved) {
      setMoveTarget(null);
      setMoveValue("");
    }
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

  const toggleCategory = (categoryName: string) => {
    setExpanded((prev) => ({ ...prev, [categoryName]: !(prev[categoryName] ?? false) }));
  };

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, doc: DocumentMeta) => {
    setDraggingDocId(doc.id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", doc.id);
    document.body.classList.add("dragging-documents-cursor");
  };

  const handleDragEnd = () => {
    setDragOverTargetKey(null);
    setDraggingDocId(null);
    document.body.classList.remove("dragging-documents-cursor");
  };

  const handleFolderDragOver = (
    event: React.DragEvent<HTMLElement>,
    target: FolderTarget
  ) => {
    const docId = draggingDocId || event.dataTransfer.getData("text/plain");
    if (!docId) return;
    const doc = docs.find((item) => item.id === docId);
    if (!doc) return;

    if (!canDropDocumentIntoFolder(doc, target)) {
      event.dataTransfer.dropEffect = "none";
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverTargetKey(folderKey(target.pastaCategoria, target.subpasta));
  };

  const handleFolderDragEnter = (
    event: React.DragEvent<HTMLElement>,
    target: FolderTarget
  ) => {
    const docId = draggingDocId || event.dataTransfer.getData("text/plain");
    if (!docId) return;
    const doc = docs.find((item) => item.id === docId);
    if (!doc) return;
    if (!canDropDocumentIntoFolder(doc, target)) return;
    event.preventDefault();
    setExpanded((prev) => ({ ...prev, [target.pastaCategoria]: true }));
    setDragOverTargetKey(folderKey(target.pastaCategoria, target.subpasta));
  };

  const handleFolderDragLeave = (
    event: React.DragEvent<HTMLElement>,
    target: FolderTarget
  ) => {
    const related = event.relatedTarget as Node | null;
    if (related && event.currentTarget.contains(related)) return;
    setDragOverTargetKey((prev) =>
      prev === folderKey(target.pastaCategoria, target.subpasta) ? null : prev
    );
  };

  const handleFolderDrop = async (
    event: React.DragEvent<HTMLElement>,
    target: FolderTarget
  ) => {
    event.preventDefault();
    const docId = event.dataTransfer.getData("text/plain") || draggingDocId;
    if (!docId) {
      setDragOverTargetKey(null);
      return;
    }

    const doc = docs.find((item) => item.id === docId);
    setDragOverTargetKey(null);
    setDraggingDocId(null);
    document.body.classList.remove("dragging-documents-cursor");
    if (!doc) return;

    await moveDocumentToFolder(doc, target, "drag");
  };

  const breadcrumb = [structure.raiz || "Processo", selected.pastaCategoria, selected.subpasta].filter(Boolean) as string[];

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
          {lastMove && (
            <Button variant="outline" className="gap-2" onClick={() => void undoLastMove()}>
              Desfazer ultimo movimento
            </Button>
          )}
          <Button variant="outline" className="gap-2" onClick={() => setCreateFolderOpen(true)}>
            <FolderPlus className="w-4 h-4" />
            Criar Pasta
          </Button>
          <Button
            onClick={() => setUploadOpen(true)}
            className="gap-2 h-10 px-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
          >
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
              const catExpanded = expanded[cat.nome] ?? false;
              const catCount = counts[folderKey(cat.nome, null)] || 0;
              const selectedCat = selected.pastaCategoria === cat.nome && !selected.subpasta;
              const catTargetKey = folderKey(cat.nome, null);
              const isCategoryDropTarget = dragOverTargetKey === catTargetKey;

              return (
                <div key={cat.nome} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setSelected({ pastaCategoria: cat.nome, subpasta: null })}
                    onDragOver={(e) => handleFolderDragOver(e, { pastaCategoria: cat.nome, subpasta: null })}
                    onDragEnter={(e) => handleFolderDragEnter(e, { pastaCategoria: cat.nome, subpasta: null })}
                    onDragLeave={(e) => handleFolderDragLeave(e, { pastaCategoria: cat.nome, subpasta: null })}
                    onDrop={(e) => void handleFolderDrop(e, { pastaCategoria: cat.nome, subpasta: null })}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left border transition-all duration-200 ${
                      isCategoryDropTarget
                        ? "folder-drag-over"
                        : selectedCat
                        ? "bg-blue-50 text-blue-700 border-blue-100"
                        : "hover:bg-muted/50 border-transparent"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <span
                        className="text-muted-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCategory(cat.nome);
                        }}
                      >
                        {cat.subpastas.length > 0 ? (
                          <ChevronRight
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${
                              catExpanded ? "rotate-90" : "rotate-0"
                            }`}
                          />
                        ) : (
                          <span className="inline-block w-3.5 h-3.5" />
                        )}
                      </span>
                      <Folder className="w-4 h-4" />
                      {cat.nome}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      {isCategoryDropTarget && draggingDocId ? <Plus className="w-3.5 h-3.5 text-blue-600" /> : null}
                      {catCount}
                    </span>
                  </button>

                  {cat.subpastas.length > 0 && (
                    <div
                      className={`grid transition-all duration-200 ease-in-out ${
                        catExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="pl-7 space-y-1 pt-1">
                          {cat.subpastas.map((sub) => {
                            const subName = getSubfolderName(sub);
                            const subCount = counts[folderKey(cat.nome, subName)] || 0;
                            const selectedSub =
                              selected.pastaCategoria === cat.nome && selected.subpasta === subName;
                            const subTargetKey = folderKey(cat.nome, subName);
                            const isSubDropTarget = dragOverTargetKey === subTargetKey;

                            return (
                              <button
                                key={`${cat.nome}-${subName}`}
                                type="button"
                                onClick={() => setSelected({ pastaCategoria: cat.nome, subpasta: subName })}
                                onDragOver={(e) =>
                                  handleFolderDragOver(e, { pastaCategoria: cat.nome, subpasta: subName })
                                }
                                onDragEnter={(e) =>
                                  handleFolderDragEnter(e, { pastaCategoria: cat.nome, subpasta: subName })
                                }
                                onDragLeave={(e) =>
                                  handleFolderDragLeave(e, { pastaCategoria: cat.nome, subpasta: subName })
                                }
                                onDrop={(e) =>
                                  void handleFolderDrop(e, { pastaCategoria: cat.nome, subpasta: subName })
                                }
                                className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-sm border transition-all duration-200 ${
                                  isSubDropTarget
                                    ? "folder-drag-over"
                                    : selectedSub
                                    ? "bg-blue-50 text-blue-700 border-blue-100"
                                    : "hover:bg-muted/50 border-transparent"
                                }`}
                              >
                                <span className="truncate">{subName}</span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  {isSubDropTarget && draggingDocId ? <Plus className="w-3.5 h-3.5 text-blue-600" /> : null}
                                  {subCount}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
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
              filteredDocs.map((doc) => {
                const isDragging = draggingDocId === doc.id;
                const isMoved = recentlyMovedDocId === doc.id;
                const isShake = shakeDocId === doc.id;
                const rowClass = [
                  "flex items-start sm:items-center gap-3 p-3 border border-border/50 rounded-lg transition-all duration-200",
                  "cursor-grab active:cursor-grabbing",
                  isDragging ? "dragging-document opacity-60 rotate-1" : "",
                  isMoved ? "bg-blue-50/40 border-blue-200" : "",
                  isShake ? "document-shake" : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <div
                    key={doc.id}
                    className={rowClass}
                    draggable
                    onDragStart={(e) => handleDragStart(e, doc)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.original_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {(doc.size_bytes / 1024 / 1024).toFixed(2)} MB •{" "}
                        {format(parseISO(doc.created_at), "dd/MM/yyyy HH:mm")} •{" "}
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handlePreview(doc)}
                          title="Visualizar"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDownload(doc)}
                        title="Download"
                      >
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
                );
              })
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
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Ex: 08 - Laudos"
              />
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
            <Button onClick={() => void handleMoveDocumentFromDialog()}>Mover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
