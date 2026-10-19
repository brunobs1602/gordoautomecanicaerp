import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { useClientes } from "@/lib/clientes";
import { mascaraDocumento, mascaraTelefone, soDigitos } from "@/lib/validacao";

/** Campo de busca e seleção de cliente cadastrado. */
export function ClienteSelect({ value, onChange, error }: { value: string; onChange: (id: string) => void; error?: string | undefined }) {
  const clientes = useClientes();
  const [q, setQ] = useState("");
  const selecionado = clientes.find((c) => c.id === value);

  const resultados = useMemo(() => {
    const t = q.trim().toLowerCase();
    const d = soDigitos(t);
    if (!t) return clientes.filter((c) => c.ativo).slice(0, 8);
    return clientes
      .filter((c) => c.nome.toLowerCase().includes(t) || (d && (c.documento.includes(d) || soDigitos(c.telefone).includes(d))))
      .slice(0, 8);
  }, [clientes, q]);

  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium text-metal">Cliente proprietário *</span>
      {selecionado ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-primary/60 bg-background p-3">
          <div className="min-w-0">
            <div className="truncate font-medium">{selecionado.nome}</div>
            <div className="text-xs text-muted-foreground">
              {mascaraDocumento(selecionado.documento, selecionado.tipo)} · {mascaraTelefone(selecionado.telefone) || "sem telefone"}
            </div>
          </div>
          <button type="button" className="btn-ghost px-2.5" onClick={() => onChange("")} title="Trocar cliente">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="rounded-md border border-input bg-background">
          <div className="relative border-b border-border">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input className="field border-0 pl-9 focus:shadow-none" placeholder="Pesquisar por nome, CPF/CNPJ ou telefone" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <ul className="max-h-60 overflow-y-auto">
            {resultados.length === 0 && <li className="p-3 text-sm text-muted-foreground">Nenhum cliente encontrado.</li>}
            {resultados.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => onChange(c.id)} className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-accent">
                  <span className="text-sm font-medium">{c.nome}{!c.ativo && <span className="ml-2 text-xs text-muted-foreground">(inativo)</span>}</span>
                  <span className="text-xs text-muted-foreground">{mascaraDocumento(c.documento, c.tipo)} · {mascaraTelefone(c.telefone) || "sem telefone"}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
