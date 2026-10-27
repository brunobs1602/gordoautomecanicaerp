-- Links do portal do cliente (um token secreto por link)
CREATE TABLE public.orc_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id uuid NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  criado_por uuid,
  criado_por_nome text NOT NULL DEFAULT ''
);
GRANT SELECT ON public.orc_links TO authenticated;
GRANT ALL ON public.orc_links TO service_role;
ALTER TABLE public.orc_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY orc_links_ler ON public.orc_links FOR SELECT TO authenticated
  USING (public.tem_permissao('orcamentos','ver') OR public.tem_permissao('ordens','ver'));
CREATE INDEX orc_links_orc ON public.orc_links(orcamento_id);

-- Respostas do cliente (registro imutável; uma por link)
CREATE TABLE public.orc_aprovacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id uuid NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  link_id uuid NOT NULL UNIQUE REFERENCES public.orc_links(id) ON DELETE CASCADE,
  respondido_em timestamptz NOT NULL DEFAULT now(),
  itens jsonb NOT NULL,
  total_aprovado numeric NOT NULL,
  total_recusado numeric NOT NULL
);
GRANT SELECT ON public.orc_aprovacoes TO authenticated;
GRANT ALL ON public.orc_aprovacoes TO service_role;
ALTER TABLE public.orc_aprovacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY orc_aprovacoes_ler ON public.orc_aprovacoes FOR SELECT TO authenticated
  USING (public.tem_permissao('orcamentos','ver') OR public.tem_permissao('ordens','ver'));
CREATE INDEX orc_aprovacoes_orc ON public.orc_aprovacoes(orcamento_id);

CREATE OR REPLACE FUNCTION public.portal_ativo() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT (data->'orcamentos'->>'portalCliente')::boolean FROM public.configuracoes WHERE id = 1), false)
$$;

-- Data de referência do sistema (horário de Brasília), nunca a do aparelho
CREATE OR REPLACE FUNCTION public.orc_valido(_validade text) RETURNS boolean
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT COALESCE(NULLIF(_validade,''), '') = ''
      OR (now() AT TIME ZONE 'America/Sao_Paulo')::date <= _validade::date
$$;

-- Itens do orçamento com subtotal calculado no servidor
CREATE OR REPLACE FUNCTION public.orc_itens_calc(_data jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', i->>'id', 'tipo', i->>'tipo', 'descricao', COALESCE(i->>'descricao',''), 'observacao', COALESCE(i->>'observacao',''),
    'quantidade', COALESCE((i->>'quantidade')::numeric,0), 'valorUnit', COALESCE((i->>'valorUnit')::numeric,0),
    'desconto', COALESCE((i->>'desconto')::numeric,0), 'acrescimo', COALESCE((i->>'acrescimo')::numeric,0),
    'subtotal', round(greatest(0, COALESCE((i->>'quantidade')::numeric,0) * COALESCE((i->>'valorUnit')::numeric,0)
       - COALESCE((i->>'desconto')::numeric,0) + COALESCE((i->>'acrescimo')::numeric,0)), 2)
  ) ORDER BY ord), '[]'::jsonb)
  FROM jsonb_array_elements(COALESCE(_data->'itens','[]'::jsonb)) WITH ORDINALITY AS t(i, ord)
$$;

