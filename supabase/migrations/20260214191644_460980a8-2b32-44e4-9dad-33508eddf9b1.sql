
-- Create storage bucket for process documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('process-documents', 'process-documents', false);

-- Storage policies
CREATE POLICY "Users upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'process-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users view own folder documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'process-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins view all documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'process-documents' AND
  public.is_admin_or_senior(auth.uid())
);

CREATE POLICY "Users delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'process-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create document_metadata table
CREATE TABLE public.document_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  version INT NOT NULL DEFAULT 1,
  tags TEXT[] DEFAULT '{}',
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_process ON public.document_metadata(process_id);
CREATE INDEX idx_document_category ON public.document_metadata(category);

ALTER TABLE public.document_metadata ENABLE ROW LEVEL SECURITY;

-- RLS: view documents of processes user has access to
CREATE POLICY "View documents via process access"
ON public.document_metadata FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.processos p
    WHERE p.id = document_metadata.process_id
    AND (p.user_id = auth.uid() OR p.advogado_id = auth.uid() OR public.is_admin_or_senior(auth.uid()))
  )
);

-- RLS: insert documents
CREATE POLICY "Insert own documents"
ON public.document_metadata FOR INSERT
TO authenticated
WITH CHECK (uploaded_by = auth.uid());

-- RLS: delete own documents
CREATE POLICY "Delete own documents"
ON public.document_metadata FOR DELETE
TO authenticated
USING (uploaded_by = auth.uid());
