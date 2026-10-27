ALTER TABLE public.orc_aprovacoes ADD COLUMN IF NOT EXISTS observacao text NOT NULL DEFAULT '';
ALTER TABLE public.orc_aprovacoes ADD COLUMN IF NOT EXISTS conta_id uuid;

CREATE TABLE public.portal_contas (
  user_id uuid PRIMARY KEY,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT '',
  email text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  ultimo_acesso timestamptz
);
GRANT SELECT ON public.portal_contas TO authenticated;
GRANT ALL ON public.portal_contas TO service_role;
ALTER TABLE public.portal_contas ENABLE ROW LEVEL SECURITY;
CREATE POLICY portal_contas_ler ON public.portal_contas FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.tem_permissao('usuarios','ver'));
CREATE INDEX portal_contas_cliente ON public.portal_contas(cliente_id);

CREATE OR REPLACE FUNCTION public.portal_minha_conta() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.portal_contas; cli jsonb;
BEGIN
  SELECT * INTO c FROM public.portal_contas WHERE user_id = auth.uid();
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF NOT c.ativo THEN RETURN jsonb_build_object('erro','inativa'); END IF;
  UPDATE public.portal_contas SET ultimo_acesso = now() WHERE user_id = c.user_id;
  SELECT data INTO cli FROM public.clientes WHERE id = c.cliente_id;
  RETURN jsonb_build_object('nome', COALESCE(NULLIF(c.nome,''), cli->>'nome', ''), 'email', c.email,
    'empresa', COALESCE((SELECT data->'empresa'->>'nomeFantasia' FROM public.configuracoes WHERE id = 1), 'Gordo Auto Mecânica'));
END $$;
GRANT EXECUTE ON FUNCTION public.portal_minha_conta() TO authenticated;

CREATE OR REPLACE FUNCTION public.portal_meus_orcamentos() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.portal_contas; pref text;
BEGIN
  SELECT * INTO c FROM public.portal_contas WHERE user_id = auth.uid() AND ativo;
  IF NOT FOUND THEN RAISE EXCEPTION 'Acesso ao portal não liberado.'; END IF;
  pref := COALESCE((SELECT data->'orcamentos'->>'prefixoOrc' FROM public.configuracoes WHERE id = 1),'ORC');
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', o.id,
      'codigo', pref || '-' || lpad(o.numero::text, 5, '0'),
      'veiculo', CASE WHEN v.id IS NULL THEN '' ELSE concat_ws(' ', NULLIF(v.data->>'marca',''), NULLIF(v.data->>'modelo',''), '· ' || v.placa) END,
      'emitidoEm', o.data->>'criadoEm',
      'validade', COALESCE(o.data->>'validade',''),
      'total', (SELECT COALESCE(sum((i->>'subtotal')::numeric),0) FROM jsonb_array_elements(public.orc_itens_calc(o.data)) i),
      'situacao', CASE
        WHEN ap.id IS NOT NULL AND ap.total_aprovado > 0 AND ap.total_recusado > 0 THEN 'parcial'
        WHEN ap.id IS NOT NULL AND ap.total_aprovado > 0 THEN 'aprovado'
        WHEN ap.id IS NOT NULL THEN 'recusado'
        WHEN o.status = 'recusado' THEN 'recusado'
        WHEN o.status = 'aguardando' AND NOT public.orc_valido(o.data->>'validade') THEN 'vencido'
        WHEN o.status = 'aguardando' THEN 'aguardando'
        WHEN NOT public.orc_valido(o.data->>'validade') THEN 'vencido'
        ELSE 'aprovado' END
    ) ORDER BY o.criado_em DESC)
    FROM public.orcamentos o
    LEFT JOIN public.veiculos v ON v.id = o.veiculo_id
    LEFT JOIN LATERAL (SELECT a.* FROM public.orc_aprovacoes a WHERE a.orcamento_id = o.id ORDER BY a.respondido_em DESC LIMIT 1) ap ON true
    WHERE o.cliente_id = c.cliente_id AND EXISTS (SELECT 1 FROM public.orc_links l WHERE l.orcamento_id = o.id)
  ), '[]'::jsonb);
END $$;
GRANT EXECUTE ON FUNCTION public.portal_meus_orcamentos() TO authenticated;

