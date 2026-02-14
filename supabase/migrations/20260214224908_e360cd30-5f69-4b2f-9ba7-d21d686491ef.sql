-- First remove existing duplicates keeping only the earliest entry
DELETE FROM public.movimentacoes a
USING public.movimentacoes b
WHERE a.id > b.id
  AND a.processo_id = b.processo_id
  AND a.data_movimento = b.data_movimento
  AND a.descricao = b.descricao;

-- Add unique constraint to prevent future duplicates
ALTER TABLE public.movimentacoes
ADD CONSTRAINT movimentacoes_unique_entry UNIQUE (processo_id, data_movimento, descricao);