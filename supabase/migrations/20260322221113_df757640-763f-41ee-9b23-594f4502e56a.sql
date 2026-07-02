-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Ordens de Serviço
CREATE TABLE public.ordens_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imagem_url TEXT NOT NULL,
  equipamento TEXT NOT NULL,
  horimetro NUMERIC NOT NULL,
  area TEXT NOT NULL,
  responsavel TEXT NOT NULL,
  data_inicio DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  manutencao_tipo TEXT NOT NULL CHECK (manutencao_tipo IN ('preventiva', 'corretiva')),
  setor TEXT NOT NULL,
  data_conclusao DATE,
  hora_conclusao TIME,
  observacoes TEXT,
  confianca_leitura NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to ordens_servico" ON public.ordens_servico FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_ordens_servico_updated_at
  BEFORE UPDATE ON public.ordens_servico
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Preventivas
CREATE TABLE public.preventivas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento TEXT NOT NULL,
  setor TEXT NOT NULL,
  descricao TEXT NOT NULL,
  data_prevista DATE NOT NULL,
  responsavel TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.preventivas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to preventivas" ON public.preventivas FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_preventivas_updated_at
  BEFORE UPDATE ON public.preventivas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notas Fiscais
CREATE TABLE public.notas_fiscais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_nf TEXT NOT NULL,
  data_nf DATE NOT NULL,
  referente_a TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to notas_fiscais" ON public.notas_fiscais FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_notas_fiscais_updated_at
  BEFORE UPDATE ON public.notas_fiscais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for OS images
INSERT INTO storage.buckets (id, name, public) VALUES ('os-images', 'os-images', true);

CREATE POLICY "Anyone can view OS images" ON storage.objects FOR SELECT USING (bucket_id = 'os-images');
CREATE POLICY "Anyone can upload OS images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'os-images');
CREATE POLICY "Anyone can update OS images" ON storage.objects FOR UPDATE USING (bucket_id = 'os-images');
CREATE POLICY "Anyone can delete OS images" ON storage.objects FOR DELETE USING (bucket_id = 'os-images');