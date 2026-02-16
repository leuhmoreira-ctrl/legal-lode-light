-- Phase 1: Local file structure (pre-Google Drive integration)

-- 1) Helper: default folder structure used per process
CREATE OR REPLACE FUNCTION public.default_drive_folder_structure()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'raiz', 'Processo',
    'subpastas', jsonb_build_array(
      jsonb_build_object('nome', '01 - Peticoes', 'subpastas', jsonb_build_array('Inicial', 'Contestacao', 'Replica', 'Recursos')),
      jsonb_build_object('nome', '02 - Decisoes e Sentencas', 'subpastas', jsonb_build_array('Despachos', 'Decisoes Interlocutorias', 'Sentenca')),
      jsonb_build_object('nome', '03 - Documentos', 'subpastas', jsonb_build_array('Procuracoes', 'RG e CPF', 'Comprovantes', 'Contratos')),
      jsonb_build_object('nome', '04 - Provas', 'subpastas', jsonb_build_array('Documentais', 'Testemunhais', 'Periciais')),
      jsonb_build_object('nome', '05 - Comunicacoes', 'subpastas', jsonb_build_array('Emails', 'Notificacoes', 'Intimacoes')),
      jsonb_build_object('nome', '06 - Jurisprudencia', 'subpastas', jsonb_build_array()),
      jsonb_build_object('nome', '07 - Outros', 'subpastas', jsonb_build_array())
    )
  );
$$;

-- 2) Template table (per user) for custom default structures
CREATE TABLE IF NOT EXISTS public.file_structure_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  estrutura_subpastas jsonb NOT NULL DEFAULT public.default_drive_folder_structure(),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.file_structure_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own file templates" ON public.file_structure_templates;
CREATE POLICY "Users view own file templates"
ON public.file_structure_templates FOR SELECT
USING (user_id = auth.uid() OR public.is_admin_or_senior(auth.uid()));

DROP POLICY IF EXISTS "Users insert own file templates" ON public.file_structure_templates;
CREATE POLICY "Users insert own file templates"
ON public.file_structure_templates FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own file templates" ON public.file_structure_templates;
CREATE POLICY "Users update own file templates"
ON public.file_structure_templates FOR UPDATE
USING (user_id = auth.uid() OR public.is_admin_or_senior(auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_admin_or_senior(auth.uid()));

DROP POLICY IF EXISTS "Users delete own file templates" ON public.file_structure_templates;
CREATE POLICY "Users delete own file templates"
ON public.file_structure_templates FOR DELETE
USING (user_id = auth.uid() OR public.is_admin_or_senior(auth.uid()));

-- 3) Main folders table per process (simulates Drive hierarchy locally)
CREATE TABLE IF NOT EXISTS public.drive_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL UNIQUE REFERENCES public.processos(id) ON DELETE CASCADE,
  nome_pasta text NOT NULL,
  estrutura_subpastas jsonb NOT NULL DEFAULT public.default_drive_folder_structure(),
  drive_folder_id text,
  sincronizado boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drive_folders_processo_id ON public.drive_folders(processo_id);
CREATE INDEX IF NOT EXISTS idx_drive_folders_sincronizado ON public.drive_folders(sincronizado);

