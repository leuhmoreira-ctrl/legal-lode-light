-- Index para buscar última movimentação rapidamente
CREATE INDEX IF NOT EXISTS idx_movimentacoes_processo_data 
ON movimentacoes(processo_id, data_movimento DESC);

-- Index para ordenação de processos
CREATE INDEX IF NOT EXISTS idx_processos_user_created 
ON processos(user_id, created_at DESC);