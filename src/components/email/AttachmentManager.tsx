import { useState, useCallback } from "react";
import { Paperclip, X, File as FileIcon, UploadCloud, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface AttachmentManagerProps {
  attachments: File[];
  onChange: (files: File[]) => void;
  maxSizeMB?: number;
}

export function AttachmentManager({ attachments, onChange, maxSizeMB = 25 }: AttachmentManagerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => {
      // Basic validation logic here if needed
      return true;
    });

    // Simulate upload progress
    const newProgress = { ...uploadProgress };
    validFiles.forEach(f => { newProgress[f.name] = 0; });
    setUploadProgress(newProgress);

    // Mock progress interval
    validFiles.forEach(f => {
      let p = 0;
      const interval = setInterval(() => {
        p += 20;
        setUploadProgress(prev => ({ ...prev, [f.name]: Math.min(p, 100) }));
        if (p >= 100) clearInterval(interval);
      }, 200);
    });

    onChange([...attachments, ...validFiles]);
  };

  const removeAttachment = (index: number) => {
    onChange(attachments.filter((_, i) => i !== index));
  };

  const totalSize = attachments.reduce((acc, file) => acc + file.size, 0);
  const isOverLimit = totalSize > maxSizeMB * 1024 * 1024;

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
          attachments.length > 0 ? "py-4" : "py-8"
        )}
      >
        <input
          id="file-upload"
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        <label htmlFor="file-upload" className="cursor-pointer block">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <UploadCloud className="w-8 h-8 opacity-50" />
            <div className="text-sm">
              <span className="font-semibold text-primary">Clique para anexar</span> ou arraste arquivos aqui
            </div>
            <p className="text-xs opacity-70">
              Máximo {maxSizeMB}MB total (Atual: {(totalSize / 1024 / 1024).toFixed(2)}MB)
            </p>
          </div>
        </label>
      </div>

      {isOverLimit && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded">
          <AlertCircle className="w-4 h-4" />
          Limite de tamanho excedido. Remova alguns arquivos.
        </div>
      )}

      {attachments.length > 0 && (
        <div className="grid gap-2">
          {attachments.map((file, i) => (
            <div key={i} className="flex items-center gap-3 p-2 bg-muted/30 rounded-md border text-sm group">
              <div className="bg-background p-1.5 rounded-md border">
                <FileIcon className="w-4 h-4 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between mb-1">
                  <span className="truncate font-medium">{file.name}</span>
                  <span className="text-muted-foreground text-xs whitespace-nowrap">
                    {(file.size / 1024).toFixed(0)} KB
                  </span>
                </div>
                {uploadProgress[file.name] < 100 && (
                  <Progress value={uploadProgress[file.name]} className="h-1" />
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => removeAttachment(i)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