ALTER TABLE public.drive_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View drive folders via processo access" ON public.drive_folders;
CREATE POLICY "View drive folders via processo access"
ON public.drive_folders FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.processos p
    WHERE p.id = drive_folders.processo_id
      AND (p.user_id = auth.uid() OR p.advogado_id = auth.uid() OR public.is_admin_or_senior(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Insert drive folders via processo owner" ON public.drive_folders;
CREATE POLICY "Insert drive folders via processo owner"
ON public.drive_folders FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.processos p
    WHERE p.id = drive_folders.processo_id
      AND (p.user_id = auth.uid() OR public.is_admin_or_senior(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Update drive folders via processo access" ON public.drive_folders;
CREATE POLICY "Update drive folders via processo access"
ON public.drive_folders FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.processos p
    WHERE p.id = drive_folders.processo_id
      AND (p.user_id = auth.uid() OR p.advogado_id = auth.uid() OR public.is_admin_or_senior(auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.processos p
    WHERE p.id = drive_folders.processo_id
      AND (p.user_id = auth.uid() OR p.advogado_id = auth.uid() OR public.is_admin_or_senior(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Delete drive folders via processo owner" ON public.drive_folders;
CREATE POLICY "Delete drive folders via processo owner"
ON public.drive_folders FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.processos p
    WHERE p.id = drive_folders.processo_id
      AND (p.user_id = auth.uid() OR public.is_admin_or_senior(auth.uid()))
  )
);

-- 4) Add folder fields into document_metadata (existing "documentos" equivalent)
ALTER TABLE public.document_metadata
  ADD COLUMN IF NOT EXISTS pasta_categoria text,
  ADD COLUMN IF NOT EXISTS subpasta text,
  ADD COLUMN IF NOT EXISTS caminho_completo text,
  ADD COLUMN IF NOT EXISTS drive_file_id text,
  ADD COLUMN IF NOT EXISTS ordem_na_pasta integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_document_metadata_pasta
  ON public.document_metadata(process_id, pasta_categoria, subpasta, ordem_na_pasta, created_at);

-- 5) Helper to compose root folder name
CREATE OR REPLACE FUNCTION public.make_process_folder_name(
  _numero text,
  _cliente text,
  _parte_contraria text,
  _tipo_acao text
)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  cliente_nome text := COALESCE(NULLIF(trim(_cliente), ''), 'Cliente');
  contraria_nome text := COALESCE(NULLIF(trim(_parte_contraria), ''), 'Parte Contraria');
  tipo_nome text := NULLIF(trim(COALESCE(_tipo_acao, '')), '');
  base_nome text;
BEGIN
  base_nome := format('Processo %s - %s vs %s', COALESCE(NULLIF(trim(_numero), ''), 'Sem Numero'), cliente_nome, contraria_nome);

  IF tipo_nome IS NOT NULL THEN
    base_nome := base_nome || ' - ' || tipo_nome;
  END IF;

  RETURN left(base_nome, 220);
END;
$$;

-- 6) Suggest category/subfolder from file name (simple heuristic)
CREATE OR REPLACE FUNCTION public.suggest_document_folder(_file_name text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  n text := lower(COALESCE(_file_name, ''));
BEGIN
  IF n LIKE '%peti%' OR n LIKE '%inicial%' THEN
    RETURN jsonb_build_object('pasta_categoria', '01 - Peticoes', 'subpasta', 'Inicial');
  ELSIF n LIKE '%contest%' THEN
    RETURN jsonb_build_object('pasta_categoria', '01 - Peticoes', 'subpasta', 'Contestacao');
  ELSIF n LIKE '%repl%' OR n ~ 'r.plic' THEN
    RETURN jsonb_build_object('pasta_categoria', '01 - Peticoes', 'subpasta', 'Replica');
  ELSIF n LIKE '%decis%' OR n LIKE '%despach%' THEN
    RETURN jsonb_build_object('pasta_categoria', '02 - Decisoes e Sentencas', 'subpasta', 'Despachos');
  ELSIF n LIKE '%senten%' THEN
    RETURN jsonb_build_object('pasta_categoria', '02 - Decisoes e Sentencas', 'subpasta', 'Sentenca');
  ELSIF n LIKE '%procura%' THEN
    RETURN jsonb_build_object('pasta_categoria', '03 - Documentos', 'subpasta', 'Procuracoes');
  ELSIF n LIKE '%rg%' OR n LIKE '%cpf%' THEN
    RETURN jsonb_build_object('pasta_categoria', '03 - Documentos', 'subpasta', 'RG e CPF');
  ELSIF n LIKE '%contrat%' THEN
    RETURN jsonb_build_object('pasta_categoria', '03 - Documentos', 'subpasta', 'Contratos');
  ELSE
    RETURN jsonb_build_object('pasta_categoria', '07 - Outros', 'subpasta', NULL);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.build_document_full_path(
  _process_id uuid,
  _pasta_categoria text,
  _subpasta text,
  _original_name text
)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  root_name text;
  category_name text := COALESCE(NULLIF(trim(_pasta_categoria), ''), '07 - Outros');
  sub_name text := NULLIF(trim(COALESCE(_subpasta, '')), '');
BEGIN
  SELECT df.nome_pasta INTO root_name
  FROM public.drive_folders df
  WHERE df.processo_id = _process_id
  LIMIT 1;

  root_name := COALESCE(root_name, 'Processo');

  IF sub_name IS NOT NULL THEN
    RETURN root_name || '/' || category_name || '/' || sub_name || '/' || COALESCE(_original_name, 'arquivo');
  END IF;

  RETURN root_name || '/' || category_name || '/' || COALESCE(_original_name, 'arquivo');
END;
$$;

-- 7) Trigger: keep document folder fields and full path consistent
CREATE OR REPLACE FUNCTION public.apply_document_folder_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  suggestion jsonb;
BEGIN
  suggestion := public.suggest_document_folder(NEW.original_name);

  IF NEW.pasta_categoria IS NULL OR trim(NEW.pasta_categoria) = '' THEN
    NEW.pasta_categoria := suggestion ->> 'pasta_categoria';
  END IF;

  IF NEW.subpasta IS NULL OR trim(NEW.subpasta) = '' THEN
    NEW.subpasta := NULLIF(suggestion ->> 'subpasta', '');
  END IF;

  IF NEW.ordem_na_pasta IS NULL
    OR NEW.ordem_na_pasta = 0
    OR (
      TG_OP = 'UPDATE'
      AND (
        OLD.pasta_categoria IS DISTINCT FROM NEW.pasta_categoria
        OR OLD.subpasta IS DISTINCT FROM NEW.subpasta
      )
    ) THEN
    SELECT COALESCE(MAX(ordem_na_pasta), 0) + 1
      INTO NEW.ordem_na_pasta
    FROM public.document_metadata
    WHERE process_id = NEW.process_id
      AND COALESCE(pasta_categoria, '') = COALESCE(NEW.pasta_categoria, '')
      AND COALESCE(subpasta, '') = COALESCE(NEW.subpasta, '')
      AND (TG_OP = 'INSERT' OR id <> NEW.id);
  END IF;

  NEW.caminho_completo := public.build_document_full_path(
    NEW.process_id,
    NEW.pasta_categoria,
    NEW.subpasta,
    NEW.original_name
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_document_folder_defaults ON public.document_metadata;
CREATE TRIGGER set_document_folder_defaults
BEFORE INSERT OR UPDATE ON public.document_metadata
FOR EACH ROW EXECUTE FUNCTION public.apply_document_folder_defaults();

-- 8) Trigger: create default folder structure automatically when process is created
CREATE OR REPLACE FUNCTION public.create_drive_folder_for_process()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  template_json jsonb;
  root_name text;
BEGIN
  SELECT estrutura_subpastas
    INTO template_json
  FROM public.file_structure_templates
  WHERE user_id = NEW.user_id
  LIMIT 1;

  template_json := COALESCE(template_json, public.default_drive_folder_structure());
  root_name := public.make_process_folder_name(NEW.numero, NEW.cliente, NEW.parte_contraria, NEW.tipo_acao);

  INSERT INTO public.drive_folders (processo_id, nome_pasta, estrutura_subpastas, sincronizado)
  VALUES (
    NEW.id,
    root_name,
    jsonb_set(template_json, '{raiz}', to_jsonb(root_name), true),
    false
  )
  ON CONFLICT (processo_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_drive_folder_after_process_insert ON public.processos;
CREATE TRIGGER create_drive_folder_after_process_insert
AFTER INSERT ON public.processos
FOR EACH ROW EXECUTE FUNCTION public.create_drive_folder_for_process();

-- 9) Trigger: updated timestamp for *_em naming
CREATE OR REPLACE FUNCTION public.update_atualizado_em_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_drive_folders_atualizado_em ON public.drive_folders;
CREATE TRIGGER update_drive_folders_atualizado_em
BEFORE UPDATE ON public.drive_folders
FOR EACH ROW EXECUTE FUNCTION public.update_atualizado_em_column();

DROP TRIGGER IF EXISTS update_file_templates_atualizado_em ON public.file_structure_templates;
CREATE TRIGGER update_file_templates_atualizado_em
BEFORE UPDATE ON public.file_structure_templates
FOR EACH ROW EXECUTE FUNCTION public.update_atualizado_em_column();

-- 10) Backfill drive_folders for existing processes
INSERT INTO public.drive_folders (processo_id, nome_pasta, estrutura_subpastas, sincronizado)
SELECT
  p.id,
  public.make_process_folder_name(p.numero, p.cliente, p.parte_contraria, p.tipo_acao),
  jsonb_set(
    COALESCE(ft.estrutura_subpastas, public.default_drive_folder_structure()),
    '{raiz}',
    to_jsonb(public.make_process_folder_name(p.numero, p.cliente, p.parte_contraria, p.tipo_acao)),
    true
  ),
  false
FROM public.processos p
LEFT JOIN public.file_structure_templates ft ON ft.user_id = p.user_id
LEFT JOIN public.drive_folders df ON df.processo_id = p.id
WHERE df.id IS NULL;

-- 11) Backfill old documents with suggested categories and full path
UPDATE public.document_metadata d
SET
  pasta_categoria = COALESCE(NULLIF(d.pasta_categoria, ''), s.sug ->> 'pasta_categoria'),
  subpasta = COALESCE(NULLIF(d.subpasta, ''), NULLIF(s.sug ->> 'subpasta', ''))
FROM LATERAL (SELECT public.suggest_document_folder(d.original_name) AS sug) s
WHERE d.pasta_categoria IS NULL OR d.pasta_categoria = '' OR d.subpasta IS NULL;

UPDATE public.document_metadata d
SET caminho_completo = public.build_document_full_path(d.process_id, d.pasta_categoria, d.subpasta, d.original_name);

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY process_id, COALESCE(pasta_categoria, ''), COALESCE(subpasta, '')
      ORDER BY created_at, id
    ) AS rn
  FROM public.document_metadata
)
UPDATE public.document_metadata d
SET ordem_na_pasta = ranked.rn
FROM ranked
WHERE d.id = ranked.id;
