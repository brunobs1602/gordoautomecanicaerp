import { useState } from "react";
import { Ban, CheckCircle2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  criarCategoria, criarMarca, editarCategoria, editarMarca, excluirCategoria, mesmoNome, statusCategoria, statusMarca,
  useCategorias, useMarcas, type TipoCategoria,
} from "@/lib/cadastros";
import { renomearCategoriaProdutos, useProdutos } from "@/lib/produtos";
import { renomearCategoriaServicos, useServicos } from "@/lib/servicos";
import { renomearMarcaVeiculos, useVeiculos } from "@/lib/veiculos";
import { StatusBadge } from "@/components/clientes/StatusBadge";

type Linha = { id: string; nome: string; ativo: boolean; usos: number };

function Gerenciador({ titulo, desc, linhas, rotuloUsos, onCriar, onEditar, onStatus, onExcluir }: {
  titulo: string; desc: string; linhas: Linha[]; rotuloUsos: string;
  onCriar: (n: string) => void; onEditar: (id: string, n: string) => void; onStatus: (id: string, a: boolean) => void;
  onExcluir?: (l: Linha) => void;
}) {
  const [busca, setBusca] = useState("");
  const [novo, setNovo] = useState("");
  const [editando, setEditando] = useState<{ id: string; nome: string } | null>(null);
  const q = busca.trim().toLowerCase();
  const lista = linhas.filter((l) => !q || l.nome.toLowerCase().includes(q));
  const tentar = (fn: () => void, ok: string) => {
    try { fn(); toast.success(ok); return true; } catch (e) { toast.error((e as Error).message); return false; }
  };

  return (
    <section className="panel p-5">
      <h2 className="text-lg font-bold uppercase text-metal">{titulo}</h2>
      <p className="mb-4 text-sm text-muted-foreground">{desc}</p>
      <form
        className="mb-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => { e.preventDefault(); if (tentar(() => onCriar(novo), "Cadastrado.")) setNovo(""); }}
      >
        <input className="field flex-1" placeholder="Novo nome..." value={novo} onChange={(e) => setNovo(e.target.value)} />
        <button className="btn-primary" disabled={!novo.trim()}><Plus className="h-4 w-4" /> Adicionar</button>
      </form>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input className="field pl-9" placeholder="Pesquisar..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="p-3">Nome</th><th className="p-3 text-right">{rotuloUsos}</th><th className="p-3">Status</th><th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Nada encontrado.</td></tr>}
            {lista.map((l) => (
              <tr key={l.id} className="border-b border-border/60 last:border-0">
                <td className="p-3">
                  {editando?.id === l.id ? (
                    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (tentar(() => onEditar(l.id, editando.nome), "Alterado.")) setEditando(null); }}>
                      <input autoFocus className="field h-9" value={editando.nome} onChange={(e) => setEditando({ id: l.id, nome: e.target.value })} />
                      <button className="btn-primary h-9 px-3">Salvar</button>
                      <button type="button" className="btn-ghost h-9 px-3" onClick={() => setEditando(null)}>Cancelar</button>
                    </form>
                  ) : <span className="font-medium">{l.nome}</span>}
                </td>
                <td className="p-3 text-right tabular-nums">{l.usos}</td>
                <td className="p-3"><StatusBadge ativo={l.ativo} /></td>
                <td className="p-3">
                  <div className="flex justify-end gap-1.5">
                    <button className="btn-ghost px-2.5" title="Editar" onClick={() => setEditando({ id: l.id, nome: l.nome })}><Pencil className="h-4 w-4" /></button>
                    <button className="btn-ghost px-2.5" title={l.ativo ? "Inativar" : "Ativar"} onClick={() => tentar(() => onStatus(l.id, !l.ativo), l.ativo ? "Inativado." : "Ativado.")}>
                      {l.ativo ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    </button>
                    {onExcluir && (
                      <button className="btn-ghost px-2.5" title={l.usos ? "Em uso — transfira os registros antes" : "Excluir"} onClick={() => onExcluir(l)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function GerenciarCategorias({ tipo }: { tipo: TipoCategoria }) {
  const cats = useCategorias(tipo);
  const produtos = useProdutos();
  const servicos = useServicos();
  const itens: { categoria: string }[] = tipo === "produto" ? produtos : servicos;
  const linhas = cats.map((c) => ({ ...c, usos: itens.filter((i) => mesmoNome(i.categoria, c.nome)).length }));
  const renomear = tipo === "produto" ? renomearCategoriaProdutos : renomearCategoriaServicos;
  return (
    <Gerenciador
      titulo={tipo === "produto" ? "Categorias de produtos" : "Categorias de serviços"}
      desc="Categorias inativas não aparecem em novos cadastros, mas continuam nos registros antigos. Categorias em uso não podem ser excluídas."
      linhas={linhas}
      rotuloUsos={tipo === "produto" ? "Produtos" : "Serviços"}
      onCriar={(n) => criarCategoria(tipo, n)}
      onEditar={(id, n) => editarCategoria(id, n, renomear)}
      onStatus={statusCategoria}
      onExcluir={(l) => {
        if (!confirm(`Excluir a categoria "${l.nome}"?`)) return;
        try { excluirCategoria(l.id, l.usos); toast.success("Categoria excluída."); } catch (e) { toast.error((e as Error).message); }
      }}
    />
  );
}

export function GerenciarMarcas() {
  const marcas = useMarcas();
  const veiculos = useVeiculos();
  const linhas = marcas.map((m) => ({ ...m, usos: veiculos.filter((v) => mesmoNome(v.marca, m.nome)).length }));
  return (
    <Gerenciador
      titulo="Marcas de veículos"
      desc="Marcas inativas não aparecem em novos cadastros, mas continuam vinculadas aos veículos antigos."
      linhas={linhas}
      rotuloUsos="Veículos"
      onCriar={criarMarca}
      onEditar={(id, n) => editarMarca(id, n, renomearMarcaVeiculos)}
      onStatus={statusMarca}
    />
  );
}
