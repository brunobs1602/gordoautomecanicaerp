-- ===================== Módulo financeiro =====================
CREATE TABLE public.fin_cadastros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('conta','forma','maquininha','bandeira','taxa','pix','categoria','centro')),
  nome text NOT NULL DEFAULT '',
  ativo boolean NOT NULL DEFAULT true,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.fin_cadastros TO authenticated;
GRANT ALL ON public.fin_cadastros TO service_role;
ALTER TABLE public.fin_cadastros ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_cad_ler ON public.fin_cadastros FOR SELECT TO authenticated
  USING (public.tem_permissao('financeiro','ver') OR public.tem_permissao('financeiro','baixar'));
CREATE POLICY fin_cad_criar ON public.fin_cadastros FOR INSERT TO authenticated
  WITH CHECK (public.tem_permissao('financeiro','config') OR (tipo IN ('categoria','centro') AND public.tem_permissao('financeiro','criar')));
CREATE POLICY fin_cad_editar ON public.fin_cadastros FOR UPDATE TO authenticated
  USING (public.tem_permissao('financeiro','config')) WITH CHECK (public.tem_permissao('financeiro','config'));

CREATE TABLE public.fin_titulos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('pagar','receber')),
  status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','parcial','pago','cancelado')),
  origem text NOT NULL DEFAULT 'manual',
  descricao text NOT NULL DEFAULT '',
  vencimento date NOT NULL,
  valor numeric(14,2) NOT NULL CHECK (valor >= 0),
  pago numeric(14,2) NOT NULL DEFAULT 0,
  documento_id uuid,
  cliente_id uuid,
  categoria_id uuid,
  parcela integer NOT NULL DEFAULT 1,
  parcelas integer NOT NULL DEFAULT 1,
  grupo uuid,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(),
  criado_por uuid DEFAULT auth.uid(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_por uuid DEFAULT auth.uid()
);
CREATE INDEX fin_titulos_doc_idx ON public.fin_titulos (documento_id);
CREATE INDEX fin_titulos_venc_idx ON public.fin_titulos (tipo, vencimento);
GRANT SELECT, INSERT, UPDATE ON public.fin_titulos TO authenticated;
GRANT ALL ON public.fin_titulos TO service_role;
ALTER TABLE public.fin_titulos ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_tit_ler ON public.fin_titulos FOR SELECT TO authenticated
  USING (public.tem_permissao('financeiro','ver'));
CREATE POLICY fin_tit_criar ON public.fin_titulos FOR INSERT TO authenticated
  WITH CHECK (public.tem_permissao('financeiro','criar') AND pago = 0 AND status = 'aberto' AND origem = 'manual');
CREATE POLICY fin_tit_editar ON public.fin_titulos FOR UPDATE TO authenticated
  USING (public.tem_permissao('financeiro','editar')) WITH CHECK (public.tem_permissao('financeiro','editar'));

CREATE TABLE public.fin_movimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  criado_em timestamptz NOT NULL DEFAULT now(),
  data_mov date NOT NULL DEFAULT current_date,
  tipo text NOT NULL CHECK (tipo IN ('pagamento','recebimento','transferencia','ajuste','estorno')),
  conta_id uuid NOT NULL REFERENCES public.fin_cadastros(id),
  valor numeric(14,2) NOT NULL,
  titulo_id uuid REFERENCES public.fin_titulos(id),
  documento_id uuid,
  forma_id uuid,
  estorno_de uuid REFERENCES public.fin_movimentos(id),
  estornado boolean NOT NULL DEFAULT false,
  usuario_id uuid DEFAULT auth.uid(),
  usuario_nome text NOT NULL DEFAULT '',
  data jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX fin_mov_conta_idx ON public.fin_movimentos (conta_id, data_mov);
CREATE INDEX fin_mov_titulo_idx ON public.fin_movimentos (titulo_id);
GRANT SELECT ON public.fin_movimentos TO authenticated;
GRANT ALL ON public.fin_movimentos TO service_role;
ALTER TABLE public.fin_movimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_mov_ler ON public.fin_movimentos FOR SELECT TO authenticated
  USING (public.tem_permissao('financeiro','ver'));

