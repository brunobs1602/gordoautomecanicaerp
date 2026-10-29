-- Completa categorias financeiras padrão e preserva vínculos antigos
-- Aplicada no Lovable Cloud pela extensão, com autorização do usuário.
-- Registrada por GeckoAI em 2026-10-29T20:28:06.867Z

DO $$
BEGIN
  LOCK TABLE public.fin_cadastros IN SHARE ROW EXCLUSIVE MODE;

  WITH padrao(nome, natureza) AS (
    VALUES
      ('Serviços de mão de obra', 'receita'),
      ('Peças e componentes', 'receita'),
      ('Venda de produtos', 'receita'),
      ('Revisões e manutenção', 'receita'),
      ('Outros recebimentos', 'receita'),
      ('Compra de peças e produtos', 'despesa'),
      ('Fornecedores', 'despesa'),
      ('Salários e encargos', 'despesa'),
      ('Aluguel', 'despesa'),
      ('Água, energia e internet', 'despesa'),
      ('Impostos e taxas', 'despesa'),
      ('Ferramentas e equipamentos', 'despesa'),
      ('Manutenção da oficina', 'despesa'),
      ('Combustível e transporte', 'despesa'),
      ('Marketing e publicidade', 'despesa'),
      ('Despesas bancárias', 'despesa'),
      ('Outras despesas', 'despesa')
  )
  INSERT INTO public.fin_cadastros (tipo, nome, ativo, data)
  SELECT 'categoria', p.nome, true, jsonb_build_object('natureza', p.natureza)
  FROM padrao p
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.fin_cadastros c
    WHERE c.tipo = 'categoria'
      AND c.data->>'natureza' = p.natureza
      AND translate(lower(btrim(regexp_replace(c.nome, '[[:space:]]+', ' ', 'g'))),
                    'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')
        = translate(lower(btrim(regexp_replace(p.nome, '[[:space:]]+', ' ', 'g'))),
                    'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')
  );
END;
$$;
