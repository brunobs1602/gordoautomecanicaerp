-- Renomeia o sistema para Mecavon e preserva a identidade das oficinas
-- Aplicada no Lovable Cloud pela extensão, com autorização do usuário.
-- Registrada por GeckoAI em 2026-10-29T20:42:43.400Z

CREATE OR REPLACE FUNCTION public.portal_ler(_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE l public.orc_links; o public.orcamentos; cli jsonb; vei public.veiculos; ap public.orc_aprovacoes; emp jsonb; valido boolean;
BEGIN
  IF _token IS NULL OR _token !~ '^[a-f0-9]{64}$' THEN RETURN jsonb_build_object('erro','invalido'); END IF;
  SELECT * INTO l FROM public.orc_links WHERE token = _token;
  IF NOT FOUND THEN RETURN jsonb_build_object('erro','invalido'); END IF;
  IF NOT public.portal_ativo() THEN RETURN jsonb_build_object('erro','desativado'); END IF;
  SELECT * INTO o FROM public.orcamentos WHERE id = l.orcamento_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('erro','invalido'); END IF;
  SELECT data INTO cli FROM public.clientes WHERE id = o.cliente_id;
  SELECT * INTO vei FROM public.veiculos WHERE id = o.veiculo_id;
  SELECT * INTO ap FROM public.orc_aprovacoes WHERE link_id = l.id;
  SELECT data->'empresa' INTO emp FROM public.configuracoes WHERE id = 1;
  valido := public.orc_valido(o.data->>'validade');
  RETURN jsonb_build_object(
    'codigo', COALESCE((SELECT data->'orcamentos'->>'prefixoOrc' FROM public.configuracoes WHERE id = 1),'ORC') || '-' || lpad(o.numero::text, 5, '0'),
    'versao', o.atualizado_em,
    'emitidoEm', o.data->>'criadoEm',
    'validade', COALESCE(o.data->>'validade',''),
    'valido', valido,
    'linkAtivo', l.ativo,
    'status', o.status,
    'podeAprovar', l.ativo AND valido AND ap.id IS NULL AND o.status = 'aguardando' AND o.tipo = 'orcamento',
    'cliente', jsonb_build_object('nome', COALESCE(cli->>'nome','')),
    'veiculo', CASE WHEN vei.id IS NULL THEN NULL ELSE jsonb_build_object('placa', vei.placa, 'marca', COALESCE(vei.data->>'marca',''),
       'modelo', COALESCE(vei.data->>'modelo',''), 'ano', COALESCE(vei.data->>'anoModelo',''), 'km', COALESCE(o.data->>'quilometragem','')) END,
    'problema', COALESCE(o.data->>'problema',''),
    'diagnostico', COALESCE(o.data->>'diagnostico',''),
    'obsCliente', COALESCE(o.data->>'obsCliente',''),
    'condicoesPagamento', COALESCE(o.data->>'condicoesPagamento',''),
    'itens', public.orc_itens_calc(o.data),
    'imagens', COALESCE((SELECT jsonb_agg(im->>'caminho') FROM jsonb_array_elements(COALESCE(o.data->'imagens','[]'::jsonb)) im), '[]'::jsonb),
    'empresa', jsonb_build_object('nome', COALESCE(emp->>'nomeFantasia','Mecavon'), 'telefone', COALESCE(emp->>'telefone',''),
       'whatsapp', COALESCE(emp->>'whatsapp',''), 'email', COALESCE(emp->>'email',''),
       'endereco', concat_ws(', ', NULLIF(emp->>'logradouro',''), NULLIF(emp->>'numero',''), NULLIF(emp->>'bairro',''), NULLIF(emp->>'cidade',''), NULLIF(emp->>'estado','')),
       'logo', COALESCE(NULLIF(emp->>'logoDocs',''), NULLIF(emp->>'logo',''), '')),
    'aprovacao', CASE WHEN ap.id IS NULL THEN NULL ELSE jsonb_build_object('respondidoEm', ap.respondido_em, 'itens', ap.itens,
       'totalAprovado', ap.total_aprovado, 'totalRecusado', ap.total_recusado, 'observacao', ap.observacao) END
  );
END $function$;

CREATE OR REPLACE FUNCTION public.portal_minha_conta()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE c public.portal_contas; cli jsonb;
BEGIN
  SELECT * INTO c FROM public.portal_contas WHERE user_id = auth.uid();
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF NOT c.ativo THEN RETURN jsonb_build_object('erro','inativa'); END IF;
  UPDATE public.portal_contas SET ultimo_acesso = now() WHERE user_id = c.user_id;
  SELECT data INTO cli FROM public.clientes WHERE id = c.cliente_id;
  RETURN jsonb_build_object('nome', COALESCE(NULLIF(c.nome,''), cli->>'nome', ''), 'email', c.email,
    'empresa', COALESCE((SELECT data->'empresa'->>'nomeFantasia' FROM public.configuracoes WHERE id = 1), 'Mecavon'));
END $function$;
