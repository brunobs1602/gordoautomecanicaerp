-- Perfis de acesso
CREATE TABLE public.perfis (
  id text PRIMARY KEY,
  nome text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  ativo boolean NOT NULL DEFAULT true,
  permissoes jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX perfis_nome_unico ON public.perfis (lower(nome));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfis TO authenticated;
GRANT ALL ON public.perfis TO service_role;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- Dados dos usuários (a senha fica apenas no sistema de autenticação)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL,
  telefone text NOT NULL DEFAULT '',
  ativo boolean NOT NULL DEFAULT true,
  ultimo_acesso timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX profiles_email_unico ON public.profiles (lower(email));
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Vínculo usuário -> perfil (tabela separada, só alterável por quem gerencia usuários)
CREATE TABLE public.user_perfis (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  perfil_id text NOT NULL REFERENCES public.perfis(id) ON DELETE RESTRICT
);
GRANT SELECT, UPDATE ON public.user_perfis TO authenticated;
GRANT ALL ON public.user_perfis TO service_role;
ALTER TABLE public.user_perfis ENABLE ROW LEVEL SECURITY;

-- Regra central de permissão
CREATE OR REPLACE FUNCTION public.tem_permissao(_modulo text, _acao text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles pr
    JOIN public.user_perfis up ON up.user_id = pr.id
    JOIN public.perfis p ON p.id = up.perfil_id
    WHERE pr.id = auth.uid() AND pr.ativo AND p.ativo
      AND (p.id = 'admin' OR COALESCE(p.permissoes -> _modulo, '[]'::jsonb) ? _acao)
  )
$$;
GRANT EXECUTE ON FUNCTION public.tem_permissao(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.precisa_configuracao_inicial()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.user_perfis WHERE perfil_id = 'admin')
$$;
GRANT EXECUTE ON FUNCTION public.precisa_configuracao_inicial() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.registrar_acesso()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles SET ultimo_acesso = now() WHERE id = auth.uid()
$$;
GRANT EXECUTE ON FUNCTION public.registrar_acesso() TO authenticated;

-- Sempre deve existir ao menos um administrador ativo
CREATE OR REPLACE FUNCTION public.garantir_admin_ativo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles) AND NOT EXISTS (
    SELECT 1 FROM public.profiles pr JOIN public.user_perfis up ON up.user_id = pr.id
    WHERE up.perfil_id = 'admin' AND pr.ativo
  ) THEN
    RAISE EXCEPTION 'O sistema precisa de pelo menos um administrador ativo.';
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER profiles_admin_ativo AFTER UPDATE OR DELETE ON public.profiles
  FOR EACH STATEMENT EXECUTE FUNCTION public.garantir_admin_ativo();
CREATE TRIGGER user_perfis_admin_ativo AFTER UPDATE OR DELETE ON public.user_perfis
  FOR EACH STATEMENT EXECUTE FUNCTION public.garantir_admin_ativo();

-- O perfil Administrador não pode ser inativado nem excluído
CREATE OR REPLACE FUNCTION public.proteger_perfil_admin()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.id = 'admin' THEN RAISE EXCEPTION 'O perfil Administrador não pode ser excluído.'; END IF;
  IF TG_OP = 'UPDATE' AND OLD.id = 'admin' AND NEW.ativo = false THEN RAISE EXCEPTION 'O perfil Administrador não pode ser inativado.'; END IF;
  IF TG_OP = 'UPDATE' THEN NEW.atualizado_em = now(); END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER perfis_proteger BEFORE UPDATE OR DELETE ON public.perfis
  FOR EACH ROW EXECUTE FUNCTION public.proteger_perfil_admin();

CREATE POLICY "perfis_ler" ON public.perfis FOR SELECT TO authenticated USING (true);
CREATE POLICY "perfis_criar" ON public.perfis FOR INSERT TO authenticated WITH CHECK (public.tem_permissao('perfis','criar'));
CREATE POLICY "perfis_editar" ON public.perfis FOR UPDATE TO authenticated
  USING (public.tem_permissao('perfis','editar') OR public.tem_permissao('perfis','inativar'))
  WITH CHECK (public.tem_permissao('perfis','editar') OR public.tem_permissao('perfis','inativar'));
