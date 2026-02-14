
-- Add profile fields
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS oab_number TEXT,
  ADD COLUMN IF NOT EXISTS oab_uf TEXT,
  ADD COLUMN IF NOT EXISTS cpf TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS zip_code TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatares são públicos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Usuários fazem upload de avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Usuários atualizam próprio avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Usuários deletam próprio avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Ensure CASCADE on kanban_tasks -> processos
ALTER TABLE public.kanban_tasks
  DROP CONSTRAINT IF EXISTS kanban_tasks_processo_id_fkey;
ALTER TABLE public.kanban_tasks
  ADD CONSTRAINT kanban_tasks_processo_id_fkey
    FOREIGN KEY (processo_id) REFERENCES public.processos(id) ON DELETE CASCADE;

-- Ensure CASCADE on document_metadata -> processos  
ALTER TABLE public.document_metadata
  DROP CONSTRAINT IF EXISTS document_metadata_process_id_fkey;
ALTER TABLE public.document_metadata
  ADD CONSTRAINT document_metadata_process_id_fkey
    FOREIGN KEY (process_id) REFERENCES public.processos(id) ON DELETE CASCADE;

-- Ensure CASCADE on movimentacoes -> processos
ALTER TABLE public.movimentacoes
  DROP CONSTRAINT IF EXISTS movimentacoes_processo_id_fkey;
ALTER TABLE public.movimentacoes
  ADD CONSTRAINT movimentacoes_processo_id_fkey
    FOREIGN KEY (processo_id) REFERENCES public.processos(id) ON DELETE CASCADE;
