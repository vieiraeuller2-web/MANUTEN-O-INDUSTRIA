ALTER TABLE public.notas_fiscais 
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS data_conclusao date,
  ADD COLUMN IF NOT EXISTS observacao text;