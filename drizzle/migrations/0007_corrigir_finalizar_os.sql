CREATE OR REPLACE FUNCTION public.fin_finalizar_os(_orc uuid, _pagamentos jsonb, _data date, _parcelas integer, _vencimento date, _excesso boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o public.orcamentos%ROWTYPE; total numeric(14,2); pago numeric(14,2) := 0; resto numeric(14,2);
  tid uuid; g uuid := gen_random_uuid(); n integer := greatest(1, COALESCE(_parcelas,1)); i integer; v numeric(14,2); desc_os text;
BEGIN
  IF NOT public.tem_permissao('financeiro','baixar') THEN
    RAISE EXCEPTION 'Você não tem permissão para registrar pagamentos.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO o FROM public.orcamentos WHERE id = _orc FOR UPDATE;
  IF NOT FOUND OR o.tipo <> 'os' THEN RAISE EXCEPTION 'Ordem de serviço não encontrada.' USING ERRCODE = 'P0001'; END IF;
  IF EXISTS (SELECT 1 FROM public.fin_titulos WHERE documento_id = _orc AND status <> 'cancelado') THEN
    RAISE EXCEPTION 'Esta OS já possui contas a receber. Registre novos recebimentos em Contas a receber.' USING ERRCODE = 'P0001';
  END IF;
  SELECT COALESCE(sum(greatest(0, COALESCE((it->>'quantidade')::numeric,0) * COALESCE((it->>'valorUnit')::numeric,0)
    - COALESCE((it->>'desconto')::numeric,0) + COALESCE((it->>'acrescimo')::numeric,0))),0)
    INTO total FROM jsonb_array_elements(COALESCE(o.data->'itens','[]'::jsonb)) it;
  IF total <= 0 THEN RAISE EXCEPTION 'A OS não possui valor a receber.' USING ERRCODE = 'P0001'; END IF;
  SELECT COALESCE(sum((pg->>'valor')::numeric + COALESCE((pg->>'desconto')::numeric,0)),0) INTO pago
    FROM jsonb_array_elements(COALESCE(_pagamentos,'[]'::jsonb)) pg;
  IF pago > total + 0.009 AND NOT (_excesso AND public.eh_administrador()) THEN
    RAISE EXCEPTION 'O valor recebido ultrapassa o total da OS. Somente um administrador pode confirmar.' USING ERRCODE = 'P0001';
  END IF;
  desc_os := 'OS ' || COALESCE(o.data->>'numeroOS', o.numero::text);
  IF pago > 0 THEN
    INSERT INTO public.fin_titulos (tipo, origem, descricao, vencimento, valor, documento_id, cliente_id, grupo, parcela, parcelas)
    VALUES ('receber','os', desc_os || ' · pagamento na finalização', COALESCE(_data,current_date), pago, _orc, o.cliente_id, g, 1, 1)
    RETURNING id INTO tid;
    PERFORM public.fin__aplicar(tid, _pagamentos, _data, _excesso);
  END IF;
  resto := total - pago;
  IF resto > 0.009 THEN
    FOR i IN 1..n LOOP
      v := CASE WHEN i < n THEN round(resto / n, 2) ELSE resto - round(resto / n, 2) * (n - 1) END;
      INSERT INTO public.fin_titulos (tipo, origem, descricao, vencimento, valor, documento_id, cliente_id, grupo, parcela, parcelas)
      VALUES ('receber','os', desc_os || CASE WHEN n > 1 THEN ' · parcela ' || i || '/' || n ELSE ' · saldo pendente' END,
        (COALESCE(_vencimento, current_date + 30) + ((i-1) || ' month')::interval)::date, v, _orc, o.cliente_id, g, i, n);
    END LOOP;
  END IF;
  PERFORM public.fin_log('Finalização de ordem de serviço', total, NULL, NULL, NULL, _orc,
    'Recebido: ' || pago || ' · Pendente: ' || greatest(resto,0), NULL, CASE WHEN resto <= 0.009 THEN 'pago' WHEN pago > 0 THEN 'parcial' ELSE 'aberto' END);
  RETURN jsonb_build_object('total', total, 'recebido', pago, 'pendente', greatest(resto,0));
END $$;
REVOKE EXECUTE ON FUNCTION public.fin_finalizar_os(uuid, jsonb, date, integer, date, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fin_finalizar_os(uuid, jsonb, date, integer, date, boolean) TO authenticated;