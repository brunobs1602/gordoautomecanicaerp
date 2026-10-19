import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ClipboardList, Copy, Eye, FileDown, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { STATUS_LABEL, calcularTotais, codigoDoc, duplicarOrcamento, podeEditar, useOrcamentos, type Status } from "@/lib/orcamentos";
import { useClientes } from "@/lib/clientes";
import { formatarPlaca, normalizarPlaca, useVeiculos } from "@/lib/veiculos";
import { useCurrentUser, useUsers } from "@/lib/auth";
import { moeda } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusOrc } from "@/components/orcamentos/StatusOrc";

export const Route = createFileRoute("/_authenticated/ordens/")({
  head: () => ({
    meta: [
      { title: "Orçamentos e OS · Gordo Auto Mecânica ERP" },
      { name: "description", content: "Orçamentos e ordens de serviço da oficina." },
      { property: "og:title", content: "Orçamentos e OS · Gordo ERP" },
      { property: "og:description", content: "Orçamentos e ordens de serviço da oficina." },
    ],
  }),
  component: ListaOrcamentos,
});

function ListaOrcamentos() {
  const orcs = useOrcamentos();
  const clientes = useClientes();
  const veiculos = useVeiculos();
  const usuarios = useUsers();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<"" | Status>("");
  const [resp, setResp] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [ordem, setOrdem] = useState<"recentes" | "antigos" | "cliente" | "valor">("recentes");

  const cMap = useMemo(() => new Map(clientes.map((c) => [c.id, c])), [clientes]);
  const vMap = useMemo(() => new Map(veiculos.map((v) => [v.id, v])), [veiculos]);
  const uMap = useMemo(() => new Map(usuarios.map((u) => [u.id, u])), [usuarios]);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const qp = normalizarPlaca(q);
    return orcs
      .map((o) => ({ o, c: cMap.get(o.clienteId), v: vMap.get(o.veiculoId), total: calcularTotais(o.itens).total }))
      .filter(({ o }) => (!status || o.status === status) && (!resp || o.responsavelId === resp))
      .filter(({ o }) => (!de || o.criadoEm.slice(0, 10) >= de) && (!ate || o.criadoEm.slice(0, 10) <= ate))
      .filter(({ o, c, v }) =>
        !q ||
        codigoDoc(o).toLowerCase().includes(q) ||
        String(o.numero) === q.replace(/\D/g, "").replace(/^0+/, "") ||
        (c && c.nome.toLowerCase().includes(q)) ||
        (v && ((qp.length >= 3 && v.placa.includes(qp)) || `${v.marca} ${v.modelo}`.toLowerCase().includes(q))),
      )
      .sort((a, b) =>
        ordem === "recentes" ? b.o.criadoEm.localeCompare(a.o.criadoEm)
          : ordem === "antigos" ? a.o.criadoEm.localeCompare(b.o.criadoEm)
          : ordem === "valor" ? b.total - a.total
          : (a.c?.nome ?? "").localeCompare(b.c?.nome ?? "", "pt-BR"),
      );
  }, [orcs, cMap, vMap, busca, status, resp, de, ate, ordem]);

  return (
    <>
      <PageHeader
        title="Orçamentos e OS"
        subtitle={`${orcs.length} documento(s)`}
        action={<Link to="/ordens/novo" className="btn-primary"><Plus className="h-4 w-4" /> Novo orçamento</Link>}
      />

      <div className="panel mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input className="field pl-9" placeholder="Número, cliente, placa ou veículo" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <select className="field" value={status} onChange={(e) => setStatus(e.target.value as Status | "")} aria-label="Status">
          <option value="">Todos os status</option>
          {(Object.keys(STATUS_LABEL) as Status[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <select className="field" value={resp} onChange={(e) => setResp(e.target.value)} aria-label="Responsável">
          <option value="">Todos responsáveis</option>
          {usuarios.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <input className="field" type="date" value={de} onChange={(e) => setDe(e.target.value)} aria-label="De" title="Criado a partir de" />
        <input className="field" type="date" value={ate} onChange={(e) => setAte(e.target.value)} aria-label="Até" title="Criado até" />
        <select className="field sm:col-span-2 lg:col-span-2" value={ordem} onChange={(e) => setOrdem(e.target.value as typeof ordem)} aria-label="Ordenar">
          <option value="recentes">Mais recentes</option>
          <option value="antigos">Mais antigos</option>
          <option value="cliente">Cliente (A-Z)</option>
          <option value="valor">Maior valor</option>
        </select>
      </div>

      {orcs.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 p-12 text-center">
          <ClipboardList className="h-10 w-10 text-primary" />
          <h2 className="text-2xl font-bold uppercase">Nenhum orçamento ainda</h2>
          <p className="text-sm text-muted-foreground">Crie o primeiro orçamento para um cliente.</p>
          <Link to="/ordens/novo" className="btn-primary mt-2"><Plus className="h-4 w-4" /> Novo orçamento</Link>
        </div>
      ) : lista.length === 0 ? (
        <div className="panel p-10 text-center text-muted-foreground">Nenhum orçamento encontrado com estes filtros.</div>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="p-4">Número</th>
                <th className="p-4">Criado em</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Veículo</th>
                <th className="p-4 text-right">Total</th>
                <th className="p-4">Status</th>
                <th className="p-4">Responsável</th>
                <th className="p-4">Atualizado</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map(({ o, c, v, total }) => (
                <tr key={o.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                  <td className="p-4 font-mono text-xs font-bold">{codigoDoc(o)}</td>
                  <td className="p-4 text-muted-foreground">{new Date(o.criadoEm).toLocaleDateString("pt-BR")}</td>
                  <td className="p-4">{c?.nome ?? "—"}</td>
                  <td className="p-4">{v ? <><span className="font-mono text-xs">{formatarPlaca(v.placa)}</span> <span className="text-muted-foreground">{v.modelo}</span></> : "—"}</td>
                  <td className="p-4 text-right font-semibold">{moeda(total)}</td>
                  <td className="p-4"><StatusOrc status={o.status} /></td>
                  <td className="p-4">{uMap.get(o.responsavelId)?.name ?? "—"}</td>
                  <td className="p-4 text-muted-foreground">{new Date(o.atualizadoEm).toLocaleDateString("pt-BR")}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1.5">
                      <Link to="/ordens/$id" params={{ id: o.id }} className="btn-ghost px-2.5" title="Visualizar"><Eye className="h-4 w-4" /></Link>
                      {podeEditar(o.status) && <Link to="/ordens/$id/editar" params={{ id: o.id }} className="btn-ghost px-2.5" title="Editar"><Pencil className="h-4 w-4" /></Link>}
                      <ConfirmDialog
                        trigger={<button className="btn-ghost px-2.5" title="Duplicar"><Copy className="h-4 w-4" /></button>}
                        title="Duplicar orçamento?"
                        description={`Será criado um novo rascunho com os mesmos dados de ${codigoDoc(o)}.`}
                        confirmLabel="Duplicar"
                        onConfirm={() => {
                          const n = duplicarOrcamento(o.id, user?.name ?? "—");
                          toast.success(`Criado ${codigoDoc(n)}.`);
                          navigate({ to: "/ordens/$id", params: { id: n.id } });
                        }}
                      />
                      <Link to="/ordens/$id/imprimir" params={{ id: o.id }} search={{ auto: true }} className="btn-ghost px-2.5" title="Exportar PDF"><FileDown className="h-4 w-4" /></Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
