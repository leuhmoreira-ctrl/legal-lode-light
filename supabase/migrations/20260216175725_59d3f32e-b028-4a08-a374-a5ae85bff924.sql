
-- Create clientes table
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'pf',
  nome TEXT NOT NULL,
  cpf_cnpj TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users view own clientes" ON public.clientes
  FOR SELECT USING (user_id = auth.uid() OR is_admin_or_senior(auth.uid()));

CREATE POLICY "Users insert own clientes" ON public.clientes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own clientes" ON public.clientes
  FOR UPDATE USING (user_id = auth.uid() OR is_admin_or_senior(auth.uid()));

CREATE POLICY "Users delete own clientes" ON public.clientes
  FOR DELETE USING (user_id = auth.uid() OR is_admin_or_senior(auth.uid()));

-- Timestamp trigger
CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
