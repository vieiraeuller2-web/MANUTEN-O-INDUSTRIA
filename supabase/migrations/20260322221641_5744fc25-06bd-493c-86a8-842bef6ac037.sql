CREATE TABLE public.os_escaneadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imagem_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.os_escaneadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to os_escaneadas" ON public.os_escaneadas FOR ALL USING (true) WITH CHECK (true);