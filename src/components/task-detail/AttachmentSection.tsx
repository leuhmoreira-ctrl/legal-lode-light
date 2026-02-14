import { useState, useRef } from "react";
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
  Filter,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

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

function getFileIcon(mimeType: string | null, fileName: string) {
  if (!mimeType) return <File className="w-4 h-4 text-muted-foreground" />;
  if (mimeType.startsWith("image/")) return <FileImage className="w-4 h-4 text-emerald-500" />;
  if (mimeType.includes("pdf")) return <FileText className="w-4 h-4 text-red-500" />;
  if (mimeType.includes("word") || mimeType.includes("document")) return <FileText className="w-4 h-4 text-blue-500" />;
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return <FileSpreadsheet className="w-4 h-4 text-green-500" />;
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("archive")) return <FileArchive className="w-4 h-4 text-yellow-500" />;
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
  const [filterCategory, setFilterCategory] = useState("all");
  const replaceRef = useRef<HTMLInputElement>(null);
  const [replaceTarget, setReplaceTarget] = useState<AttachmentItem | null>(null);

  const filtered = filterCategory === "all"
    ? attachments
    : attachments.filter((a) => (a.category || "other") === filterCategory);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 25MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${taskId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("task-attachments").upload(path, file);
      if (upErr) throw upErr;

      await supabase.from("task_attachments").insert({
        task_id: taskId,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        storage_path: path,
        uploaded_by: user!.id,
      });

      if (processoId) {
        await supabase.from("document_metadata").insert({
          process_id: processoId,
          storage_path: path,
          original_name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
          category: "other",
          uploaded_by: user!.id,
          task_id: taskId,
        });
      }

      toast({ title: "✅ Arquivo anexado" });
      onReload();
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
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
    const file = e.target.files?.[0];
    if (!file || !replaceTarget) return;
    if (file.size > 25 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 25MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      // Remove old file from storage
      await supabase.storage.from("task-attachments").remove([replaceTarget.storage_path]);

      // Upload new file
      const ext = file.name.split(".").pop();
      const path = `${taskId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("task-attachments").upload(path, file);
      if (upErr) throw upErr;

      await supabase.from("task_attachments").update({
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        storage_path: path,
      }).eq("id", replaceTarget.id);

      if (processoId) {
        await supabase.from("document_metadata").update({
          original_name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
          storage_path: path,
        }).eq("storage_path", replaceTarget.storage_path);
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
    const { data } = await supabase.storage.from("task-attachments").createSignedUrl(att.storage_path, 300);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  };

  const handleCategoryChange = async (att: AttachmentItem, category: string) => {
    // Update category in document_metadata if linked
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
        <div className="flex items-center gap-2">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-7 text-xs w-36">
              <Filter className="w-3 h-3 mr-1" />
              <SelectValue placeholder="Filtrar..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2 mb-3 max-h-64 overflow-y-auto">
        {filtered.map((att) => {
          const catInfo = getCategoryInfo(att.category);
          return (
            <div key={att.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 group">
              <div className="shrink-0">{getFileIcon(att.mime_type, att.file_name)}</div>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm font-medium text-foreground truncate">{att.file_name}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-muted-foreground">
                    {formatFileSize(att.file_size)} · {att.uploader_name} · {formatDistanceToNow(new Date(att.created_at), { addSuffix: true, locale: ptBR })}
                  </span>
                  {processoId && (
                    <Select
                      value={att.category || "other"}
                      onValueChange={(val) => handleCategoryChange(att, val)}
                    >
                      <SelectTrigger className="h-5 text-[10px] w-auto min-w-0 border-0 p-0 shadow-none">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 cursor-pointer ${catInfo.color}`}>
                          {catInfo.label}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePreview(att)} title="Visualizar">
                  <Eye className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(att)} title="Baixar">
                  <Download className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => { setReplaceTarget(att); replaceRef.current?.click(); }}
                  title="Substituir"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(att)}
                  title="Deletar"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            {attachments.length === 0 ? "Nenhum anexo" : "Nenhum anexo nesta categoria"}
          </p>
        )}
      </div>

      <label>
        <Button variant="outline" size="sm" className="gap-1.5" disabled={uploading} asChild>
          <span>
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {uploading ? "Enviando..." : "Adicionar Anexo"}
          </span>
        </Button>
        <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
      </label>

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
    </div>
  );
}
