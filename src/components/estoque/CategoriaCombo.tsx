import { criarCategoria, podeCriarCategoria, useCategorias, type TipoCategoria } from "@/lib/cadastros";
import { ComboCadastro } from "@/components/ComboCadastro";

export function CategoriaCombo({ tipo, value, onChange }: { tipo: TipoCategoria; value: string; onChange: (v: string) => void }) {
  const cats = useCategorias(tipo);
  return <ComboCadastro label="Categoria" value={value} onChange={onChange} opcoes={cats} podeCriar={podeCriarCategoria(tipo)} criar={(n) => criarCategoria(tipo, n)} placeholder="Pesquisar categoria..." />;
}
