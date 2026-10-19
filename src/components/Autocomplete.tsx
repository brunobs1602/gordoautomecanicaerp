import { useMemo, useState, type ReactNode } from "react";
import { Search } from "lucide-react";

/** Campo de busca com sugestões e seleção rápida. */
export function Autocomplete<T>({ itens, filtrar, render, onSelect, placeholder, vazio, acaoExtra }: {
  itens: T[];
  filtrar: (item: T, termo: string) => boolean;
  render: (item: T) => ReactNode;
  onSelect: (item: T) => void;
  placeholder: string;
  vazio?: string;
  acaoExtra?: ReactNode;
}) {
  const [q, setQ] = useState("");
  const [aberto, setAberto] = useState(false);
  const resultados = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (t ? itens.filter((i) => filtrar(i, t)) : itens).slice(0, 8);
  }, [itens, q, filtrar]);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
      <input
        className="field pl-9"
        placeholder={placeholder}
        value={q}
        onChange={(e) => { setQ(e.target.value); setAberto(true); }}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
      />
      {aberto && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-xl">
          <ul className="max-h-64 overflow-y-auto">
            {resultados.length === 0 && <li className="p-3 text-sm text-muted-foreground">{vazio ?? "Nada encontrado."}</li>}
            {resultados.map((i, idx) => (
              <li key={idx}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-accent"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { onSelect(i); setQ(""); setAberto(false); }}
                >
                  {render(i)}
                </button>
              </li>
            ))}
          </ul>
          {acaoExtra && <div className="border-t border-border p-2" onMouseDown={(e) => e.preventDefault()}>{acaoExtra}</div>}
        </div>
      )}
    </div>
  );
}
