import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { mesmoNome } from "@/lib/cadastros";

/** Seleção pesquisável de um cadastro (categoria/marca), com inclusão rápida sem sair do formulário. */
export function ComboCadastro({ label, value, onChange, opcoes, podeCriar, criar, error, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  opcoes: { nome: string; ativo: boolean }[];
  podeCriar: boolean;
  criar: (nome: string) => { nome: string };
  error?: string | undefined;
  placeholder?: string;
}) {
  const [q, setQ] = useState(value);
  const [aberto, setAberto] = useState(false);
  useEffect(() => setQ(value), [value]);
  const ativos = useMemo(() => opcoes.filter((o) => o.ativo), [opcoes]);
  const termo = q.trim().toLowerCase();
  const filtrados = (termo && !mesmoNome(q, value) ? ativos.filter((o) => o.nome.toLowerCase().includes(termo)) : ativos).slice(0, 50);
  const existe = opcoes.some((o) => mesmoNome(o.nome, q));
  const inativoAtual = value && !ativos.some((o) => mesmoNome(o.nome, value));

  const escolher = (nome: string) => { onChange(nome); setQ(nome); setAberto(false); };
  const novo = () => {
    try {
      escolher(criar(q).nome);
      toast.success("Cadastrado.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-metal">{label}</span>
      <div className="relative">
        <input
          className="field pr-9"
          value={q}
          placeholder={placeholder ?? "Pesquisar ou selecionar..."}
          onChange={(e) => { setQ(e.target.value); setAberto(true); if (!e.target.value) onChange(""); }}
          onFocus={() => setAberto(true)}
          onBlur={() => setTimeout(() => {
            setAberto(false);
            const achado = opcoes.find((o) => mesmoNome(o.nome, q));
            if (achado) onChange(achado.nome); else setQ(value);
          }, 150)}
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        {aberto && (
          <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-xl" onMouseDown={(e) => e.preventDefault()}>
            <ul className="max-h-60 overflow-y-auto">
              {filtrados.length === 0 && <li className="p-3 text-sm text-muted-foreground">Nada encontrado.</li>}
              {filtrados.map((o) => (
                <li key={o.nome}>
                  <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-accent" onClick={() => escolher(o.nome)}>{o.nome}</button>
                </li>
              ))}
            </ul>
            {podeCriar && q.trim() && !existe && (
              <button type="button" className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-sm text-primary hover:bg-accent" onClick={novo}>
                <Plus className="h-4 w-4" /> Cadastrar “{q.trim()}”
              </button>
            )}
          </div>
        )}
      </div>
      {inativoAtual && <span className="text-xs text-muted-foreground">“{value}” está inativo(a) ou fora da lista.</span>}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </label>
  );
}
