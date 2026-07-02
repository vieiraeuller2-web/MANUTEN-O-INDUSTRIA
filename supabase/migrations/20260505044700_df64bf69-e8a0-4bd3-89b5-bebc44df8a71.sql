
-- Drop permissive policies on tables and replace with authenticated-only policies
DROP POLICY IF EXISTS "Allow all access to ordens_servico" ON public.ordens_servico;
DROP POLICY IF EXISTS "Allow all access to preventivas" ON public.preventivas;
DROP POLICY IF EXISTS "Allow all access to notas_fiscais" ON public.notas_fiscais;
DROP POLICY IF EXISTS "Allow all access to os_escaneadas" ON public.os_escaneadas;

CREATE POLICY "Authenticated full access" ON public.ordens_servico
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access" ON public.preventivas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access" ON public.notas_fiscais
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access" ON public.os_escaneadas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Storage bucket os-images: keep public read, restrict writes to authenticated
DROP POLICY IF EXISTS "Anyone can view OS images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload OS images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update OS images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete OS images" ON storage.objects;

CREATE POLICY "Public read os-images" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'os-images');

CREATE POLICY "Authenticated upload os-images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'os-images');

CREATE POLICY "Authenticated update os-images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'os-images');

CREATE POLICY "Authenticated delete os-images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'os-images');
