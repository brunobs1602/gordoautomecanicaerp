CREATE OR REPLACE FUNCTION public.nome_sistema()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(NULLIF(btrim((SELECT data->'sistema'->>'nomeSistema' FROM public.configuracoes WHERE id = 1)), ''), 'Mecavon')
$$;
REVOKE ALL ON FUNCTION public.nome_sistema() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nome_sistema() TO anon, authenticated, service_role;