CREATE OR REPLACE FUNCTION public.eh_administrador()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_perfis up JOIN public.profiles p ON p.id = up.user_id
    WHERE up.user_id = auth.uid() AND up.perfil_id = 'admin' AND p.ativo
  )
$$;
REVOKE EXECUTE ON FUNCTION public.eh_administrador() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eh_administrador() TO authenticated;

-- Limpa os dados operacionais numa única transação: ou apaga tudo, ou nada.
-- Usuários, perfis, permissões, marcas, categorias, configurações e histórico NÃO são tocados.
CREATE OR REPLACE FUNCTION public.resetar_dados_operacionais()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r jsonb;
  n_orc int; n_os int; n_vei int; n_cli int; n_prod int; n_serv int;
  nome text;
BEGIN
  IF NOT public.eh_administrador() THEN
    RAISE EXCEPTION 'Somente o administrador pode limpar os dados.' USING ERRCODE = 'P0001';
  END IF;
  IF NOT pg_try_advisory_xact_lock(hashtext('gordo_reset_dados')) THEN
    RAISE EXCEPTION 'Já existe uma limpeza em andamento. Aguarde a conclusão.' USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*) FILTER (WHERE tipo <> 'os'), count(*) FILTER (WHERE tipo = 'os') INTO n_orc, n_os FROM orcamentos;
  SELECT count(*) INTO n_vei FROM veiculos;
  SELECT count(*) INTO n_cli FROM clientes;
  SELECT count(*) INTO n_prod FROM produtos;
  SELECT count(*) INTO n_serv FROM servicos;

  -- Dependentes primeiro, depois os principais.
  DELETE FROM orcamentos WHERE id IS NOT NULL;
  DELETE FROM veiculos WHERE id IS NOT NULL;
  DELETE FROM clientes WHERE id IS NOT NULL;
  DELETE FROM produtos WHERE id IS NOT NULL;
  DELETE FROM servicos WHERE id IS NOT NULL;

  r := jsonb_build_object('orcamentos', n_orc, 'ordens', n_os, 'veiculos', n_vei, 'clientes', n_cli,
    'produtos', n_prod, 'servicos', n_serv, 'estoque', n_prod, 'anexos', 0, 'data', now());

  SELECT p.nome INTO nome FROM profiles p WHERE p.id = auth.uid();
  INSERT INTO auditoria (admin_id, admin_nome, tipo, alvo, descricao, depois)
  VALUES (auth.uid(), coalesce(nome, ''), 'Reset de dados de teste', 'Sistema',
    format('Removidos: %s cliente(s), %s veículo(s), %s produto(s), %s serviço(s), %s orçamento(s), %s OS. Preservados: usuários, perfis, permissões, marcas, categorias, configurações e histórico.',
      n_cli, n_vei, n_prod, n_serv, n_orc, n_os),
    r::text);
  RETURN r;
END $$;
REVOKE EXECUTE ON FUNCTION public.resetar_dados_operacionais() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resetar_dados_operacionais() TO authenticated;