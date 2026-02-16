
-- Create drive_folders table
CREATE TABLE IF NOT EXISTS public.drive_folders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  processo_id uuid NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  nome_pasta text NOT NULL DEFAULT 'Processo',
  estrutura_subpastas jsonb DEFAULT '{}'::jsonb,
  sincronizado boolean DEFAULT false,
  drive_folder_id text,
  criado_em timestamp with time zone DEFAULT now(),
  atualizado_em timestamp with time zone DEFAULT now()
);

ALTER TABLE public.drive_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View drive_folders via processo" ON public.drive_folders
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM processos p WHERE p.id = drive_folders.processo_id
    AND (p.user_id = auth.uid() OR p.advogado_id = auth.uid() OR is_admin_or_senior(auth.uid()))
  ));

CREATE POLICY "Insert drive_folders" ON public.drive_folders
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM processos p WHERE p.id = drive_folders.processo_id
    AND (p.user_id = auth.uid() OR p.advogado_id = auth.uid() OR is_admin_or_senior(auth.uid()))
  ));

CREATE POLICY "Update drive_folders" ON public.drive_folders
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM processos p WHERE p.id = drive_folders.processo_id
    AND (p.user_id = auth.uid() OR p.advogado_id = auth.uid() OR is_admin_or_senior(auth.uid()))
  ));

-- Create file_structure_templates table
CREATE TABLE IF NOT EXISTS public.file_structure_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  estrutura_subpastas jsonb DEFAULT '{}'::jsonb,
  criado_em timestamp with time zone DEFAULT now(),
  atualizado_em timestamp with time zone DEFAULT now()
);

ALTER TABLE public.file_structure_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own templates" ON public.file_structure_templates
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users upsert own templates" ON public.file_structure_templates
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own templates" ON public.file_structure_templates
  FOR UPDATE USING (user_id = auth.uid());

-- Add ordem_na_pasta to document_metadata
ALTER TABLE public.document_metadata
  ADD COLUMN IF NOT EXISTS ordem_na_pasta integer DEFAULT 0;
