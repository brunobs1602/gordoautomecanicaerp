import { criarMarca, podeCriarMarca, useMarcas } from "@/lib/cadastros";
import { ComboCadastro } from "@/components/ComboCadastro";

export function MarcaCombo({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string | undefined }) {
  const marcas = useMarcas();
  return <ComboCadastro label="Marca" value={value} onChange={onChange} opcoes={marcas} podeCriar={podeCriarMarca()} criar={criarMarca} error={error} placeholder="Pesquisar marca..." />;
}
