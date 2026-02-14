
-- Workflows table
CREATE TABLE public.workflows (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo text NOT NULL,
  tipo_documento text NOT NULL DEFAULT 'outro',
  processo_id uuid REFERENCES public.processos(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'rascunho',
  criador_id uuid NOT NULL,
  prazo_final date,
  urgencia text NOT NULL DEFAULT 'normal',
  descricao text,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View workflows" ON public.workflows FOR SELECT
  USING (criador_id = auth.uid() OR is_admin_or_senior(auth.uid()));

CREATE POLICY "Insert workflows" ON public.workflows FOR INSERT
  WITH CHECK (auth.uid() = criador_id);

CREATE POLICY "Update workflows" ON public.workflows FOR UPDATE
  USING (criador_id = auth.uid() OR is_admin_or_senior(auth.uid()));

CREATE POLICY "Delete workflows" ON public.workflows FOR DELETE
  USING (criador_id = auth.uid() OR is_admin_or_senior(auth.uid()));

-- Workflow etapas
CREATE TABLE public.workflow_etapas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 0,
  nome text NOT NULL,
  responsavel_id uuid,
  status text NOT NULL DEFAULT 'pendente',
  prazo_dias integer DEFAULT 3,
  concluido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_etapas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View etapas" ON public.workflow_etapas FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.workflows w WHERE w.id = workflow_id AND (w.criador_id = auth.uid() OR is_admin_or_senior(auth.uid()))));

CREATE POLICY "Manage etapas" ON public.workflow_etapas FOR ALL
  USING (EXISTS (SELECT 1 FROM public.workflows w WHERE w.id = workflow_id AND (w.criador_id = auth.uid() OR is_admin_or_senior(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workflows w WHERE w.id = workflow_id AND (w.criador_id = auth.uid() OR is_admin_or_senior(auth.uid()))));

-- Workflow versoes
CREATE TABLE public.workflow_versoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  numero_versao integer NOT NULL DEFAULT 1,
  conteudo text,
  autor_id uuid NOT NULL,
  motivo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_versoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View versoes" ON public.workflow_versoes FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.workflows w WHERE w.id = workflow_id AND (w.criador_id = auth.uid() OR is_admin_or_senior(auth.uid()))));

CREATE POLICY "Insert versoes" ON public.workflow_versoes FOR INSERT
  WITH CHECK (auth.uid() = autor_id);

-- Workflow comentarios
CREATE TABLE public.workflow_comentarios (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  autor_id uuid NOT NULL,
  texto text NOT NULL,
  tipo text NOT NULL DEFAULT 'geral',
  posicao_texto integer,
  parent_id uuid REFERENCES public.workflow_comentarios(id) ON DELETE CASCADE,
  resolvido boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_comentarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View comentarios" ON public.workflow_comentarios FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.workflows w WHERE w.id = workflow_id AND (w.criador_id = auth.uid() OR is_admin_or_senior(auth.uid()))));

CREATE POLICY "Insert comentarios" ON public.workflow_comentarios FOR INSERT
  WITH CHECK (auth.uid() = autor_id);

CREATE POLICY "Update comentarios" ON public.workflow_comentarios FOR UPDATE
  USING (auth.uid() = autor_id);

CREATE POLICY "Delete comentarios" ON public.workflow_comentarios FOR DELETE
  USING (auth.uid() = autor_id);

-- Workflow acoes
CREATE TABLE public.workflow_acoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  etapa_id uuid REFERENCES public.workflow_etapas(id) ON DELETE SET NULL,
  usuario_id uuid NOT NULL,
  acao text NOT NULL,
  comentario text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_acoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View acoes" ON public.workflow_acoes FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.workflows w WHERE w.id = workflow_id AND (w.criador_id = auth.uid() OR is_admin_or_senior(auth.uid()))));

CREATE POLICY "Insert acoes" ON public.workflow_acoes FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

-- Workflow regras
CREATE TABLE public.workflow_regras (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  condicoes jsonb NOT NULL DEFAULT '{}',
  atribuicoes jsonb NOT NULL DEFAULT '{}',
  prioridade integer NOT NULL DEFAULT 5,
  ativa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_regras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View regras" ON public.workflow_regras FOR SELECT
  USING (true);

CREATE POLICY "Manage regras" ON public.workflow_regras FOR ALL
  USING (is_admin_or_senior(auth.uid()))
  WITH CHECK (is_admin_or_senior(auth.uid()));

-- Also allow participants (responsavel_id) to view workflows and etapas
CREATE POLICY "Participants view workflows" ON public.workflows FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.workflow_etapas e WHERE e.workflow_id = id AND e.responsavel_id = auth.uid()));

CREATE POLICY "Participants view etapas" ON public.workflow_etapas FOR SELECT
  USING (responsavel_id = auth.uid());

CREATE POLICY "Participants update etapas" ON public.workflow_etapas FOR UPDATE
  USING (responsavel_id = auth.uid());

-- Participants can also view related sub-tables
CREATE POLICY "Participants view versoes" ON public.workflow_versoes FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.workflow_etapas e WHERE e.workflow_id = workflow_id AND e.responsavel_id = auth.uid()));

CREATE POLICY "Participants view comentarios" ON public.workflow_comentarios FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.workflow_etapas e WHERE e.workflow_id = workflow_id AND e.responsavel_id = auth.uid()));

CREATE POLICY "Participants view acoes" ON public.workflow_acoes FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.workflow_etapas e WHERE e.workflow_id = workflow_id AND e.responsavel_id = auth.uid()));

-- Participants can insert comments and actions
CREATE POLICY "Participants insert comentarios" ON public.workflow_comentarios FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.workflow_etapas e WHERE e.workflow_id = workflow_id AND e.responsavel_id = auth.uid()));

CREATE POLICY "Participants insert acoes" ON public.workflow_acoes FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.workflow_etapas e WHERE e.workflow_id = workflow_id AND e.responsavel_id = auth.uid()));

CREATE POLICY "Participants insert versoes" ON public.workflow_versoes FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.workflow_etapas e WHERE e.workflow_id = workflow_id AND e.responsavel_id = auth.uid()));

-- Indexes
CREATE INDEX idx_workflows_criador ON public.workflows(criador_id);
CREATE INDEX idx_workflows_status ON public.workflows(status);
CREATE INDEX idx_workflows_processo ON public.workflows(processo_id);
CREATE INDEX idx_workflow_etapas_workflow ON public.workflow_etapas(workflow_id);
CREATE INDEX idx_workflow_etapas_responsavel ON public.workflow_etapas(responsavel_id);
CREATE INDEX idx_workflow_versoes_workflow ON public.workflow_versoes(workflow_id);
CREATE INDEX idx_workflow_comentarios_workflow ON public.workflow_comentarios(workflow_id);
CREATE INDEX idx_workflow_acoes_workflow ON public.workflow_acoes(workflow_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflows;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_etapas;

-- Trigger for updated_at
CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON public.workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
