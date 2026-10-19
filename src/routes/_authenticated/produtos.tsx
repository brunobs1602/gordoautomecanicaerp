import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Package, Pencil, Plus, Power, Search } from "lucide-react";
import { toast } from "sonner";
import { alterarStatusProduto, atualizarProduto, criarProduto, estoqueBaixo, produtoVazio, useProdutos, type Produto } from "@/lib/produtos";
import { useCurrentUser } from "@/lib/auth";
import { moeda } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Modal } from "@/components/Modal";
import { StatusBadge } from "@/components/clientes/StatusBadge";
import { ProdutoForm } from "@/components/estoque/ProdutoForm";

export const Route = createFileRoute("/_authenticated/produtos")({
  head: () => ({
    meta: [
      { title: "Produtos e peças · Gordo Auto Mecânica ERP" },
      { name: "description", content: "Cadastro de produtos, peças e estoque." },
      { property: "og:title", content: "Produtos e peças · Gordo ERP" },
      { property: "og:description", content: "Cadastro de produtos, peças e estoque." },
    ],
  }),
  component: Produtos,
});

function Produtos() {
  const produtos = useProdutos();
  const isAdmin = useCurrentUser()?.role === "admin";
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const [baixo, setBaixo] = useState(false);
  const [editando, setEditando] = useState<Produto | "novo" | null>(null);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return produtos
      .filter((p) => (!status || String(p.ativo) === status) && (!baixo || estoqueBaixo(p)))
      .filter((p) => !q || p.nome.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q) || p.codigoBarras.includes(q) || p.categoria.toLowerCase().includes(q))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [produtos, busca, status, baixo]);
  const qtdBaixo = produtos.filter((p) => p.ativo && estoqueBaixo(p)).length;

  return (
    <>
      <PageHeader
        title="Produtos e peças"
        subtitle={`${produtos.length} produto(s)${qtdBaixo ? ` · ${qtdBaixo} com estoque baixo` : ""}`}
        action={<button className="btn-primary" onClick={() => setEditando("novo")}><Plus className="h-4 w-4" /> Novo produto</button>}
      />
      <div className="panel mb-4 grid gap-3 p-4 md:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input className="field pl-9" placeholder="Buscar por nome, código ou categoria" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <select className="field md:w-40" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">Todos status</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select>
        <label className="flex h-11 items-center gap-2 rounded-md border border-input px-3 text-sm">
          <input type="checkbox" className="accent-primary" checked={baixo} onChange={(e) => setBaixo(e.target.checked)} /> Estoque baixo
        </label>
      </div>

      {produtos.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 p-12 text-center">
          <Package className="h-10 w-10 text-primary" />
          <h2 className="text-2xl font-bold uppercase">Nenhum produto cadastrado</h2>
          <button className="btn-primary mt-2" onClick={() => setEditando("novo")}><Plus className="h-4 w-4" /> Novo produto</button>
        </div>
      ) : lista.length === 0 ? (
        <div className="panel p-10 text-center text-muted-foreground">Nenhum produto encontrado.</div>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="p-4">Produto</th><th className="p-4">Código</th><th className="p-4">Categoria</th>
                <th className="p-4 text-right">Venda</th><th className="p-4 text-right">Estoque</th><th className="p-4">Status</th><th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                  <td className="p-4"><div className="font-medium">{p.nome}</div><div className="text-xs text-muted-foreground">{[p.marca, p.localizacao].filter(Boolean).join(" · ")}</div></td>
                  <td className="p-4 font-mono text-xs">{p.codigo || "—"}</td>
                  <td className="p-4">{p.categoria || "—"}</td>
                  <td className="p-4 text-right">{moeda(p.preco)}</td>
                  <td className="p-4 text-right">
                    <span className={`inline-flex items-center gap-1 font-semibold ${estoqueBaixo(p) ? "text-warning" : ""}`}>
                      {estoqueBaixo(p) && <AlertTriangle className="h-4 w-4" />} {p.estoque} {p.unidade}
                    </span>
                    {p.estoqueMinimo > 0 && <div className="text-xs text-muted-foreground">mín. {p.estoqueMinimo}</div>}
                  </td>
                  <td className="p-4"><StatusBadge ativo={p.ativo} /></td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1.5">
                      <button className="btn-ghost px-2.5" title="Editar" onClick={() => setEditando(p)}><Pencil className="h-4 w-4" /></button>
                      {isAdmin && (
                        <ConfirmDialog
                          trigger={<button className="btn-ghost px-2.5" title={p.ativo ? "Inativar" : "Ativar"}><Power className="h-4 w-4" /></button>}
                          title={p.ativo ? "Inativar produto?" : "Ativar produto?"} description={`Deseja ${p.ativo ? "inativar" : "ativar"} "${p.nome}"?`}
                          confirmLabel={p.ativo ? "Inativar" : "Ativar"} onConfirm={() => alterarStatusProduto(p.id, !p.ativo)}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={editando !== null} onOpenChange={(o) => !o && setEditando(null)} title={editando === "novo" ? "Novo produto" : "Editar produto"} wide>
        {editando !== null && (
          <ProdutoForm
            key={editando === "novo" ? "novo" : editando.id}
            inicial={editando === "novo" ? produtoVazio() : (({ id: _i, criadoEm: _c, atualizadoEm: _a, ...d }) => d)(editando)}
            onCancelar={() => setEditando(null)}
            onSalvar={(d) => {
              if (editando === "novo") criarProduto(d);
              else atualizarProduto(editando.id, d);
              toast.success("Produto salvo.");
              setEditando(null);
            }}
          />
        )}
      </Modal>
    </>
  );
}