CREATE POLICY "perfis_excluir" ON public.perfis FOR DELETE TO authenticated USING (public.tem_permissao('perfis','excluir'));

CREATE POLICY "profiles_ler" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.tem_permissao('usuarios','ver'));
CREATE POLICY "profiles_editar" ON public.profiles FOR UPDATE TO authenticated
  USING (public.tem_permissao('usuarios','editar') OR public.tem_permissao('usuarios','inativar'))
  WITH CHECK (public.tem_permissao('usuarios','editar') OR public.tem_permissao('usuarios','inativar'));

CREATE POLICY "user_perfis_ler" ON public.user_perfis FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.tem_permissao('usuarios','ver'));
CREATE POLICY "user_perfis_editar" ON public.user_perfis FOR UPDATE TO authenticated
  USING (public.tem_permissao('usuarios','editar')) WITH CHECK (public.tem_permissao('usuarios','editar'));

-- Auditoria (somente inclusão; nunca apagada)
CREATE TABLE public.auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data timestamptz NOT NULL DEFAULT now(),
  admin_id uuid NOT NULL DEFAULT auth.uid(),
  admin_nome text NOT NULL DEFAULT '',
  tipo text NOT NULL,
  alvo text NOT NULL DEFAULT '',
  descricao text NOT NULL DEFAULT '',
  secao text,
  antes text,
  depois text
);
GRANT SELECT, INSERT ON public.auditoria TO authenticated;
GRANT ALL ON public.auditoria TO service_role;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auditoria_incluir" ON public.auditoria FOR INSERT TO authenticated WITH CHECK (admin_id = auth.uid());
CREATE POLICY "auditoria_ler" ON public.auditoria FOR SELECT TO authenticated
  USING (public.tem_permissao('usuarios','ver') OR public.tem_permissao('perfis','ver') OR public.tem_permissao('configuracoes','config'));

-- Configurações (linha única)
CREATE TABLE public.configuracoes (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_por uuid DEFAULT auth.uid()
);
GRANT SELECT, INSERT, UPDATE ON public.configuracoes TO authenticated;
GRANT ALL ON public.configuracoes TO service_role;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "config_ler" ON public.configuracoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "config_incluir" ON public.configuracoes FOR INSERT TO authenticated WITH CHECK (public.tem_permissao('configuracoes','config'));
CREATE POLICY "config_alterar" ON public.configuracoes FOR UPDATE TO authenticated
  USING (public.tem_permissao('configuracoes','config')) WITH CHECK (public.tem_permissao('configuracoes','config'));

-- Carimbo de data e responsável nas alterações
CREATE OR REPLACE FUNCTION public.carimbar_alteracao()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.atualizado_em = now();
  NEW.atualizado_por = auth.uid();
  RETURN NEW;
END $$;
CREATE TRIGGER configuracoes_carimbo BEFORE UPDATE ON public.configuracoes FOR EACH ROW EXECUTE FUNCTION public.carimbar_alteracao();

-- Cadastros operacionais
CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento text NOT NULL DEFAULT '',
  ativo boolean NOT NULL DEFAULT true,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(),
  criado_por uuid DEFAULT auth.uid(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_por uuid DEFAULT auth.uid()
);
CREATE UNIQUE INDEX clientes_documento_unico ON public.clientes (documento) WHERE documento <> '';

CREATE TABLE public.veiculos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  placa text NOT NULL DEFAULT '',
  ativo boolean NOT NULL DEFAULT true,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(),
  criado_por uuid DEFAULT auth.uid(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_por uuid DEFAULT auth.uid()
);
CREATE UNIQUE INDEX veiculos_placa_unica ON public.veiculos (placa) WHERE placa <> '';
CREATE INDEX veiculos_cliente ON public.veiculos (cliente_id);

CREATE TABLE public.produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL DEFAULT '',
  ativo boolean NOT NULL DEFAULT true,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(),
  criado_por uuid DEFAULT auth.uid(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_por uuid DEFAULT auth.uid()
);
CREATE UNIQUE INDEX produtos_codigo_unico ON public.produtos (upper(codigo)) WHERE codigo <> '';

CREATE TABLE public.servicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ativo boolean NOT NULL DEFAULT true,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(),
  criado_por uuid DEFAULT auth.uid(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_por uuid DEFAULT auth.uid()
);

