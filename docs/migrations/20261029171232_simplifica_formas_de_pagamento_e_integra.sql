-- Simplifica formas de pagamento e integra recebimentos à finalização das OS
-- Aplicada no Lovable Cloud pela extensão, com autorização do usuário.
-- Registrada por GeckoAI em 2026-10-29T20:12:32.260Z

CREATE OR REPLACE FUNCTION public.fin__preparar_pagamentos(_pagamentos jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE p jsonb; f public.fin_cadastros%ROWTYPE; conta uuid; resultado jsonb := '[]'::jsonb;
BEGIN
  IF _pagamentos IS NULL OR jsonb_typeof(_pagamentos) <> 'array' THEN RAISE EXCEPTION 'Informe uma lista de pagamentos válida.'; END IF;
  FOR p IN SELECT * FROM jsonb_array_elements(_pagamentos) LOOP
    SELECT * INTO f FROM public.fin_cadastros WHERE id = NULLIF(p->>'forma_id','')::uuid AND tipo = 'forma' AND ativo FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Selecione uma forma de pagamento ativa.'; END IF;
    IF COALESCE((p->>'valor')::numeric,0) <= 0 OR (p->>'valor')::numeric = 'NaN'::numeric THEN RAISE EXCEPTION 'Informe um valor de pagamento maior que zero.'; END IF;
    conta := NULLIF(p->>'conta_id','')::uuid;
    IF conta IS NULL THEN
      SELECT id INTO conta FROM public.fin_cadastros WHERE id = NULLIF(f.data->>'contaPadrao','')::uuid AND tipo = 'conta' AND ativo;
      IF conta IS NULL AND (SELECT count(*) FROM public.fin_cadastros WHERE tipo = 'conta' AND ativo) = 1 THEN
        SELECT id INTO conta FROM public.fin_cadastros WHERE tipo = 'conta' AND ativo LIMIT 1;
      END IF;
      IF conta IS NULL THEN
        PERFORM pg_advisory_xact_lock(180018);
        SELECT id INTO conta FROM public.fin_cadastros WHERE tipo = 'conta' AND ativo AND data->>'caixaAutomatico' = 'true' ORDER BY criado_em LIMIT 1;
        IF conta IS NULL THEN
          INSERT INTO public.fin_cadastros(tipo,nome,ativo,data) VALUES ('conta','Caixa da oficina',true,jsonb_build_object('tipoConta','caixa','saldoInicial',0,'caixaAutomatico',true)) RETURNING id INTO conta;
        END IF;
      END IF;
    END IF;
    PERFORM 1 FROM public.fin_cadastros WHERE id = conta AND tipo = 'conta' AND ativo FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'A conta escolhida está inativa. Selecione outra conta.'; END IF;
    resultado := resultado || jsonb_build_array(p || jsonb_build_object('conta_id',conta));
  END LOOP;
  RETURN resultado;
END $fn$;
REVOKE ALL ON FUNCTION public.fin__preparar_pagamentos(jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.fin_baixar(_titulo uuid, _pagamentos jsonb, _data date, _excesso boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
BEGIN
  IF NOT public.tem_permissao('financeiro','baixar') THEN RAISE EXCEPTION 'Você não tem permissão para registrar pagamentos.' USING ERRCODE = '42501'; END IF;
  RETURN public.fin__aplicar(_titulo, public.fin__preparar_pagamentos(_pagamentos), _data, _excesso);
END $fn$;

CREATE OR REPLACE FUNCTION public.fin_finalizar_os(_orc uuid, _pagamentos jsonb, _data date, _parcelas integer, _vencimento date, _excesso boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE
  o public.orcamentos%ROWTYPE; total numeric(14,2); pago numeric(14,2) := 0; resto numeric(14,2);
  tid uuid; g uuid := gen_random_uuid(); n integer := greatest(1,COALESCE(_parcelas,1)); i integer; v numeric(14,2); desc_os text;
  pagamentos jsonb; anterior text; instante text := to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
BEGIN
  IF NOT public.tem_permissao('financeiro','baixar') THEN RAISE EXCEPTION 'Você não tem permissão para registrar pagamentos.' USING ERRCODE = '42501'; END IF;
  SELECT * INTO o FROM public.orcamentos WHERE id = _orc FOR UPDATE;
  IF NOT FOUND OR o.tipo <> 'os' THEN RAISE EXCEPTION 'Ordem de serviço não encontrada.'; END IF;
  anterior := COALESCE(o.data->>'statusOS','aberta');
  IF anterior = 'cancelada' THEN RAISE EXCEPTION 'Uma OS cancelada não pode receber pagamentos.'; END IF;
  IF anterior NOT IN ('finalizada','entregue') AND NOT public.tem_permissao('ordens','status') THEN RAISE EXCEPTION 'Você não tem permissão para finalizar esta OS.' USING ERRCODE = '42501'; END IF;
  IF EXISTS (SELECT 1 FROM public.fin_titulos WHERE documento_id = _orc AND status <> 'cancelado') THEN
    RAISE EXCEPTION 'Esta OS já possui contas a receber. Confira o lançamento existente e registre novos recebimentos em Contas a receber.';
  END IF;
  IF n > 12 THEN RAISE EXCEPTION 'O saldo pode ser dividido em até 12 parcelas.'; END IF;
  SELECT COALESCE(sum(greatest(0,COALESCE((it->>'quantidade')::numeric,0)*COALESCE((it->>'valorUnit')::numeric,0)-COALESCE((it->>'desconto')::numeric,0)+COALESCE((it->>'acrescimo')::numeric,0))),0)
    INTO total FROM jsonb_array_elements(COALESCE(o.data->'itens','[]'::jsonb)) it;
  IF total <= 0 THEN RAISE EXCEPTION 'A OS não possui valor a receber.'; END IF;
  pagamentos := public.fin__preparar_pagamentos(COALESCE(_pagamentos,'[]'::jsonb));
  SELECT COALESCE(sum((pg->>'valor')::numeric+COALESCE((pg->>'desconto')::numeric,0)),0) INTO pago FROM jsonb_array_elements(pagamentos) pg;
  IF pago > total + 0.009 AND NOT (_excesso AND public.eh_administrador()) THEN RAISE EXCEPTION 'O valor recebido ultrapassa o total da OS. Somente um administrador pode confirmar.'; END IF;
  desc_os := 'OS ' || COALESCE(o.data->>'numeroOS',o.numero::text);
  IF pago > 0 THEN
    INSERT INTO public.fin_titulos(tipo,origem,descricao,vencimento,valor,documento_id,cliente_id,grupo,parcela,parcelas)
    VALUES ('receber','os',desc_os || ' · pagamento na finalização',COALESCE(_data,current_date),pago,_orc,o.cliente_id,g,1,1) RETURNING id INTO tid;
    PERFORM public.fin__aplicar(tid,pagamentos,_data,_excesso);
  END IF;
  resto := total-pago;
  IF resto > 0.009 THEN
    IF round(resto/n,2) <= 0 OR resto-round(resto/n,2)*(n-1) <= 0 THEN RAISE EXCEPTION 'Reduza o número de parcelas para que todas tenham valor maior que zero.'; END IF;
    FOR i IN 1..n LOOP
      v := CASE WHEN i < n THEN round(resto/n,2) ELSE resto-round(resto/n,2)*(n-1) END;
      INSERT INTO public.fin_titulos(tipo,origem,descricao,vencimento,valor,documento_id,cliente_id,grupo,parcela,parcelas)
      VALUES ('receber','os',desc_os || CASE WHEN n>1 THEN ' · parcela ' || i || '/' || n ELSE ' · saldo pendente' END,
        (COALESCE(_vencimento,current_date+30)+((i-1)||' month')::interval)::date,v,_orc,o.cliente_id,g,i,n);
    END LOOP;
  END IF;
  IF anterior NOT IN ('finalizada','entregue') THEN
    UPDATE public.orcamentos SET data = data || jsonb_build_object('statusOS','finalizada','concluidaEm',instante,'atualizadoEm',instante,
      'historico',COALESCE(data->'historico','[]'::jsonb)||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'data',instante,'usuario',public.fin_nome_usuario(),'acao','OS finalizada','detalhes',jsonb_build_array('Status: finalizada','Recebido: '||pago||' · Pendente: '||greatest(resto,0))))) WHERE id = _orc;
  END IF;
  PERFORM public.fin_log('Finalização de ordem de serviço',total,NULL,NULL,NULL,_orc,'Recebido: '||pago||' · Pendente: '||greatest(resto,0),NULL,CASE WHEN resto<=0.009 THEN 'pago' WHEN pago>0 THEN 'parcial' ELSE 'aberto' END);
  RETURN jsonb_build_object('total',total,'recebido',pago,'pendente',greatest(resto,0));
END $fn$;
