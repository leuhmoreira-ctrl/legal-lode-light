import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FileText, Download, ExternalLink } from "lucide-react";

export function DocumentViewer({ storagePath }: { storagePath: string | null }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchUrl = async () => {
      if (storagePath) {
        // Create a signed URL valid for 1 hour
        const { data } = await supabase.storage
          .from("workflow-documents")
          .createSignedUrl(storagePath, 60 * 60);
        if (data) setUrl(data.signedUrl);
      } else {
        setUrl(null);
      }
    };
    fetchUrl();
  }, [storagePath]);

  if (!storagePath || !url) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-muted/20 border rounded-lg p-6">
        <FileText className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">Nenhum documento anexado</p>
      </div>
    );
  }

  const isPdf = storagePath.toLowerCase().endsWith(".pdf");

  return (
    <div className="h-full flex flex-col bg-background border rounded-lg overflow-hidden">
        <div className="p-2 border-b flex justify-between items-center bg-muted/20">
            <span className="text-xs font-medium truncate max-w-[200px]">{storagePath.split('/').pop()?.split('_').slice(1).join('_') || 'Documento'}</span>
            <div className="flex gap-2">
                <Button variant="ghost" size="sm" asChild>
                    <a href={url} download target="_blank" rel="noreferrer">
                        <Download className="w-4 h-4 mr-1" /> Baixar
                    </a>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                     <a href={url} target="_blank" rel="noreferrer">
                        <ExternalLink className="w-4 h-4 mr-1" /> Abrir
                     </a>
                </Button>
            </div>
        </div>
      {isPdf ? (
        <iframe src={url} className="w-full flex-1 min-h-[500px]" title="Document Viewer" />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-10">
          <FileText className="w-16 h-16 text-primary/40 mb-4" />
          <p className="text-sm text-muted-foreground mb-4">
            Visualização não disponível para este formato.
          </p>
          <Button asChild>
            <a href={url} target="_blank" rel="noreferrer">
              Baixar Arquivo
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