-- Gera um novo link (desativa os anteriores) e coloca o orçamento em "Aguardando aprovação"
CREATE OR REPLACE FUNCTION public.orc_gerar_link(_orc uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.orcamentos; tk text; nome text; ev jsonb;
BEGIN
  IF NOT public.tem_permissao('orcamentos','editar') THEN RAISE EXCEPTION 'Sem permissão para compartilhar orçamentos.'; END IF;
  IF NOT public.portal_ativo() THEN RAISE EXCEPTION 'A interatividade com o cliente está desativada nas configurações.'; END IF;
  SELECT * INTO o FROM public.orcamentos WHERE id = _orc FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Orçamento não encontrado.'; END IF;
  IF o.tipo <> 'orcamento' OR o.status NOT IN ('rascunho','reaberto','aguardando') THEN
    RAISE EXCEPTION 'Só é possível enviar para aprovação orçamentos em rascunho, reabertos ou aguardando aprovação.';
  END IF;
  IF NOT public.orc_valido(o.data->>'validade') THEN RAISE EXCEPTION 'A validade deste orçamento já venceu. Atualize a validade antes de enviar.'; END IF;
  SELECT COALESCE(NULLIF(p.nome,''), p.email) INTO nome FROM public.profiles p WHERE p.id = auth.uid();
  UPDATE public.orc_links SET ativo = false WHERE orcamento_id = _orc AND ativo;
  tk := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
  INSERT INTO public.orc_links(orcamento_id, token, criado_por, criado_por_nome) VALUES (_orc, tk, auth.uid(), COALESCE(nome,''));
  ev := jsonb_build_object('id', gen_random_uuid(), 'data', to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'usuario', COALESCE(nome,'—'), 'acao', 'Link de aprovação gerado para o cliente', 'detalhes', '[]'::jsonb);
  IF o.status <> 'aguardando' THEN ev := ev || jsonb_build_object('statusAnterior', o.status, 'statusNovo', 'aguardando'); END IF;
  UPDATE public.orcamentos SET status = 'aguardando',
    data = jsonb_set(jsonb_set(data, '{status}', '"aguardando"'), '{historico}', COALESCE(data->'historico','[]'::jsonb) || ev),
    atualizado_em = now()
  WHERE id = _orc;
  RETURN tk;
END $$;
GRANT EXECUTE ON FUNCTION public.orc_gerar_link(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.orc_desativar_link(_orc uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.tem_permissao('orcamentos','editar') THEN RAISE EXCEPTION 'Sem permissão.'; END IF;
  UPDATE public.orc_links SET ativo = false WHERE orcamento_id = _orc AND ativo;
END $$;
GRANT EXECUTE ON FUNCTION public.orc_desativar_link(uuid) TO authenticated;

-- Leitura pública pelo token: somente dados deste orçamento, sem informações internas
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
       'totalAprovado', ap.total_aprovado, 'totalRecusado', ap.total_recusado) END
  );
END $$;
GRANT EXECUTE ON FUNCTION public.portal_ler(text) TO anon, authenticated;

-- Confirmação pelo cliente: validade, valores e duplicidade conferidos no servidor
CREATE OR REPLACE FUNCTION public.portal_confirmar(_token text, _aprovados text[], _versao timestamptz) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l public.orc_links; o public.orcamentos; itens jsonb; marcados jsonb; tot_a numeric; tot_r numeric; n_a int; n_r int; novo text; ev jsonb;
BEGIN
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
  INSERT INTO public.orc_aprovacoes(orcamento_id, link_id, itens, total_aprovado, total_recusado)
    VALUES (o.id, l.id, marcados, tot_a, tot_r);
  novo := CASE WHEN n_a > 0 THEN 'aprovado' ELSE 'recusado' END;
  ev := jsonb_build_object('id', gen_random_uuid(), 'data', to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'usuario', 'Cliente (link)', 'acao', 'Resposta do cliente pelo link', 'statusAnterior', o.status, 'statusNovo', novo,
    'detalhes', jsonb_build_array(
      format('Aprovados: %s item(ns) · R$ %s', n_a, replace(to_char(tot_a,'FM999999990.00'),'.',',')),
      format('Recusados: %s item(ns) · R$ %s', n_r, replace(to_char(tot_r,'FM999999990.00'),'.',','))));
  UPDATE public.orcamentos SET status = novo,
    data = jsonb_set(jsonb_set(data, '{status}', to_jsonb(novo)), '{historico}', COALESCE(data->'historico','[]'::jsonb) || ev),
    atualizado_em = now()
  WHERE id = o.id;
  RETURN jsonb_build_object('ok', true, 'status', novo, 'totalAprovado', tot_a);
END $$;
GRANT EXECUTE ON FUNCTION public.portal_confirmar(text, text[], timestamptz) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.portal_ativo() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_ativo() TO authenticated;

-- Imagens dos orçamentos (bucket privado)
CREATE POLICY orcamentos_img_ler ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'orcamentos' AND (public.tem_permissao('orcamentos','ver') OR public.tem_permissao('ordens','ver')));
CREATE POLICY orcamentos_img_enviar ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'orcamentos' AND (public.tem_permissao('orcamentos','editar') OR public.tem_permissao('orcamentos','criar')));
CREATE POLICY orcamentos_img_remover ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'orcamentos' AND public.tem_permissao('orcamentos','editar'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.orc_aprovacoes;