CREATE TABLE public.orcamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero integer NOT NULL UNIQUE,
  tipo text NOT NULL DEFAULT 'orcamento' CHECK (tipo IN ('orcamento','os')),
  status text NOT NULL DEFAULT 'rascunho',
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE RESTRICT,
  veiculo_id uuid REFERENCES public.veiculos(id) ON DELETE RESTRICT,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(),
  criado_por uuid DEFAULT auth.uid(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_por uuid DEFAULT auth.uid()
);
CREATE INDEX orcamentos_cliente ON public.orcamentos (cliente_id);
CREATE INDEX orcamentos_veiculo ON public.orcamentos (veiculo_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes, public.veiculos, public.produtos, public.servicos TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.orcamentos TO authenticated;
GRANT ALL ON public.clientes, public.veiculos, public.produtos, public.servicos, public.orcamentos TO service_role;

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER clientes_carimbo BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.carimbar_alteracao();
CREATE TRIGGER veiculos_carimbo BEFORE UPDATE ON public.veiculos FOR EACH ROW EXECUTE FUNCTION public.carimbar_alteracao();
CREATE TRIGGER produtos_carimbo BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.carimbar_alteracao();
CREATE TRIGGER servicos_carimbo BEFORE UPDATE ON public.servicos FOR EACH ROW EXECUTE FUNCTION public.carimbar_alteracao();
CREATE TRIGGER orcamentos_carimbo BEFORE UPDATE ON public.orcamentos FOR EACH ROW EXECUTE FUNCTION public.carimbar_alteracao();

-- Clientes e veículos também são lidos por quem trabalha com orçamentos/OS
CREATE POLICY "clientes_ler" ON public.clientes FOR SELECT TO authenticated USING (
  public.tem_permissao('clientes','ver') OR public.tem_permissao('orcamentos','ver') OR public.tem_permissao('ordens','ver'));
CREATE POLICY "clientes_criar" ON public.clientes FOR INSERT TO authenticated WITH CHECK (public.tem_permissao('clientes','criar'));
CREATE POLICY "clientes_editar" ON public.clientes FOR UPDATE TO authenticated
  USING (public.tem_permissao('clientes','editar') OR public.tem_permissao('clientes','inativar'))
  WITH CHECK (public.tem_permissao('clientes','editar') OR public.tem_permissao('clientes','inativar'));
CREATE POLICY "clientes_excluir" ON public.clientes FOR DELETE TO authenticated USING (public.tem_permissao('clientes','excluir'));

CREATE POLICY "veiculos_ler" ON public.veiculos FOR SELECT TO authenticated USING (
  public.tem_permissao('veiculos','ver') OR public.tem_permissao('clientes','ver') OR public.tem_permissao('orcamentos','ver') OR public.tem_permissao('ordens','ver'));
CREATE POLICY "veiculos_criar" ON public.veiculos FOR INSERT TO authenticated WITH CHECK (public.tem_permissao('veiculos','criar'));
CREATE POLICY "veiculos_editar" ON public.veiculos FOR UPDATE TO authenticated
  USING (public.tem_permissao('veiculos','editar') OR public.tem_permissao('veiculos','inativar'))
  WITH CHECK (public.tem_permissao('veiculos','editar') OR public.tem_permissao('veiculos','inativar'));
CREATE POLICY "veiculos_excluir" ON public.veiculos FOR DELETE TO authenticated USING (public.tem_permissao('veiculos','excluir'));

CREATE POLICY "produtos_ler" ON public.produtos FOR SELECT TO authenticated USING (
  public.tem_permissao('produtos','ver') OR public.tem_permissao('orcamentos','ver') OR public.tem_permissao('ordens','ver'));
CREATE POLICY "produtos_criar" ON public.produtos FOR INSERT TO authenticated WITH CHECK (public.tem_permissao('produtos','criar'));
CREATE POLICY "produtos_editar" ON public.produtos FOR UPDATE TO authenticated
  USING (public.tem_permissao('produtos','editar') OR public.tem_permissao('produtos','inativar') OR public.tem_permissao('estoque','editar'))
  WITH CHECK (public.tem_permissao('produtos','editar') OR public.tem_permissao('produtos','inativar') OR public.tem_permissao('estoque','editar'));
CREATE POLICY "produtos_excluir" ON public.produtos FOR DELETE TO authenticated USING (public.tem_permissao('configuracoes','config'));

CREATE POLICY "servicos_ler" ON public.servicos FOR SELECT TO authenticated USING (
  public.tem_permissao('servicos','ver') OR public.tem_permissao('orcamentos','ver') OR public.tem_permissao('ordens','ver'));
CREATE POLICY "servicos_criar" ON public.servicos FOR INSERT TO authenticated WITH CHECK (public.tem_permissao('servicos','criar'));
CREATE POLICY "servicos_editar" ON public.servicos FOR UPDATE TO authenticated
  USING (public.tem_permissao('servicos','editar') OR public.tem_permissao('servicos','inativar'))
  WITH CHECK (public.tem_permissao('servicos','editar') OR public.tem_permissao('servicos','inativar'));
CREATE POLICY "servicos_excluir" ON public.servicos FOR DELETE TO authenticated USING (public.tem_permissao('configuracoes','config'));

CREATE POLICY "orcamentos_ler" ON public.orcamentos FOR SELECT TO authenticated USING (
  (tipo = 'orcamento' AND public.tem_permissao('orcamentos','ver')) OR (tipo = 'os' AND public.tem_permissao('ordens','ver')));
CREATE POLICY "orcamentos_criar" ON public.orcamentos FOR INSERT TO authenticated WITH CHECK (
  public.tem_permissao('orcamentos','criar') OR public.tem_permissao('configuracoes','config'));
CREATE POLICY "orcamentos_alterar" ON public.orcamentos FOR UPDATE TO authenticated
  USING (public.tem_permissao('orcamentos','editar') OR public.tem_permissao('orcamentos','status') OR public.tem_permissao('orcamentos','aprovar')
      OR public.tem_permissao('orcamentos','reabrir') OR public.tem_permissao('ordens','editar') OR public.tem_permissao('ordens','status') OR public.tem_permissao('ordens','criar'))
  WITH CHECK (public.tem_permissao('orcamentos','editar') OR public.tem_permissao('orcamentos','status') OR public.tem_permissao('orcamentos','aprovar')
      OR public.tem_permissao('orcamentos','reabrir') OR public.tem_permissao('ordens','editar') OR public.tem_permissao('ordens','status') OR public.tem_permissao('ordens','criar'));

-- Perfis iniciais e configuração padrão
INSERT INTO public.perfis (id, nome, descricao, permissoes) VALUES
 ('admin','Administrador','Acesso total ao sistema.','{}'),
 ('funcionario','Funcionário','Rotina da oficina, sem gestão de usuários.','{"dashboard":["ver"],"clientes":["ver","criar","editar"],"veiculos":["ver","criar","editar"],"orcamentos":["ver","criar","editar","exportar","aprovar","reabrir","status"],"ordens":["ver","criar","editar","exportar","status"],"produtos":["ver","criar","editar"],"estoque":["ver"],"servicos":["ver","criar","editar"]}'),
 ('atendimento','Atendimento','Cadastra clientes, veículos e orçamentos.','{"dashboard":["ver"],"clientes":["ver","criar","editar"],"veiculos":["ver","criar","editar"],"orcamentos":["ver","criar","editar","exportar"],"ordens":["ver"],"produtos":["ver"],"servicos":["ver"]}'),
 ('mecanico','Mecânico','Consulta veículos e ordens de serviço.','{"dashboard":["ver"],"veiculos":["ver"],"ordens":["ver","status"],"produtos":["ver"],"estoque":["ver"],"servicos":["ver"]}'),
 ('financeiro','Financeiro','Consulta orçamentos e relatórios financeiros.','{"dashboard":["ver"],"clientes":["ver"],"orcamentos":["ver","exportar"],"ordens":["ver","exportar"],"relatorios":["ver","exportar"]}');
INSERT INTO public.configuracoes (id, data) VALUES (1, '{}');

-- Arquivos da marca (logos e ícone): leitura pública, envio só por quem gerencia configurações
CREATE POLICY "marca_enviar" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'marca' AND public.tem_permissao('configuracoes','config'));
CREATE POLICY "marca_alterar" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'marca' AND public.tem_permissao('configuracoes','config'));
CREATE POLICY "marca_remover" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'marca' AND public.tem_permissao('configuracoes','config'));