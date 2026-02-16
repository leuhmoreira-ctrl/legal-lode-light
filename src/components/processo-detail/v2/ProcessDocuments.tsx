import { useState, useEffect } from "react";
import { Plus, FileText, Eye, Download, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { DocumentUploader } from "@/components/DocumentUploader";

interface DocumentMeta {
  id: string;
  storage_path: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  category: string;
  created_at: string;
  uploaded_by: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  petition: 'Petição',
  decision: 'Decisão',
  power_of_attorney: 'Procuração',
  client_document: 'Doc. Cliente',
  evidence: 'Prova',
  other: 'Outro',
};

interface ProcessDocumentsProps {
  processId: string;
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

  useEffect(() => {
    loadDocuments();
  }, [processId, refreshKey]);

  const loadDocuments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("document_metadata")
      .select("*")
      .eq("process_id", processId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar documentos:", error);
    } else {
      setDocs(data || []);
    }
    setLoading(false);
  };

  const handleDownload = async (doc: DocumentMeta) => {
    const { data, error } = await supabase.storage
      .from("process-documents")
      .createSignedUrl(doc.storage_path, 300);

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
    const { data, error } = await supabase.storage
      .from("process-documents")
      .createSignedUrl(doc.storage_path, 300);

    if (error || !data?.signedUrl) {
      toast({ title: "Erro ao gerar preview", variant: "destructive" });
      return;
    }

    setPreviewUrl(data.signedUrl);
    setPreviewName(doc.original_name);
  };

  const handleDelete = async (doc: DocumentMeta) => {
    if (!confirm(`Excluir "${doc.original_name}"?`)) return;

    const { error: storageError } = await supabase.storage
      .from("process-documents")
      .remove([doc.storage_path]);

    if (storageError) {
      toast({ title: "Erro ao excluir arquivo", description: storageError.message, variant: "destructive" });
      return;
    }

    const { error: metaError } = await supabase
      .from("document_metadata")
      .delete()
      .eq("id", doc.id);

    if (metaError) {
      toast({ title: "Erro ao excluir metadados", description: metaError.message, variant: "destructive" });
      return;
    }

    toast({ title: "Documento excluído" });
    setRefreshKey((k) => k + 1);
  };

  const handleUploadComplete = () => {
    setUploadOpen(false);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Documentos</h3>
        <Button onClick={() => setUploadOpen(true)} className="gap-2 h-9 px-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium">
          <Plus className="w-4 h-4" />
          Adicionar
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 bg-muted/30 rounded-xl border border-dashed border-border/60">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <FileText className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Nenhum documento anexado ainda</p>
            <p className="text-xs text-muted-foreground mt-1">Adicione petições, provas ou outros arquivos.</p>
          </div>
          <Button variant="outline" onClick={() => setUploadOpen(true)} className="mt-2">
            Adicionar primeiro documento
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="group flex items-center p-4 bg-card hover:bg-muted/40 border border-border/40 rounded-xl transition-colors relative"
            >
              {/* Icon */}
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0 mr-4">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 pr-24">
                <p className="text-sm font-medium text-foreground truncate">{doc.original_name}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span className="font-medium">{CATEGORY_LABELS[doc.category] || doc.category}</span>
                  <span>•</span>
                  <span>{(doc.size_bytes / 1024 / 1024).toFixed(2)} MB</span>
                  <span>•</span>
                  <span>{format(parseISO(doc.created_at), "dd/MM/yyyy")}</span>
                </div>
              </div>

              {/* Actions (Hover) */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-card/80 backdrop-blur-sm p-1 rounded-lg shadow-sm border border-border/50">
                {(doc.mime_type === "application/pdf" || doc.mime_type.startsWith("image/")) && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handlePreview(doc)} title="Visualizar">
                    <Eye className="w-4 h-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleDownload(doc)} title="Download">
                  <Download className="w-4 h-4" />
                </Button>
                {doc.uploaded_by === user?.id && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(doc)} title="Excluir">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Adicionar Documentos</DialogTitle>
          </DialogHeader>
          <DocumentUploader processId={processId} onUploadComplete={handleUploadComplete} />
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] h-[90vh] p-0 overflow-hidden bg-black/90 border-0">
           <div className="relative w-full h-full flex flex-col">
              <div className="flex items-center justify-between p-4 text-white bg-black/50 backdrop-blur-sm absolute top-0 left-0 right-0 z-10">
                 <h3 className="text-sm font-medium truncate pr-8">{previewName}</h3>
              </div>
              {previewUrl && (
                <iframe
                  src={previewUrl}
                  className="w-full h-full bg-white"
                  title="Visualização"
                />
              )}
           </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
