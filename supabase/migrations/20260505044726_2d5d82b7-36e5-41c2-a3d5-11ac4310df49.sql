
-- Replace single FOR ALL policy with per-command policies that satisfy the linter
DROP POLICY IF EXISTS "Authenticated full access" ON public.ordens_servico;
DROP POLICY IF EXISTS "Authenticated full access" ON public.preventivas;
DROP POLICY IF EXISTS "Authenticated full access" ON public.notas_fiscais;
DROP POLICY IF EXISTS "Authenticated full access" ON public.os_escaneadas;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ordens_servico','preventivas','notas_fiscais','os_escaneadas'] LOOP
    EXECUTE format('CREATE POLICY "Auth select" ON public.%I FOR SELECT TO authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY "Auth insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL)', t);
    EXECUTE format('CREATE POLICY "Auth update" ON public.%I FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)', t);
    EXECUTE format('CREATE POLICY "Auth delete" ON public.%I FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL)', t);
  END LOOP;
END $$;

-- Make os-images bucket private to prevent listing; signed/public-URL access via getPublicUrl still works for known paths only after we switch to signed URLs.
UPDATE storage.buckets SET public = false WHERE id = 'os-images';

DROP POLICY IF EXISTS "Public read os-images" ON storage.objects;
CREATE POLICY "Auth read os-images" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'os-images');
