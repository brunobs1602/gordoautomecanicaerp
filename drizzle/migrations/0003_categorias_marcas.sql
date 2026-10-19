CREATE TABLE public.categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('produto','servico')),
  nome text NOT NULL CHECK (char_length(trim(nome)) BETWEEN 1 AND 60),
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX categorias_nome_unico ON public.categorias (tipo, lower(trim(nome)));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias TO authenticated;
GRANT ALL ON public.categorias TO service_role;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categorias_ler" ON public.categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY "categorias_criar" ON public.categorias FOR INSERT TO authenticated WITH CHECK (
  public.tem_permissao('configuracoes','config')
  OR (tipo = 'produto' AND (public.tem_permissao('produtos','criar') OR public.tem_permissao('produtos','editar')))
  OR (tipo = 'servico' AND (public.tem_permissao('servicos','criar') OR public.tem_permissao('servicos','editar'))));
CREATE POLICY "categorias_editar" ON public.categorias FOR UPDATE TO authenticated
  USING (public.tem_permissao('configuracoes','config')) WITH CHECK (public.tem_permissao('configuracoes','config'));
CREATE POLICY "categorias_excluir" ON public.categorias FOR DELETE TO authenticated USING (public.tem_permissao('configuracoes','config'));

CREATE TABLE public.marcas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL CHECK (char_length(trim(nome)) BETWEEN 1 AND 60),
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX marcas_nome_unico ON public.marcas (lower(trim(nome)));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marcas TO authenticated;
GRANT ALL ON public.marcas TO service_role;
ALTER TABLE public.marcas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "marcas_ler" ON public.marcas FOR SELECT TO authenticated USING (true);
CREATE POLICY "marcas_criar" ON public.marcas FOR INSERT TO authenticated WITH CHECK (
  public.tem_permissao('configuracoes','config') OR public.tem_permissao('veiculos','criar') OR public.tem_permissao('veiculos','editar'));
CREATE POLICY "marcas_editar" ON public.marcas FOR UPDATE TO authenticated
  USING (public.tem_permissao('configuracoes','config')) WITH CHECK (public.tem_permissao('configuracoes','config'));
CREATE POLICY "marcas_excluir" ON public.marcas FOR DELETE TO authenticated USING (public.tem_permissao('configuracoes','config'));

INSERT INTO public.categorias (tipo, nome) SELECT 'produto', n FROM unnest(ARRAY['Lubrificantes e óleos','Filtros','Freios','Suspensão','Direção','Motor','Correias','Velas e ignição','Sistema elétrico','Baterias','Pneus e rodas','Arrefecimento','Embreagem','Escapamento','Acessórios','Higienização e limpeza','Peças de acabamento','Outros']) n;
INSERT INTO public.categorias (tipo, nome) SELECT 'servico', n FROM unnest(ARRAY['Revisão preventiva','Troca de óleo','Freios','Suspensão','Direção','Motor','Injeção eletrônica','Diagnóstico eletrônico','Sistema elétrico','Ar-condicionado','Embreagem','Câmbio','Alinhamento e balanceamento','Pneus','Bateria','Arrefecimento','Escapamento','Funilaria e pintura','Higienização','Instalação de acessórios','Outros']) n;
INSERT INTO public.marcas (nome) SELECT n FROM unnest(ARRAY['Chevrolet','Volkswagen','Fiat','Ford','Toyota','Honda','Hyundai','Renault','Nissan','Jeep','Mitsubishi','Peugeot','Citroën','BMW','Mercedes-Benz','Audi','Volvo','Kia','Suzuki','Yamaha','Kawasaki','Harley-Davidson','Ducati','Iveco','Scania','Volvo Caminhões','Mercedes-Benz Caminhões','Chery','BYD','Land Rover','RAM','Dodge','Mini','Porsche','Lexus','Subaru','Dafra','Shineray']) n;