CREATE OR REPLACE FUNCTION public.portal_abrir_orcamento(_orc uuid) RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.portal_contas; tk text;
BEGIN
  SELECT * INTO c FROM public.portal_contas WHERE user_id = auth.uid() AND ativo;
  IF NOT FOUND THEN RAISE EXCEPTION 'Acesso ao portal não liberado.'; END IF;
  SELECT l.token INTO tk FROM public.orc_links l JOIN public.orcamentos o ON o.id = l.orcamento_id
    WHERE o.id = _orc AND o.cliente_id = c.cliente_id ORDER BY l.ativo DESC, l.criado_em DESC LIMIT 1;
  IF tk IS NULL THEN RAISE EXCEPTION 'Orçamento não encontrado.'; END IF;
  RETURN tk;
END $$;
GRANT EXECUTE ON FUNCTION public.portal_abrir_orcamento(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.portal_vincular(_token text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cli uuid; c public.portal_contas; em text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Entre na sua conta primeiro.'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()) THEN RAISE EXCEPTION 'Contas da equipe interna não podem ser usadas no portal do cliente.'; END IF;
  IF NOT public.portal_ativo() THEN RAISE EXCEPTION 'O portal está indisponível.'; END IF;
  SELECT o.cliente_id INTO cli FROM public.orc_links l JOIN public.orcamentos o ON o.id = l.orcamento_id WHERE l.token = _token;
  IF cli IS NULL THEN RAISE EXCEPTION 'Link inválido.'; END IF;
  SELECT * INTO c FROM public.portal_contas WHERE user_id = auth.uid();
  IF FOUND THEN
    IF NOT c.ativo THEN RAISE EXCEPTION 'Seu acesso ao portal está desativado. Fale com a oficina.'; END IF;
    IF c.cliente_id <> cli THEN RAISE EXCEPTION 'Este orçamento pertence a outro cadastro. Fale com a oficina.'; END IF;
    RETURN jsonb_build_object('ok', true);
  END IF;
  SELECT email INTO em FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.portal_contas(user_id, cliente_id, email, nome) VALUES (auth.uid(), cli, COALESCE(em,''), '');
  RETURN jsonb_build_object('ok', true);
END $$;
GRANT EXECUTE ON FUNCTION public.portal_vincular(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.portal_conta_ativar(_user uuid, _ativo boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.portal_contas; nome text;
BEGIN
  IF NOT public.tem_permissao('usuarios','editar') THEN RAISE EXCEPTION 'Sem permissão.'; END IF;
  SELECT * INTO c FROM public.portal_contas WHERE user_id = _user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conta não encontrada.'; END IF;
  UPDATE public.portal_contas SET ativo = _ativo WHERE user_id = _user;
  SELECT COALESCE(NULLIF(p.nome,''), p.email) INTO nome FROM public.profiles p WHERE p.id = auth.uid();
  INSERT INTO public.auditoria(admin_id, admin_nome, tipo, alvo, descricao, antes, depois)
    VALUES (auth.uid(), COALESCE(nome,'—'), 'portal', c.email,
      CASE WHEN _ativo THEN 'Acesso ao portal reativado' ELSE 'Acesso ao portal desativado' END,
      CASE WHEN c.ativo THEN 'ativo' ELSE 'inativo' END, CASE WHEN _ativo THEN 'ativo' ELSE 'inativo' END);
END $$;
GRANT EXECUTE ON FUNCTION public.portal_conta_ativar(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.portal_ler(_token text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
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
    'empresa', jsonb_build_object('nome', COALESCE(emp->>'nomeFantasia','Gordo Auto Mecânica'), 'telefone', COALESCE(emp->>'telefone',''),
       'whatsapp', COALESCE(emp->>'whatsapp',''), 'email', COALESCE(emp->>'email',''),
       'endereco', concat_ws(', ', NULLIF(emp->>'logradouro',''), NULLIF(emp->>'numero',''), NULLIF(emp->>'bairro',''), NULLIF(emp->>'cidade',''), NULLIF(emp->>'estado','')),
       'logo', COALESCE(NULLIF(emp->>'logoDocs',''), NULLIF(emp->>'logo',''), '')),
    'aprovacao', CASE WHEN ap.id IS NULL THEN NULL ELSE jsonb_build_object('respondidoEm', ap.respondido_em, 'itens', ap.itens,
       'totalAprovado', ap.total_aprovado, 'totalRecusado', ap.total_recusado, 'observacao', ap.observacao) END
  );
END $$;

CREATE OR REPLACE FUNCTION public.portal_confirmar(_token text, _aprovados text[], _versao timestamptz, _obs text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l public.orc_links; o public.orcamentos; itens jsonb; marcados jsonb; tot_a numeric; tot_r numeric; n_a int; n_r int; novo text; ev jsonb;
BEGIN
  _obs := btrim(COALESCE(_obs,''));
  IF length(_obs) > 1000 THEN RAISE EXCEPTION 'As observações podem ter no máximo 1000 caracteres.'; END IF;
  IF _token IS NULL OR _token !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Link inválido.'; END IF;
  SELECT * INTO l FROM public.orc_links WHERE token = _token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Link inválido.'; END IF;
  IF NOT public.portal_ativo() THEN RAISE EXCEPTION 'A aprovação online está indisponível. Entre em contato com a oficina.'; END IF;
  IF NOT l.ativo THEN RAISE EXCEPTION 'Este link foi substituído. Peça um novo link à oficina.'; END IF;
  IF EXISTS (SELECT 1 FROM public.orc_aprovacoes WHERE link_id = l.id) THEN RAISE EXCEPTION 'Sua resposta já foi registrada.'; END IF;
  SELECT * INTO o FROM public.orcamentos WHERE id = l.orcamento_id FOR UPDATE;
  IF o.tipo <> 'orcamento' OR o.status <> 'aguardando' THEN RAISE EXCEPTION 'Este orçamento não está mais aguardando aprovação.'; END IF;
  IF NOT public.orc_valido(o.data->>'validade') THEN RAISE EXCEPTION 'O prazo de aprovação deste orçamento expirou. Entre em contato com a oficina.'; END IF;
  IF _versao IS NULL OR o.atualizado_em <> _versao THEN RAISE EXCEPTION 'O orçamento foi atualizado pela oficina. Recarregue a página para ver os valores atuais.'; END IF;
  itens := public.orc_itens_calc(o.data);
  IF jsonb_array_length(itens) = 0 THEN RAISE EXCEPTION 'Este orçamento não possui itens.'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(COALESCE(_aprovados,'{}')) a WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(itens) i WHERE i->>'id' = a)) THEN
    RAISE EXCEPTION 'Seleção inválida. Recarregue a página.';
  END IF;
  SELECT jsonb_agg(i || jsonb_build_object('aprovado', (i->>'id') = ANY(COALESCE(_aprovados,'{}')))) INTO marcados FROM jsonb_array_elements(itens) i;
  SELECT COALESCE(sum((i->>'subtotal')::numeric) FILTER (WHERE (i->>'aprovado')::boolean),0),
         COALESCE(sum((i->>'subtotal')::numeric) FILTER (WHERE NOT (i->>'aprovado')::boolean),0),
         count(*) FILTER (WHERE (i->>'aprovado')::boolean), count(*) FILTER (WHERE NOT (i->>'aprovado')::boolean)
    INTO tot_a, tot_r, n_a, n_r FROM jsonb_array_elements(marcados) i;
  INSERT INTO public.orc_aprovacoes(orcamento_id, link_id, itens, total_aprovado, total_recusado, observacao, conta_id)
    VALUES (o.id, l.id, marcados, tot_a, tot_r, _obs, (SELECT c.user_id FROM public.portal_contas c WHERE c.user_id = auth.uid()));
  novo := CASE WHEN n_a > 0 THEN 'aprovado' ELSE 'recusado' END;
  ev := jsonb_build_object('id', gen_random_uuid(), 'data', to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'usuario', CASE WHEN EXISTS (SELECT 1 FROM public.portal_contas c WHERE c.user_id = auth.uid()) THEN 'Cliente (conta)' ELSE 'Cliente (link)' END, 'acao', 'Resposta do cliente pelo link', 'statusAnterior', o.status, 'statusNovo', novo,
    'detalhes', jsonb_build_array(
      format('Aprovados: %s item(ns) · R$ %s', n_a, replace(to_char(tot_a,'FM999999990.00'),'.',',')),
      format('Recusados: %s item(ns) · R$ %s', n_r, replace(to_char(tot_r,'FM999999990.00'),'.',',')))
      || CASE WHEN _obs <> '' THEN jsonb_build_array('Observações do cliente: ' || _obs) ELSE '[]'::jsonb END);
  UPDATE public.orcamentos SET status = novo,
    data = jsonb_set(jsonb_set(data, '{status}', to_jsonb(novo)), '{historico}', COALESCE(data->'historico','[]'::jsonb) || ev),
    atualizado_em = now()
  WHERE id = o.id;
  RETURN jsonb_build_object('ok', true, 'status', novo, 'totalAprovado', tot_a);
END $$;
GRANT EXECUTE ON FUNCTION public.portal_confirmar(text, text[], timestamptz, text) TO anon, authenticated;
