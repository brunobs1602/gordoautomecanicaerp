CREATE OR REPLACE FUNCTION public.excluir_registro(_tipo text, _id uuid, _somente_verificar boolean DEFAULT false, _motivo text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _modulo text; _rotulo text; _nome text := ''; _motivos jsonb := '[]'::jsonb; _rel jsonb := '{}'::jsonb;
  _n int; _admin text; _r record; _bloq boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sessão expirada. Entre novamente.'; END IF;
  _modulo := CASE _tipo WHEN 'cliente' THEN 'clientes' WHEN 'veiculo' THEN 'veiculos' WHEN 'produto' THEN 'produtos' WHEN 'orcamento' THEN 'orcamentos' END;
  _rotulo := CASE _tipo WHEN 'cliente' THEN 'Cliente' WHEN 'veiculo' THEN 'Veículo' WHEN 'produto' THEN 'Produto' WHEN 'orcamento' THEN 'Orçamento' END;
  IF _modulo IS NULL THEN RAISE EXCEPTION 'Tipo de registro inválido.'; END IF;
  IF NOT tem_permissao(_modulo, 'excluir') THEN
    RAISE EXCEPTION 'Você não tem permissão para excluir este registro. Peça a um administrador.';
  END IF;
  SELECT COALESCE(nome, '') INTO _admin FROM profiles WHERE id = auth.uid();

  IF _tipo = 'cliente' THEN
    SELECT data->>'nome' AS nome, documento INTO _r FROM clientes WHERE id = _id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Cliente não encontrado. Ele pode já ter sido excluído.'; END IF;
    _nome := COALESCE(_r.nome, '') || CASE WHEN _r.documento <> '' THEN ' (' || _r.documento || ')' ELSE '' END;
    SELECT count(*) INTO _n FROM veiculos WHERE cliente_id = _id;
    IF _n > 0 THEN _rel := _rel || jsonb_build_object('veiculos', _n);
      _motivos := _motivos || to_jsonb(format('Este cliente não pode ser excluído porque possui veículos vinculados (%s). Exclua ou transfira os veículos antes de excluir o cliente.', _n)); END IF;
    SELECT count(*) INTO _n FROM orcamentos WHERE cliente_id = _id;
    IF _n > 0 THEN _rel := _rel || jsonb_build_object('orcamentos', _n);
      _motivos := _motivos || to_jsonb(format('Este cliente não pode ser excluído porque possui orçamentos ou ordens de serviço vinculados (%s). Exclua os registros relacionados ou inative o cliente.', _n)); END IF;
  ELSIF _tipo = 'veiculo' THEN
    SELECT placa, data->>'marca' AS marca, data->>'modelo' AS modelo INTO _r FROM veiculos WHERE id = _id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Veículo não encontrado. Ele pode já ter sido excluído.'; END IF;
    _nome := trim(COALESCE(_r.placa, '') || ' ' || COALESCE(_r.marca, '') || ' ' || COALESCE(_r.modelo, ''));
    SELECT count(*) INTO _n FROM orcamentos WHERE veiculo_id = _id;
    IF _n > 0 THEN _rel := _rel || jsonb_build_object('orcamentos', _n);
      _motivos := _motivos || to_jsonb(format('Este veículo não pode ser excluído porque possui registros vinculados (%s orçamento(s)/ordem(ns) de serviço). Exclua ou remova os registros relacionados antes de excluir o veículo, ou utilize a opção de inativar.', _n)); END IF;
  ELSIF _tipo = 'produto' THEN
    SELECT codigo, data->>'nome' AS nome INTO _r FROM produtos WHERE id = _id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Produto não encontrado. Ele pode já ter sido excluído.'; END IF;
    _nome := COALESCE(_r.codigo, '') || ' ' || COALESCE(_r.nome, '');
    SELECT count(*) INTO _n FROM orcamentos WHERE data->'itens' @> jsonb_build_array(jsonb_build_object('refId', _id::text, 'tipo', 'produto'));
    IF _n > 0 THEN _rel := _rel || jsonb_build_object('orcamentos', _n);
      _motivos := _motivos || to_jsonb(format('Este produto não pode ser excluído porque já foi utilizado em orçamentos, ordens de serviço ou movimentações de estoque (%s documento(s)). Utilize a opção de inativar para impedir novos usos.', _n)); END IF;
  ELSE
    SELECT numero, tipo, status INTO _r FROM orcamentos WHERE id = _id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Orçamento não encontrado. Ele pode já ter sido excluído.'; END IF;
    _nome := 'Nº ' || _r.numero;
    IF _r.tipo = 'os' OR _r.status = 'convertido' THEN _rel := _rel || jsonb_build_object('ordem_servico', 1);
      _motivos := _motivos || to_jsonb('Este orçamento não pode ser excluído porque já foi convertido em ordem de serviço. Utilize a opção de cancelar.'::text); END IF;
  END IF;

  _bloq := jsonb_array_length(_motivos) > 0;
  IF _bloq THEN
    INSERT INTO auditoria (admin_id, admin_nome, tipo, alvo, descricao, secao, antes)
    VALUES (auth.uid(), COALESCE(_admin, ''), 'exclusao_bloqueada', _rotulo || ' ' || _nome,
      'Exclusão bloqueada: ' || (SELECT string_agg(x, ' ') FROM jsonb_array_elements_text(_motivos) x), _rotulo, _rel::text);
    RETURN jsonb_build_object('ok', false, 'motivos', _motivos, 'relacionados', _rel);
  END IF;
  IF _somente_verificar THEN RETURN jsonb_build_object('ok', true, 'motivos', '[]'::jsonb); END IF;

  IF _tipo = 'cliente' THEN DELETE FROM clientes WHERE id = _id;
  ELSIF _tipo = 'veiculo' THEN DELETE FROM veiculos WHERE id = _id;
  ELSIF _tipo = 'produto' THEN DELETE FROM produtos WHERE id = _id;
  ELSE DELETE FROM orcamentos WHERE id = _id; END IF;

  INSERT INTO auditoria (admin_id, admin_nome, tipo, alvo, descricao, secao)
  VALUES (auth.uid(), COALESCE(_admin, ''), 'exclusao', _rotulo || ' ' || _nome,
    'Exclusão definitiva concluída.' || CASE WHEN COALESCE(_motivo, '') <> '' THEN ' Motivo: ' || _motivo ELSE '' END || ' Id: ' || _id, _rotulo);
  RETURN jsonb_build_object('ok', true, 'excluido', true);
END $$;
REVOKE ALL ON FUNCTION public.excluir_registro(text, uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.excluir_registro(text, uuid, boolean, text) TO authenticated;

-- Exclusões diretas passam a ocorrer somente pela função acima (com verificação de vínculos).
DROP POLICY IF EXISTS clientes_excluir ON public.clientes;
DROP POLICY IF EXISTS veiculos_excluir ON public.veiculos;
DROP POLICY IF EXISTS produtos_excluir ON public.produtos;