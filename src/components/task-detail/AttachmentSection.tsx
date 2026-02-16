import { useState, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  Paperclip,
  Download,
  Trash2,
  RefreshCw,
  Upload,
  Loader2,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  File,
  Eye,
  Folder,
  ChevronRight,
  ChevronDown,
  Clock,
  History,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "peticao_inicial", label: "Petição Inicial", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "contestacao", label: "Contestação", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "recurso", label: "Recurso", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "provas", label: "Provas", color: "bg-green-100 text-green-700 border-green-200" },
  { value: "despacho", label: "Despacho", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { value: "sentenca", label: "Sentença", color: "bg-red-100 text-red-700 border-red-200" },
  { value: "documentos_gerais", label: "Documentos Gerais", color: "bg-gray-100 text-gray-700 border-gray-200" },
  { value: "interno", label: "Interno", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { value: "rascunho", label: "Rascunho", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "other", label: "Outro", color: "bg-muted text-muted-foreground border-border" },
];

export interface AttachmentItem {
  id: string;
  file_name: string;
  file_size: number;
  mime_type: string | null;
  storage_path: string;
  uploaded_by: string;
  created_at: string;
  uploader_name?: string;
  category?: string;
}

interface AttachmentSectionProps {
  attachments: AttachmentItem[];
  taskId: string;
  processoId: string | null;
  onReload: () => void;
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return <File className="w-4 h-4 text-muted-foreground" />;
  if (mimeType.startsWith("image/")) return <FileImage className="w-4 h-4 text-emerald-500" />;
  if (mimeType.includes("pdf")) return <FileText className="w-4 h-4 text-red-500" />;
  if (mimeType.includes("word") || mimeType.includes("document")) return <FileText className="w-4 h-4 text-blue-500" />;
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return <FileSpreadsheet className="w-4 h-4 text-green-500" />;
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("archive")) return <FileArchive className="w-4 h-4 text-yellow-500" />;
  if (mimeType.startsWith("audio/")) return <FileArchive className="w-4 h-4 text-purple-500" />;
  return <File className="w-4 h-4 text-muted-foreground" />;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getCategoryInfo(cat: string | undefined) {
  return CATEGORIES.find((c) => c.value === cat) || CATEGORIES[CATEGORIES.length - 1];
}

export function AttachmentSection({ attachments, taskId, processoId, onReload }: AttachmentSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AttachmentItem | null>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const [replaceTarget, setReplaceTarget] = useState<AttachmentItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Versioning Upload State
  const [pendingUpload, setPendingUpload] = useState<File | null>(null);
  const [showVersionDialog, setShowVersionDialog] = useState(false);

  // Preview State
  const [previewFile, setPreviewFile] = useState<{ url: string; type: string; name: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Folder State
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  // History Expansion State (Key: fileName + category)
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});

  const toggleFolder = (cat: string) => {
    setExpandedFolders(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const toggleHistory = (key: string) => {
    setExpandedHistory(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Grouping logic: Category -> FileName -> List of Versions
  const groupedAttachments = useMemo(() => {
    const groups: Record<string, Record<string, AttachmentItem[]>> = {};
    attachments.forEach(att => {
      const cat = att.category || "other";
      if (!groups[cat]) groups[cat] = {};

      const name = att.file_name;
      if (!groups[cat][name]) groups[cat][name] = [];
      groups[cat][name].push(att);
    });

    // Sort versions by date desc inside each group
    Object.keys(groups).forEach(cat => {
        Object.keys(groups[cat]).forEach(name => {
            groups[cat][name].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        });
    });

    return groups;
  }, [attachments]);

  const initiateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 25MB", variant: "destructive" });
      return;
    }

    // Check if file exists in any category (simplified: assume 'other' or check all)
    // Actually, new uploads go to "other" by default (in handleUpload).
    // So we check if it exists in "other" or ANY category?
    // If it exists anywhere, we should probably warn.
    const exists = attachments.some(a => a.file_name === file.name);

    if (exists) {
        setPendingUpload(file);
        setShowVersionDialog(true);
        e.target.value = ""; // Reset input
    } else {
        performUpload(file);
    }
  };

  const performUpload = async (file: File, category = "other") => {
    setUploading(true);
    try {
      if (!user?.id) {
        throw new Error("Usuário não autenticado");
      }

      const ext = file.name.split(".").pop();
      const path = `${user.id}/${taskId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("task-attachments").upload(path, file);
      if (upErr) throw upErr;

      const { error: attachmentErr } = await supabase.from("task_attachments").insert({
        task_id: taskId,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        storage_path: path,
        uploaded_by: user.id,
      });
      if (attachmentErr) throw attachmentErr;

      if (processoId) {
        const { error: metadataErr } = await supabase.from("document_metadata").insert({
          process_id: processoId,
          storage_path: path,
          original_name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
          category: category,
          uploaded_by: user.id,
          task_id: taskId,
        });
        if (metadataErr) throw metadataErr;
      }

      toast({ title: "✅ Arquivo anexado" });
      onReload();
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      setPendingUpload(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await supabase.storage.from("task-attachments").remove([deleteTarget.storage_path]);
      await supabase.from("task_attachments").delete().eq("id", deleteTarget.id);
      if (processoId) {
        await supabase.from("document_metadata").delete().eq("storage_path", deleteTarget.storage_path);
      }
      toast({ title: "Anexo removido" });
      onReload();
    } catch (err: any) {
      toast({ title: "Erro ao remover", description: err.message, variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Same as before
    const file = e.target.files?.[0];
    if (!file || !replaceTarget) return;
    // ... (rest of logic same as before, skipping for brevity in thought but including in file)
    // Actually I need to include it.
    if (file.size > 25 * 1024 * 1024) {
        toast({ title: "Arquivo muito grande", description: "Máximo 25MB", variant: "destructive" });
        return;
    }
    setUploading(true);
    try {
        if (!user?.id) {
            throw new Error("Usuário não autenticado");
        }

        await supabase.storage.from("task-attachments").remove([replaceTarget.storage_path]);
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${taskId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("task-attachments").upload(path, file);
        if (upErr) throw upErr;

        const { error: replaceErr } = await supabase.from("task_attachments").update({
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            storage_path: path,
        }).eq("id", replaceTarget.id);
        if (replaceErr) throw replaceErr;

        if (processoId) {
            const { error: metadataUpdateErr } = await supabase.from("document_metadata").update({
                original_name: file.name,
                mime_type: file.type,
                size_bytes: file.size,
                storage_path: path,
            }).eq("storage_path", replaceTarget.storage_path);
            if (metadataUpdateErr) throw metadataUpdateErr;
        }
        toast({ title: "✅ Arquivo substituído" });
        onReload();
    } catch (err: any) {
        toast({ title: "Erro ao substituir", description: err.message, variant: "destructive" });
    } finally {
        setUploading(false);
        setReplaceTarget(null);
        e.target.value = "";
    }
  };

  const handleDownload = async (att: AttachmentItem) => {
    const { data } = await supabase.storage.from("task-attachments").download(att.storage_path);
    if (!data) return;
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = att.file_name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePreview = async (att: AttachmentItem) => {
    setPreviewLoading(true);
    try {
      const { data } = await supabase.storage.from("task-attachments").createSignedUrl(att.storage_path, 3600);
      if (data?.signedUrl) {
         setPreviewFile({
             url: data.signedUrl,
             type: att.mime_type || "application/octet-stream",
             name: att.file_name
         });
      }
    } catch (err) {
        toast({ title: "Erro ao abrir preview", variant: "destructive" });
    } finally {
        setPreviewLoading(false);
    }
  };

  const handleCategoryChange = async (att: AttachmentItem, category: string) => {
    if (processoId) {
      await supabase.from("document_metadata")
        .update({ category })
        .eq("storage_path", att.storage_path);
    }
    toast({ title: "Categoria atualizada" });
    onReload();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Paperclip className="w-4 h-4" />
          Anexos ({attachments.length})
        </h3>
        <label>
            <Button variant="outline" size="sm" className="gap-1.5 h-7" disabled={uploading} asChild>
            <span>
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                Adicionar
            </span>
            </Button>
            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={initiateUpload}
                disabled={uploading}
            />
        </label>
      </div>

      <ScrollArea className="h-[280px] pr-4">
         {Object.entries(groupedAttachments).length === 0 ? (
             <p className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg">
                 Nenhum anexo. Clique em Adicionar para começar.
             </p>
         ) : (
            <div className="space-y-3">
             {Object.keys(groupedAttachments).sort().map(cat => {
                 const catInfo = getCategoryInfo(cat);
                 const filesByName = groupedAttachments[cat];
                 const isExpanded = expandedFolders[cat] !== false;

                 // Calculate total files in this category
                 const totalFiles = Object.values(filesByName).reduce((acc, curr) => acc + curr.length, 0);

                 return (
                     <div key={cat} className="border rounded-lg overflow-hidden">
                         <div
                            className="flex items-center gap-2 p-2 bg-muted/40 cursor-pointer hover:bg-muted/60 transition-colors"
                            onClick={() => toggleFolder(cat)}
                         >
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                            <Folder className={`w-4 h-4 ${catInfo.color.split(" ")[1]}`} />
                            <span className="text-sm font-medium flex-1">{catInfo.label}</span>
                            <Badge variant="secondary" className="text-[10px] h-5">{totalFiles}</Badge>
                         </div>

                         {isExpanded && (
                             <div className="bg-card divide-y">
                                 {Object.keys(filesByName).sort().map(fileName => {
                                     const versions = filesByName[fileName];
                                     const current = versions[0];
                                     const history = versions.slice(1);
                                     const historyKey = `${cat}-${fileName}`;
                                     const showHistory = expandedHistory[historyKey];

                                     return (
                                        <div key={current.id} className="flex flex-col">
                                             <div className="flex items-center gap-3 p-2 px-3 group hover:bg-muted/20 transition-colors">
                                                <div className="shrink-0 cursor-pointer" onClick={() => handlePreview(current)}>
                                                    {getFileIcon(current.mime_type)}
                                                </div>
                                                <div className="flex-1 min-w-0 space-y-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-medium text-foreground truncate cursor-pointer hover:underline" onClick={() => handlePreview(current)}>
                                                            {current.file_name}
                                                        </p>
                                                        {history.length > 0 && (
                                                            <Badge variant="outline" className="text-[10px] h-4 px-1 cursor-pointer hover:bg-muted" onClick={() => toggleHistory(historyKey)}>
                                                                v{versions.length}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground">
                                                        {formatFileSize(current.file_size)} · {current.uploader_name} · {formatDistanceToNow(new Date(current.created_at), { addSuffix: true, locale: ptBR })}
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePreview(current)} title="Visualizar">
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(current)} title="Baixar">
                                                        <Download className="w-3.5 h-3.5" />
                                                    </Button>
                                                    {history.length > 0 && (
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleHistory(historyKey)} title="Histórico">
                                                            <History className="w-3.5 h-3.5" />
                                                        </Button>
                                                    )}
                                                    {processoId && (
                                                        <Select
                                                        value={current.category || "other"}
                                                        onValueChange={(val) => handleCategoryChange(current, val)}
                                                        >
                                                        <SelectTrigger className="h-7 w-7 p-0 border-0 shadow-none hover:bg-muted" title="Mover">
                                                            <Folder className="w-3.5 h-3.5" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {CATEGORIES.map((c) => (
                                                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                        </Select>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        onClick={() => { setReplaceTarget(current); replaceRef.current?.click(); }}
                                                        title="Substituir (Overwrite)"
                                                    >
                                                        <RefreshCw className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(current)} title="Deletar">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                             </div>

                                             {/* History List */}
                                             {showHistory && history.length > 0 && (
                                                 <div className="pl-10 pr-2 pb-2 space-y-1 bg-muted/10 border-l ml-6 my-1">
                                                     {history.map((ver, idx) => (
                                                         <div key={ver.id} className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-muted/30">
                                                             <div className="flex items-center gap-2">
                                                                 <Badge variant="secondary" className="text-[9px] h-4 px-1">v{history.length - idx}</Badge>
                                                                 <span className="text-muted-foreground">{formatDistanceToNow(new Date(ver.created_at), { addSuffix: true, locale: ptBR })} por {ver.uploader_name}</span>
                                                             </div>
                                                             <div className="flex items-center">
                                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handlePreview(ver)} title="Visualizar">
                                                                    <Eye className="w-3 h-3" />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDownload(ver)} title="Baixar">
                                                                    <Download className="w-3 h-3" />
                                                                </Button>
                                                             </div>
                                                         </div>
                                                     ))}
                                                 </div>
                                             )}
                                        </div>
                                     );
                                 })}
                             </div>
                         )}
                     </div>
                 );
             })}
            </div>
         )}
      </ScrollArea>

      {/* Hidden input for replace */}
      <input ref={replaceRef} type="file" className="hidden" onChange={handleReplace} />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover anexo?</AlertDialogTitle>
            <AlertDialogDescription>
              O arquivo "{deleteTarget?.file_name}" será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Versioning Confirmation */}
      <AlertDialog open={showVersionDialog} onOpenChange={setShowVersionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivo já existe</AlertDialogTitle>
            <AlertDialogDescription>
              Já existe um arquivo chamado "{pendingUpload?.name}". O que deseja fazer?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => { setPendingUpload(null); }}>Cancelar</AlertDialogCancel>
            <Button
                variant="outline"
                onClick={() => {
                    // Rename logic (simple append timestamp) - or we could focus pendingUpload logic?
                    // Actually prompt implies "Rename" means "Upload as separate file with different name".
                    // But for now let's just upload with a suffix so it doesn't group.
                    if (pendingUpload) {
                        const newName = `Copy_${Date.now()}_${pendingUpload.name}`;
                        const blob = pendingUpload.slice(0, pendingUpload.size, pendingUpload.type);
                        const newFile = new globalThis.File([blob], newName, { type: pendingUpload.type });
                        performUpload(newFile);
                        setShowVersionDialog(false);
                    }
                }}
            >
                Renomear e Salvar
            </Button>
            <Button
                onClick={() => {
                    if (pendingUpload) {
                        // Find existing category to inherit
                        const existing = attachments.find(a => a.file_name === pendingUpload.name);
                        const category = existing?.category || "other";
                        performUpload(pendingUpload, category); // Same name -> creates version in same category
                        setShowVersionDialog(false);
                    }
                }}
            >
                Criar Nova Versão
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Modal */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-5xl h-[85vh] p-0 flex flex-col">
            <DialogHeader className="p-4 border-b shrink-0">
                <DialogTitle className="flex items-center justify-between">
                    <span className="truncate">{previewFile?.name}</span>
                    <Button variant="outline" size="sm" onClick={() => { if(previewFile) window.open(previewFile.url, "_blank"); }}>
                        <Download className="w-4 h-4 mr-2" /> Baixar
                    </Button>
                </DialogTitle>
            </DialogHeader>
            <div className="flex-1 bg-muted/20 relative overflow-hidden flex items-center justify-center p-4">
                {previewFile?.type.startsWith("image/") ? (
                    <img src={previewFile.url} alt="Preview" className="max-w-full max-h-full object-contain rounded shadow-lg" />
                ) : previewFile?.type === "application/pdf" ? (
                    <iframe src={previewFile.url} className="w-full h-full rounded border bg-white" />
                ) : previewFile?.type.startsWith("audio/") ? (
                    <div className="w-full max-w-md bg-white p-6 rounded-xl shadow-sm border text-center">
                        <FileArchive className="w-12 h-12 mx-auto text-primary mb-4" />
                        <audio controls src={previewFile.url} className="w-full" />
                    </div>
                ) : (
                    <div className="text-center">
                        <File className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">Visualização não disponível</p>
                        <Button className="mt-4" onClick={() => window.open(previewFile?.url, "_blank")}>
                            Baixar para visualizar
                        </Button>
                    </div>
                )}
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
