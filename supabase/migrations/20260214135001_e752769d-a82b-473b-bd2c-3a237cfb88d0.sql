
-- Tabela de perfis de usuários
CREATE TABLE public.perfis (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_escritorio TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile" ON public.perfis
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.perfis
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.perfis
  FOR INSERT WITH CHECK (auth.uid() = id);
