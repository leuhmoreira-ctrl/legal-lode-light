
ALTER TABLE public.document_metadata
  ADD COLUMN IF NOT EXISTS pasta_categoria text,
  ADD COLUMN IF NOT EXISTS subpasta text,
  ADD COLUMN IF NOT EXISTS caminho_completo text;
