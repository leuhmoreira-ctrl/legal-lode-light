
-- Tabela de processos
CREATE TABLE public.processos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  numero VARCHAR(30) NOT NULL,
  comarca VARCHAR(100) NOT NULL,
  vara VARCHAR(100) NOT NULL,
  cliente VARCHAR(200) NOT NULL,
  parte_contraria VARCHAR(200),
  advogado VARCHAR(200) NOT NULL,
  tipo_acao VARCHAR(100),
  valor_causa NUMERIC(15,2) DEFAULT 0,
  fase VARCHAR(20) DEFAULT 'Conhecimento',
  tags TEXT[] DEFAULT '{}',
  data_distribuicao DATE,
  ultima_movimentacao DATE,
  descricao_movimentacao TEXT,
  sistema_tribunal VARCHAR(20),
  sigla_tribunal VARCHAR(10),
  data_ultima_sincronizacao TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.processos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own processos" ON public.processos
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own processos" ON public.processos
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own processos" ON public.processos
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own processos" ON public.processos
  FOR DELETE USING (auth.uid() = user_id);

-- Tabela de movimentações
CREATE TABLE public.movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID REFERENCES public.processos(id) ON DELETE CASCADE NOT NULL,
  data_movimento TIMESTAMP WITH TIME ZONE NOT NULL,
  descricao TEXT NOT NULL,
  complemento TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_movimentacoes_processo ON public.movimentacoes(processo_id);
CREATE INDEX idx_movimentacoes_data ON public.movimentacoes(data_movimento DESC);

ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own movimentacoes" ON public.movimentacoes
  FOR SELECT USING (
    processo_id IN (SELECT id FROM public.processos WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can insert own movimentacoes" ON public.movimentacoes
  FOR INSERT WITH CHECK (
    processo_id IN (SELECT id FROM public.processos WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can delete own movimentacoes" ON public.movimentacoes
  FOR DELETE USING (
    processo_id IN (SELECT id FROM public.processos WHERE user_id = auth.uid())
  );

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_processos_updated_at
  BEFORE UPDATE ON public.processos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
