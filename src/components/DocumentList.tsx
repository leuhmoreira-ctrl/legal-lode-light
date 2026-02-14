import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { File, Download, Trash2, Eye, Filter, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';

const CATEGORY_LABELS: Record<string, string> = {
  petition: 'Petição',
  decision: 'Decisão',
  power_of_attorney: 'Procuração',
  client_document: 'Documento do Cliente',
  evidence: 'Prova',
  other: 'Outro',
};

const CATEGORY_COLORS: Record<string, string> = {
  petition: 'bg-primary/10 text-primary',
  decision: 'bg-accent/10 text-accent',
  power_of_attorney: 'bg-success/10 text-success',
  client_document: 'bg-secondary text-secondary-foreground',
  evidence: 'bg-warning/10 text-warning',
  other: 'bg-muted text-muted-foreground',
};

interface DocumentMeta {
  id: string;
  storage_path: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  category: string;
  version: number;
  created_at: string;
  uploaded_by: string;
}

interface DocumentListProps {
  processId: string;
  refreshKey: number;
}

export function DocumentList({ processId, refreshKey }: DocumentListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [docs, setDocs] = useState<DocumentMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState('');

  useEffect(() => {
    loadDocuments();
  }, [processId, refreshKey]);

  const loadDocuments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('document_metadata')
      .select('*')
      .eq('process_id', processId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar documentos:', error);
    } else {
      setDocs(data || []);
    }
    setLoading(false);
  };

  const handleDownload = async (doc: DocumentMeta) => {
    const { data, error } = await supabase.storage
      .from('process-documents')
      .createSignedUrl(doc.storage_path, 300);

    if (error || !data?.signedUrl) {
      toast({ title: 'Erro ao gerar link', description: error?.message || 'Tente novamente.', variant: 'destructive' });
      return;
    }

    const a = document.createElement('a');
    a.href = data.signedUrl;
    a.download = doc.original_name;
    a.click();
  };

  const handlePreview = async (doc: DocumentMeta) => {
    const { data, error } = await supabase.storage
      .from('process-documents')
      .createSignedUrl(doc.storage_path, 300);

    if (error || !data?.signedUrl) {
      toast({ title: 'Erro ao gerar preview', variant: 'destructive' });
      return;
    }

    setPreviewUrl(data.signedUrl);
    setPreviewName(doc.original_name);
  };

  const handleDelete = async (doc: DocumentMeta) => {
    if (!confirm(`Excluir "${doc.original_name}"?`)) return;

    const { error: storageError } = await supabase.storage
      .from('process-documents')
      .remove([doc.storage_path]);

    if (storageError) {
      toast({ title: 'Erro ao excluir arquivo', description: storageError.message, variant: 'destructive' });
      return;
    }

    const { error: metaError } = await supabase
      .from('document_metadata')
      .delete()
      .eq('id', doc.id);

    if (metaError) {
      toast({ title: 'Erro ao excluir metadados', description: metaError.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Documento excluído' });
    loadDocuments();
  };

  const filtered = categoryFilter === 'all' ? docs : docs.filter(d => d.category === categoryFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter */}
      {docs.length > 0 && (
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48 h-8 text-xs">
              <SelectValue placeholder="Filtrar categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} documento(s)</span>
        </div>
      )}

      {/* Document list */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Nenhum documento {docs.length > 0 ? 'nesta categoria' : 'enviado ainda'}.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/60 hover:bg-muted/30 transition-colors">
              <File className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{doc.original_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className={`text-[10px] ${CATEGORY_COLORS[doc.category] || ''}`}>
                    {CATEGORY_LABELS[doc.category] || doc.category}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {(doc.size_bytes / 1024 / 1024).toFixed(2)} MB
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {format(parseISO(doc.created_at), 'dd/MM/yyyy HH:mm')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {(doc.mime_type === 'application/pdf' || doc.mime_type.startsWith('image/')) && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePreview(doc)} title="Visualizar">
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(doc)} title="Download">
                  <Download className="w-3.5 h-3.5" />
                </Button>
                {doc.uploaded_by === user?.id && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(doc)} title="Excluir">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-sm truncate">{previewName}</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <iframe
              src={previewUrl}
              className="w-full h-[70vh] rounded-lg border border-border"
              title="Visualização do documento"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