CREATE TABLE public.fin_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data timestamptz NOT NULL DEFAULT now(),
  usuario_id uuid DEFAULT auth.uid(),
  usuario_nome text NOT NULL DEFAULT '',
  tipo text NOT NULL,
  valor numeric(14,2),
  conta_id uuid,
  forma_id uuid,
  titulo_id uuid,
  documento_id uuid,
  observacao text NOT NULL DEFAULT '',
  status_anterior text,
  status_novo text
);
CREATE INDEX fin_hist_titulo_idx ON public.fin_historico (titulo_id);
GRANT SELECT ON public.fin_historico TO authenticated;
GRANT ALL ON public.fin_historico TO service_role;
ALTER TABLE public.fin_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_hist_ler ON public.fin_historico FOR SELECT TO authenticated
  USING (public.tem_permissao('financeiro','ver'));

-- ---------- utilitários ----------
CREATE OR REPLACE FUNCTION public.fin_nome_usuario() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT nome FROM public.profiles WHERE id = auth.uid()), '')
$$;
REVOKE EXECUTE ON FUNCTION public.fin_nome_usuario() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fin_nome_usuario() TO authenticated;

CREATE OR REPLACE FUNCTION public.fin_log(_tipo text, _valor numeric, _conta uuid, _forma uuid, _titulo uuid, _doc uuid, _obs text, _antes text, _depois text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.fin_historico (tipo, valor, conta_id, forma_id, titulo_id, documento_id, observacao, status_anterior, status_novo, usuario_nome)
  VALUES (_tipo, _valor, _conta, _forma, _titulo, _doc, COALESCE(_obs,''), _antes, _depois, public.fin_nome_usuario())
$$;
REVOKE EXECUTE ON FUNCTION public.fin_log(text, numeric, uuid, uuid, uuid, uuid, text, text, text) FROM PUBLIC, anon, authenticated;

-- Protege valores pagos e status: só as funções financeiras podem alterá-los.
CREATE OR REPLACE FUNCTION public.fin_titulos_proteger() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE interno boolean := current_setting('app.fin_interno', true) = '1';
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.fin_log('Criação de conta', NEW.valor, NULL, NULL, NEW.id, NEW.documento_id,
      NEW.descricao || ' (' || CASE WHEN NEW.tipo = 'pagar' THEN 'a pagar' ELSE 'a receber' END || ')', NULL, NEW.status);
    RETURN NEW;
  END IF;
  IF NOT interno THEN
    IF NEW.pago IS DISTINCT FROM OLD.pago OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.tipo IS DISTINCT FROM OLD.tipo OR NEW.origem IS DISTINCT FROM OLD.origem
       OR NEW.documento_id IS DISTINCT FROM OLD.documento_id THEN
      RAISE EXCEPTION 'Pagamentos e status só podem ser alterados pelas ações do financeiro.' USING ERRCODE = 'P0001';
    END IF;
    IF OLD.status IN ('pago','cancelado') THEN
      RAISE EXCEPTION 'Contas pagas ou canceladas não podem ser editadas.' USING ERRCODE = 'P0001';
    END IF;
    IF NEW.valor < OLD.pago THEN
      RAISE EXCEPTION 'O valor não pode ser menor que o já pago.' USING ERRCODE = 'P0001';
    END IF;
    IF NEW.vencimento IS DISTINCT FROM OLD.vencimento THEN
      PERFORM public.fin_log('Alteração de vencimento', NEW.valor, NULL, NULL, NEW.id, NEW.documento_id,
        to_char(OLD.vencimento,'DD/MM/YYYY') || ' → ' || to_char(NEW.vencimento,'DD/MM/YYYY'), NEW.status, NEW.status);
    END IF;
    IF NEW.valor IS DISTINCT FROM OLD.valor OR NEW.descricao IS DISTINCT FROM OLD.descricao OR NEW.data IS DISTINCT FROM OLD.data THEN
      PERFORM public.fin_log('Alteração de conta', NEW.valor, NULL, NULL, NEW.id, NEW.documento_id,
        CASE WHEN NEW.valor IS DISTINCT FROM OLD.valor THEN 'Valor: ' || OLD.valor || ' → ' || NEW.valor ELSE 'Dados alterados' END, NEW.status, NEW.status);
    END IF;
  END IF;
  NEW.atualizado_em := now();
  NEW.atualizado_por := auth.uid();
  RETURN NEW;
END $$;
CREATE TRIGGER fin_titulos_proteger BEFORE INSERT OR UPDATE ON public.fin_titulos
  FOR EACH ROW EXECUTE FUNCTION public.fin_titulos_proteger();

CREATE OR REPLACE FUNCTION public.fin_cadastros_carimbo() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.atualizado_em := now(); RETURN NEW; END $$;
CREATE TRIGGER fin_cadastros_carimbo BEFORE UPDATE ON public.fin_cadastros
  FOR EACH ROW EXECUTE FUNCTION public.fin_cadastros_carimbo();

-- Aplica pagamentos/recebimentos a uma conta (uso interno).
CREATE OR REPLACE FUNCTION public.fin__aplicar(_titulo uuid, _pagamentos jsonb, _data date, _excesso boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t public.fin_titulos%ROWTYPE;
  p jsonb;
  aplicado numeric(14,2); caixa numeric(14,2); total_aplicado numeric(14,2) := 0;
  novo_status text; conta uuid; mov uuid;
BEGIN
  SELECT * INTO t FROM public.fin_titulos WHERE id = _titulo FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conta não encontrada.' USING ERRCODE = 'P0001'; END IF;
  IF t.status IN ('cancelado','pago') THEN RAISE EXCEPTION 'Esta conta já está %.', CASE WHEN t.status = 'pago' THEN 'quitada' ELSE 'cancelada' END USING ERRCODE = 'P0001'; END IF;
  IF jsonb_typeof(_pagamentos) <> 'array' OR jsonb_array_length(_pagamentos) = 0 THEN
    RAISE EXCEPTION 'Informe ao menos um pagamento.' USING ERRCODE = 'P0001';
  END IF;
  PERFORM set_config('app.fin_interno', '1', true);
  FOR p IN SELECT * FROM jsonb_array_elements(_pagamentos) LOOP
    conta := NULLIF(p->>'conta_id','')::uuid;
    IF conta IS NULL OR NOT EXISTS (SELECT 1 FROM public.fin_cadastros WHERE id = conta AND tipo = 'conta' AND ativo) THEN
      RAISE EXCEPTION 'Selecione uma conta bancária ativa.' USING ERRCODE = 'P0001';
    END IF;
    IF COALESCE((p->>'valor')::numeric, 0) <= 0 THEN RAISE EXCEPTION 'O valor deve ser maior que zero.' USING ERRCODE = 'P0001'; END IF;
    aplicado := round((p->>'valor')::numeric + COALESCE((p->>'desconto')::numeric, 0), 2);
    caixa := round((p->>'valor')::numeric + COALESCE((p->>'juros')::numeric, 0) + COALESCE((p->>'multa')::numeric, 0) - COALESCE((p->>'taxa')::numeric, 0), 2);
    IF t.tipo = 'pagar' THEN caixa := -caixa; END IF;
    INSERT INTO public.fin_movimentos (data_mov, tipo, conta_id, valor, titulo_id, documento_id, forma_id, usuario_nome, data)
    VALUES (COALESCE(_data, current_date), CASE WHEN t.tipo = 'pagar' THEN 'pagamento' ELSE 'recebimento' END, conta, caixa,
      t.id, t.documento_id, NULLIF(p->>'forma_id','')::uuid, public.fin_nome_usuario(), p || jsonb_build_object('aplicado', aplicado))
    RETURNING id INTO mov;
    PERFORM public.fin_log(CASE WHEN t.tipo = 'pagar' THEN 'Pagamento' ELSE 'Recebimento' END, abs(caixa), conta, NULLIF(p->>'forma_id','')::uuid, t.id, t.documento_id,
      COALESCE(p->>'obs','') || CASE WHEN COALESCE((p->>'taxa')::numeric,0) > 0 THEN ' · Taxa aplicada: ' || (p->>'taxa') ELSE '' END, t.status, NULL);
    total_aplicado := total_aplicado + aplicado;
  END LOOP;
  IF t.pago + total_aplicado > t.valor + 0.009 AND NOT (_excesso AND public.eh_administrador()) THEN
    RAISE EXCEPTION 'O valor informado ultrapassa o total da conta (falta %). Somente um administrador pode confirmar valor acima do total.', (t.valor - t.pago) USING ERRCODE = 'P0001';
  END IF;
  novo_status := CASE WHEN t.pago + total_aplicado >= t.valor - 0.009 THEN 'pago' ELSE 'parcial' END;
  UPDATE public.fin_titulos SET pago = pago + total_aplicado, status = novo_status WHERE id = t.id;
  UPDATE public.fin_historico SET status_novo = novo_status WHERE titulo_id = t.id AND status_novo IS NULL;
  RETURN jsonb_build_object('status', novo_status, 'pago', t.pago + total_aplicado);
END $$;
REVOKE EXECUTE ON FUNCTION public.fin__aplicar(uuid, jsonb, date, boolean) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.fin_baixar(_titulo uuid, _pagamentos jsonb, _data date, _excesso boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.tem_permissao('financeiro','baixar') THEN
    RAISE EXCEPTION 'Você não tem permissão para registrar pagamentos.' USING ERRCODE = '42501';
  END IF;
  RETURN public.fin__aplicar(_titulo, _pagamentos, _data, _excesso);
END $$;
REVOKE EXECUTE ON FUNCTION public.fin_baixar(uuid, jsonb, date, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fin_baixar(uuid, jsonb, date, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.fin_estornar(_mov uuid, _motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m public.fin_movimentos%ROWTYPE; t public.fin_titulos%ROWTYPE; novo_status text; aplicado numeric(14,2);
BEGIN
  IF NOT public.tem_permissao('financeiro','estornar') THEN
    RAISE EXCEPTION 'Você não tem permissão para estornar.' USING ERRCODE = '42501';
  END IF;
  IF length(trim(COALESCE(_motivo,''))) < 3 THEN RAISE EXCEPTION 'Informe a justificativa do estorno.' USING ERRCODE = 'P0001'; END IF;
  SELECT * INTO m FROM public.fin_movimentos WHERE id = _mov FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Movimentação não encontrada.' USING ERRCODE = 'P0001'; END IF;
  IF m.estornado OR m.tipo = 'estorno' THEN RAISE EXCEPTION 'Esta movimentação já foi estornada.' USING ERRCODE = 'P0001'; END IF;
  INSERT INTO public.fin_movimentos (data_mov, tipo, conta_id, valor, titulo_id, documento_id, forma_id, estorno_de, usuario_nome, data)
  VALUES (current_date, 'estorno', m.conta_id, -m.valor, m.titulo_id, m.documento_id, m.forma_id, m.id, public.fin_nome_usuario(), jsonb_build_object('obs', _motivo));
  UPDATE public.fin_movimentos SET estornado = true WHERE id = m.id;
  -- transferência: estorna também a perna correspondente
  IF m.tipo = 'transferencia' AND (m.data->>'par') IS NOT NULL THEN
    INSERT INTO public.fin_movimentos (data_mov, tipo, conta_id, valor, estorno_de, usuario_nome, data)
    SELECT current_date, 'estorno', x.conta_id, -x.valor, x.id, public.fin_nome_usuario(), jsonb_build_object('obs', _motivo)
    FROM public.fin_movimentos x WHERE x.id = (m.data->>'par')::uuid AND NOT x.estornado;
    UPDATE public.fin_movimentos SET estornado = true WHERE id = (m.data->>'par')::uuid;
  END IF;
  IF m.titulo_id IS NOT NULL THEN
    SELECT * INTO t FROM public.fin_titulos WHERE id = m.titulo_id FOR UPDATE;
    aplicado := COALESCE((m.data->>'aplicado')::numeric, abs(m.valor));
    novo_status := CASE WHEN t.pago - aplicado <= 0.009 THEN 'aberto' WHEN t.pago - aplicado >= t.valor - 0.009 THEN 'pago' ELSE 'parcial' END;
    PERFORM set_config('app.fin_interno', '1', true);
    UPDATE public.fin_titulos SET pago = greatest(0, pago - aplicado), status = CASE WHEN status = 'cancelado' THEN status ELSE novo_status END WHERE id = t.id;
    PERFORM public.fin_log('Estorno', abs(m.valor), m.conta_id, m.forma_id, t.id, t.documento_id, _motivo, t.status, novo_status);
  ELSE
    PERFORM public.fin_log('Estorno', abs(m.valor), m.conta_id, m.forma_id, NULL, m.documento_id, _motivo, NULL, NULL);
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.fin_estornar(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fin_estornar(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.fin_cancelar_titulo(_id uuid, _motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.fin_titulos%ROWTYPE;
BEGIN
  IF NOT public.tem_permissao('financeiro','cancelar') THEN
    RAISE EXCEPTION 'Você não tem permissão para cancelar contas.' USING ERRCODE = '42501';
  END IF;
  IF length(trim(COALESCE(_motivo,''))) < 3 THEN RAISE EXCEPTION 'Informe o motivo do cancelamento.' USING ERRCODE = 'P0001'; END IF;
  SELECT * INTO t FROM public.fin_titulos WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conta não encontrada.' USING ERRCODE = 'P0001'; END IF;
  IF t.status = 'cancelado' THEN RAISE EXCEPTION 'Esta conta já está cancelada.' USING ERRCODE = 'P0001'; END IF;
  IF t.pago > 0 THEN RAISE EXCEPTION 'Esta conta possui pagamentos. Estorne-os antes de cancelar.' USING ERRCODE = 'P0001'; END IF;
  PERFORM set_config('app.fin_interno', '1', true);
  UPDATE public.fin_titulos SET status = 'cancelado', data = data || jsonb_build_object('motivoCancelamento', _motivo) WHERE id = _id;
  PERFORM public.fin_log('Cancelamento', t.valor, NULL, NULL, t.id, t.documento_id, _motivo, t.status, 'cancelado');
END $$;
REVOKE EXECUTE ON FUNCTION public.fin_cancelar_titulo(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fin_cancelar_titulo(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.fin_transferir(_de uuid, _para uuid, _valor numeric, _data date, _obs text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a uuid := gen_random_uuid(); b uuid := gen_random_uuid();
BEGIN
  IF NOT public.tem_permissao('financeiro','editar') THEN
    RAISE EXCEPTION 'Você não tem permissão para transferir entre contas.' USING ERRCODE = '42501';
  END IF;
  IF _de = _para THEN RAISE EXCEPTION 'Escolha contas diferentes.' USING ERRCODE = 'P0001'; END IF;
  IF COALESCE(_valor,0) <= 0 THEN RAISE EXCEPTION 'O valor deve ser maior que zero.' USING ERRCODE = 'P0001'; END IF;
  IF (SELECT count(*) FROM public.fin_cadastros WHERE id IN (_de,_para) AND tipo = 'conta' AND ativo) <> 2 THEN
    RAISE EXCEPTION 'Selecione duas contas bancárias ativas.' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.fin_movimentos (id, data_mov, tipo, conta_id, valor, usuario_nome, data) VALUES
    (a, COALESCE(_data,current_date), 'transferencia', _de, -round(_valor,2), public.fin_nome_usuario(), jsonb_build_object('obs', COALESCE(_obs,''), 'par', b)),
    (b, COALESCE(_data,current_date), 'transferencia', _para, round(_valor,2), public.fin_nome_usuario(), jsonb_build_object('obs', COALESCE(_obs,''), 'par', a));
  PERFORM public.fin_log('Transferência bancária', _valor, _de, NULL, NULL, NULL, COALESCE(_obs,''), NULL, NULL);
END $$;
REVOKE EXECUTE ON FUNCTION public.fin_transferir(uuid, uuid, numeric, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fin_transferir(uuid, uuid, numeric, date, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.fin_ajustar(_conta uuid, _valor numeric, _data date, _motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.tem_permissao('financeiro','config') THEN
    RAISE EXCEPTION 'Você não tem permissão para ajustar saldo.' USING ERRCODE = '42501';
  END IF;
  IF length(trim(COALESCE(_motivo,''))) < 3 THEN RAISE EXCEPTION 'Informe a justificativa do ajuste.' USING ERRCODE = 'P0001'; END IF;
  IF COALESCE(_valor,0) = 0 THEN RAISE EXCEPTION 'O valor do ajuste não pode ser zero.' USING ERRCODE = 'P0001'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.fin_cadastros WHERE id = _conta AND tipo = 'conta') THEN
    RAISE EXCEPTION 'Conta bancária não encontrada.' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.fin_movimentos (data_mov, tipo, conta_id, valor, usuario_nome, data)
  VALUES (COALESCE(_data,current_date), 'ajuste', _conta, round(_valor,2), public.fin_nome_usuario(), jsonb_build_object('obs', _motivo));
  PERFORM public.fin_log('Ajuste manual de saldo', _valor, _conta, NULL, NULL, NULL, _motivo, NULL, NULL);
END $$;
REVOKE EXECUTE ON FUNCTION public.fin_ajustar(uuid, numeric, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fin_ajustar(uuid, numeric, date, text) TO authenticated;

-- Finalização da OS: cria a conta a receber (uma única vez) e registra os pagamentos.
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
  SELECT COALESCE(sum(greatest(0, COALESCE((i->>'quantidade')::numeric,0) * COALESCE((i->>'valorUnit')::numeric,0)
    - COALESCE((i->>'desconto')::numeric,0) + COALESCE((i->>'acrescimo')::numeric,0))),0)
    INTO total FROM jsonb_array_elements(COALESCE(o.data->'itens','[]'::jsonb)) i;
  IF total <= 0 THEN RAISE EXCEPTION 'A OS não possui valor a receber.' USING ERRCODE = 'P0001'; END IF;
  SELECT COALESCE(sum((p->>'valor')::numeric + COALESCE((p->>'desconto')::numeric,0)),0) INTO pago
    FROM jsonb_array_elements(COALESCE(_pagamentos,'[]'::jsonb)) p;
  IF pago > total + 0.009 AND NOT (_excesso AND public.eh_administrador()) THEN
    RAISE EXCEPTION 'O valor recebido ultrapassa o total da OS. Somente um administrador pode confirmar.' USING ERRCODE = 'P0001';
  END IF;
  desc_os := 'OS ' || COALESCE(o.data->>'numeroOS', o.numero::text);
  IF pago > 0 THEN
    INSERT INTO public.fin_titulos (tipo, origem, descricao, vencimento, valor, documento_id, cliente_id, grupo, parcela, parcelas)
    VALUES ('receber','os', desc_os || ' · pagamento na finalização', COALESCE(_data,current_date), least(pago, greatest(pago,total)), _orc, o.cliente_id, g, 1, 1)
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

-- Divide uma conta em aberto em parcelas.
CREATE OR REPLACE FUNCTION public.fin_parcelar(_id uuid, _parcelas integer, _primeiro date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.fin_titulos%ROWTYPE; i integer; v numeric(14,2); g uuid := gen_random_uuid();
BEGIN
  IF NOT (public.tem_permissao('financeiro','editar') AND public.tem_permissao('financeiro','criar')) THEN
    RAISE EXCEPTION 'Você não tem permissão para parcelar contas.' USING ERRCODE = '42501';
  END IF;
  IF COALESCE(_parcelas,0) < 2 OR _parcelas > 48 THEN RAISE EXCEPTION 'Informe de 2 a 48 parcelas.' USING ERRCODE = 'P0001'; END IF;
  SELECT * INTO t FROM public.fin_titulos WHERE id = _id FOR UPDATE;
  IF NOT FOUND OR t.status <> 'aberto' OR t.pago > 0 THEN RAISE EXCEPTION 'Somente contas em aberto, sem pagamentos, podem ser parceladas.' USING ERRCODE = 'P0001'; END IF;
  PERFORM set_config('app.fin_interno', '1', true);
  UPDATE public.fin_titulos SET status = 'cancelado', data = data || jsonb_build_object('motivoCancelamento', 'Dividida em ' || _parcelas || ' parcelas') WHERE id = _id;
  FOR i IN 1.._parcelas LOOP
    v := CASE WHEN i < _parcelas THEN round(t.valor / _parcelas, 2) ELSE t.valor - round(t.valor / _parcelas, 2) * (_parcelas - 1) END;
    INSERT INTO public.fin_titulos (tipo, origem, descricao, vencimento, valor, documento_id, cliente_id, categoria_id, grupo, parcela, parcelas, data)
    VALUES (t.tipo, t.origem, t.descricao || ' · parcela ' || i || '/' || _parcelas, (COALESCE(_primeiro, t.vencimento) + ((i-1) || ' month')::interval)::date,
      v, t.documento_id, t.cliente_id, t.categoria_id, g, i, _parcelas, t.data);
  END LOOP;
  PERFORM public.fin_log('Parcelamento', t.valor, NULL, NULL, t.id, t.documento_id, 'Dividida em ' || _parcelas || ' parcelas', t.status, 'cancelado');
END $$;
REVOKE EXECUTE ON FUNCTION public.fin_parcelar(uuid, integer, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fin_parcelar(uuid, integer, date) TO authenticated;

-- Não permite excluir OS/orçamento com financeiro ativo.
CREATE OR REPLACE FUNCTION public.fin_proteger_documento() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.fin_movimentos WHERE documento_id = OLD.id)
     OR EXISTS (SELECT 1 FROM public.fin_titulos WHERE documento_id = OLD.id AND status <> 'cancelado') THEN
    RAISE EXCEPTION 'Este documento possui lançamentos financeiros e não pode ser excluído.' USING ERRCODE = 'P0001';
  END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER fin_proteger_documento BEFORE DELETE ON public.orcamentos
  FOR EACH ROW EXECUTE FUNCTION public.fin_proteger_documento();

-- Comprovantes (bucket privado "financeiro")
CREATE POLICY financeiro_ler ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'financeiro' AND public.tem_permissao('financeiro','ver'));
CREATE POLICY financeiro_enviar ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'financeiro' AND (public.tem_permissao('financeiro','criar') OR public.tem_permissao('financeiro','baixar')));