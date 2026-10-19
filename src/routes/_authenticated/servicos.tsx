import { guard, useAcesso } from "@/lib/acesso";
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Power, Search, Wrench } from "lucide-react";
import { toast } from "sonner";
import { alterarStatusServico, atualizarServico, criarServico, servicoVazio, useServicos, type Servico } from "@/lib/servicos";
import { useCurrentUser } from "@/lib/auth";
import { moeda } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Modal } from "@/components/Modal";
import { StatusBadge } from "@/components/clientes/StatusBadge";
import { ServicoForm } from "@/components/estoque/ServicoForm";

export const Route = createFileRoute("/_authenticated/servicos")({
  beforeLoad: guard(["servicos"]),
  head: () => ({
    meta: [
      { title: "Serviços · Gordo Auto Mecânica ERP" },
      { name: "description", content: "Cadastro de serviços da oficina." },
      { property: "og:title", content: "Serviços · Gordo ERP" },
      { property: "og:description", content: "Cadastro de serviços da oficina." },
    ],
  }),
  component: Servicos,
});

function Servicos() {
  const servicos = useServicos();
  const { pode } = useAcesso();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const [editando, setEditando] = useState<Servico | "novo" | null>(null);
  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return servicos
      .filter((s) => (!status || String(s.ativo) === status) && (!q || s.nome.toLowerCase().includes(q) || s.categoria.toLowerCase().includes(q)))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [servicos, busca, status]);

  return (
    <>
      <PageHeader title="Serviços" subtitle={`${servicos.length} serviço(s)`} action={pode("servicos", "criar") && <button className="btn-primary" onClick={() => setEditando("novo")}><Plus className="h-4 w-4" /> Novo serviço</button>} />
      <div className="panel mb-4 grid gap-3 p-4 md:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input className="field pl-9" placeholder="Buscar por nome ou categoria" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <select className="field md:w-40" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">Todos status</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select>
      </div>
      {servicos.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 p-12 text-center">
          <Wrench className="h-10 w-10 text-primary" />
          <h2 className="text-2xl font-bold uppercase">Nenhum serviço cadastrado</h2>
          {pode("servicos", "criar") && <button className="btn-primary mt-2" onClick={() => setEditando("novo")}><Plus className="h-4 w-4" /> Novo serviço</button>}
        </div>
      ) : lista.length === 0 ? (
        <div className="panel p-10 text-center text-muted-foreground">Nenhum serviço encontrado.</div>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="p-4">Serviço</th><th className="p-4">Categoria</th><th className="p-4">Tempo</th><th className="p-4 text-right">Preço</th><th className="p-4">Status</th><th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((s) => (
                <tr key={s.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                  <td className="p-4 font-medium">{s.nome}</td>
                  <td className="p-4">{s.categoria || "—"}</td>
                  <td className="p-4">{s.tempoEstimado || "—"}</td>
                  <td className="p-4 text-right">{moeda(s.preco)}</td>
                  <td className="p-4"><StatusBadge ativo={s.ativo} /></td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1.5">
                      {pode("servicos", "editar") && <button className="btn-ghost px-2.5" title="Editar" onClick={() => setEditando(s)}><Pencil className="h-4 w-4" /></button>}
                      {pode("servicos", "inativar") && (
                        <ConfirmDialog
                          trigger={<button className="btn-ghost px-2.5" title={s.ativo ? "Inativar" : "Ativar"}><Power className="h-4 w-4" /></button>}
                          title={s.ativo ? "Inativar serviço?" : "Ativar serviço?"} description={`Deseja ${s.ativo ? "inativar" : "ativar"} "${s.nome}"?`}
                          confirmLabel={s.ativo ? "Inativar" : "Ativar"} onConfirm={() => alterarStatusServico(s.id, !s.ativo)}
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
      <Modal open={editando !== null} onOpenChange={(o) => !o && setEditando(null)} title={editando === "novo" ? "Novo serviço" : "Editar serviço"}>
        {editando !== null && (
          <ServicoForm
            key={editando === "novo" ? "novo" : editando.id}
            inicial={editando === "novo" ? servicoVazio() : (({ id: _i, criadoEm: _c, atualizadoEm: _a, ...d }) => d)(editando)}
            onCancelar={() => setEditando(null)}
            onSalvar={(d) => {
              if (editando === "novo") criarServico(d);
              else atualizarServico(editando.id, d);
              toast.success("Serviço salvo.");
              setEditando(null);
            }}
          />
        )}
      </Modal>
    </>
  );
}
