
-- 1. Table for client communication tracking
CREATE TABLE public.processo_comunicacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  processo_id UUID NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  data_comunicacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  meio TEXT NOT NULL DEFAULT 'email',
  resumo TEXT,
  responsavel_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.processo_comunicacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View comunicacoes via processo access" ON public.processo_comunicacoes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM processos p WHERE p.id = processo_comunicacoes.processo_id AND (p.user_id = auth.uid() OR p.advogado_id = auth.uid() OR is_admin_or_senior(auth.uid())))
  );

CREATE POLICY "Insert comunicacoes" ON public.processo_comunicacoes
  FOR INSERT WITH CHECK (auth.uid() = responsavel_id);

CREATE POLICY "Delete own comunicacoes" ON public.processo_comunicacoes
  FOR DELETE USING (auth.uid() = responsavel_id);

-- 2. Table for process notes
CREATE TABLE public.processo_notas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  processo_id UUID NOT NULL UNIQUE REFERENCES public.processos(id) ON DELETE CASCADE,
  conteudo TEXT NOT NULL DEFAULT '',
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.processo_notas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View notas via processo access" ON public.processo_notas
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM processos p WHERE p.id = processo_notas.processo_id AND (p.user_id = auth.uid() OR p.advogado_id = auth.uid() OR is_admin_or_senior(auth.uid())))
  );

CREATE POLICY "Upsert notas" ON public.processo_notas
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM processos p WHERE p.id = processo_notas.processo_id AND (p.user_id = auth.uid() OR p.advogado_id = auth.uid() OR is_admin_or_senior(auth.uid())))
  );

CREATE POLICY "Update notas" ON public.processo_notas
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM processos p WHERE p.id = processo_notas.processo_id AND (p.user_id = auth.uid() OR p.advogado_id = auth.uid() OR is_admin_or_senior(auth.uid())))
  );

-- 3. Table for manual process actions (resets "days stalled" counter)
CREATE TABLE public.processo_acoes_manuais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  processo_id UUID NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  data_acao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responsavel_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.processo_acoes_manuais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View acoes manuais via processo access" ON public.processo_acoes_manuais
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM processos p WHERE p.id = processo_acoes_manuais.processo_id AND (p.user_id = auth.uid() OR p.advogado_id = auth.uid() OR is_admin_or_senior(auth.uid())))
  );

CREATE POLICY "Insert acoes manuais" ON public.processo_acoes_manuais
  FOR INSERT WITH CHECK (auth.uid() = responsavel_id);

-- 4. Add columns to kanban_tasks for "mark for today" and "observations"
ALTER TABLE public.kanban_tasks
  ADD COLUMN IF NOT EXISTS marked_for_today BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marked_for_today_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.processo_comunicacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.processo_notas;
