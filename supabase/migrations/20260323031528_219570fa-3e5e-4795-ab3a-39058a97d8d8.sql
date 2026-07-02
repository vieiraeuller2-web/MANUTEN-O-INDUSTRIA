ALTER TABLE public.preventivas 
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS data_conclusao date,
  ADD COLUMN IF NOT EXISTS observacao_baixa text;