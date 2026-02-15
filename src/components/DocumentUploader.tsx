import { useCallback, useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Upload, File, X, Loader2, Link2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CATEGORIES = [
  { value: 'petition', label: 'Petição' },
  { value: 'decision', label: 'Decisão' },
  { value: 'power_of_attorney', label: 'Procuração' },
  { value: 'client_document', label: 'Documento do Cliente' },
  { value: 'evidence', label: 'Prova' },
  { value: 'other', label: 'Outro' },
];

interface TaskOption {
  id: string;
  title: string;
  status: string;
  priority: string;
}

interface DocumentUploaderProps {
  processId: string;
  onUploadComplete: () => void;
}

/** Simple word-overlap score between two strings (0-1) */
function matchScore(a: string, b: string): number {
  const normalize = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).filter(w => w.length > 2);
  const wordsA = normalize(a);
  const wordsB = normalize(b);
  if (wordsA.length === 0 || wordsB.length === 0) return 0;
  const matches = wordsA.filter(w => wordsB.some(wb => wb.includes(w) || w.includes(wb))).length;
  return matches / Math.max(wordsA.length, wordsB.length);
}

export function DocumentUploader({ processId, onUploadComplete }: DocumentUploaderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState('other');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Task linking
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('none');
  const [suggestedTaskId, setSuggestedTaskId] = useState<string | null>(null);

  // Load open tasks for this process
  useEffect(() => {
    if (!processId) return;
    const load = async () => {
      const { data } = await supabase
        .from('kanban_tasks')
        .select('id, title, status, priority')
        .eq('processo_id', processId)
        .in('status', ['todo', 'in_progress', 'review'])
        .order('due_date', { ascending: true });
      setTasks(data || []);
    };
    load();
  }, [processId]);

  // Smart suggestion when files change
  useEffect(() => {
    if (files.length === 0 || tasks.length === 0) {
      setSuggestedTaskId(null);
      return;
    }
    const fileName = files[0].name.replace(/\.[^/.]+$/, '');
    let bestScore = 0;
    let bestId: string | null = null;
    for (const t of tasks) {
      const score = matchScore(fileName, t.title);
      if (score > bestScore) {
        bestScore = score;
        bestId = t.id;
      }
    }
    setSuggestedTaskId(bestScore >= 0.3 ? bestId : null);
  }, [files, tasks]);

  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    const accepted = Array.from(newFiles).filter(f =>
      ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg',
       'application/msword',
       'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ].includes(f.type)
    );
    if (accepted.length < Array.from(newFiles).length) {
      toast({ title: 'Alguns arquivos ignorados', description: 'Apenas PDF, imagens e Word são aceitos.', variant: 'destructive' });
    }
    setFiles(prev => [...prev, ...accepted]);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removeFile = (index: number) => setFiles(prev => prev.filter((_, i) => i !== index));

  const handleUpload = async () => {
    if (files.length === 0 || !user) return;
    setUploading(true);
    setProgress(0);

    const taskId = selectedTaskId !== 'none' ? selectedTaskId : null;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${user.id}/${processId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('process-documents')
          .upload(filePath, file);
        if (uploadError) throw uploadError;

        const { error: metaError } = await supabase
          .from('document_metadata')
          .insert({
            process_id: processId,
            storage_path: filePath,
            original_name: file.name,
            mime_type: file.type,
            size_bytes: file.size,
            category,
            uploaded_by: user.id,
            task_id: taskId,
          });
        if (metaError) throw metaError;

        // Also insert into task_attachments if linked
        if (taskId) {
          await supabase.from('task_attachments').insert({
            task_id: taskId,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            storage_path: filePath,
            uploaded_by: user.id,
          });
        }

        setProgress(((i + 1) / files.length) * 100);
      }

      const linkedMsg = taskId
        ? ` Vinculado(s) à tarefa "${tasks.find(t => t.id === taskId)?.title}".`
        : '';
      toast({ title: '✅ Upload concluído!', description: `${files.length} arquivo(s) enviado(s).${linkedMsg}` });
      setFiles([]);
      setSelectedTaskId('none');
      onUploadComplete();
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const priorityIcon = (p: string) => p === 'high' ? '🔴' : p === 'medium' ? '🟡' : '🟢';

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-medium text-foreground">
          {dragActive ? 'Solte os arquivos aqui' : 'Arraste arquivos ou clique para selecionar'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">PDF, Imagens, Word (máx. 50MB)</p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-medium text-foreground">{files.length} arquivo(s)</span>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 max-h-40 overflow-y-auto">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate text-foreground">{file.name}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(index)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>

          {/* Task linking */}
          {tasks.length > 0 && (
            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Vincular a tarefa (opcional)</span>
              </div>

              {suggestedTaskId && selectedTaskId === 'none' && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-2.5 text-xs space-y-1.5">
                  <p className="text-foreground font-medium">✨ Sugestão automática</p>
                  <p className="text-muted-foreground">
                    O arquivo parece relacionado à tarefa: <strong className="text-foreground">{tasks.find(t => t.id === suggestedTaskId)?.title}</strong>
                  </p>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelectedTaskId(suggestedTaskId)}>
                    Vincular a esta tarefa
                  </Button>
                </div>
              )}

              <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Selecionar tarefa..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma tarefa</SelectItem>
                  {tasks.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {priorityIcon(t.priority)} {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {uploading && (
            <div className="space-y-1">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground">Enviando... {Math.round(progress)}%</p>
            </div>
          )}

          <Button onClick={handleUpload} disabled={uploading} className="w-full gap-2">
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : <><Upload className="w-4 h-4" /> Fazer Upload</>}
          </Button>
        </div>
      )}
    </div>
  );
}
