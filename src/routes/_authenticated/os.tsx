import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, Search } from "lucide-react";
import { StatusFinBadge } from "@/components/financeiro/OSPainel";
import { PageHeader } from "@/components/PageHeader";
import { guard, useAcesso } from "@/lib/acesso";
import { useUsers } from "@/lib/auth";
import { useClientes } from "@/lib/clientes";
import { statusFinanceiroOS, useCadastrosFin, useMovimentos, useTitulos } from "@/lib/financeiro";
import { STATUS_OS, calcularTotais, codigoDoc, codigoOrcamento, statusOSDe, useOrcamentos, type StatusOS } from "@/lib/orcamentos";
import { moeda } from "@/lib/store";
import { formatarPlaca, normalizarPlaca, useVeiculos } from "@/lib/veiculos";

export const Route = createFileRoute("/_authenticated/os")({
  beforeLoad: guard(["ordens"]),
  head: () => ({
    meta: [
      { title: "Ordens de Serviço · Mecavon" },
      { name: "description", content: "Acompanhamento das ordens de serviço, status e pagamentos." },
      { property: "og:title", content: "Ordens de Serviço · Mecavon" },
      { property: "og:description", content: "Acompanhamento das ordens de serviço." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ListaOS,
});

const dBr = (d?: string) => (d ? d.slice(0, 10).split("-").reverse().join("/") : "—");

function ListaOS() {
  const orcs = useOrcamentos();
  const clientes = useClientes();
  const veiculos = useVeiculos();
  const usuarios = useUsers();
  const titulos = useTitulos();
  const movs = useMovimentos();
  const cads = useCadastrosFin();
  const { pode } = useAcesso();
  const verFin = pode("financeiro");
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<"" | StatusOS>("");

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const qp = normalizarPlaca(q);
    return orcs.filter((o) => o.tipo === "os").map((o) => {
      const c = clientes.find((x) => x.id === o.clienteId);
      const v = veiculos.find((x) => x.id === o.veiculoId);
      const ts = titulos.filter((t) => t.documentoId === o.id);
      const fin = statusFinanceiroOS(ts, statusOSDe(o) === "cancelada");
      const formas = [...new Set(movs.filter((m) => m.documentoId === o.id && m.tipo === "recebimento" && !m.estornado).map((m) => cads.find((k) => k.id === m.formaId)?.nome).filter(Boolean))];
      return { o, c, v, fin, total: calcularTotais(o.itens).total, formas, temTitulo: ts.some((t) => t.status !== "cancelado") };
    })
      .filter(({ o }) => !status || statusOSDe(o) === status)
      .filter(({ o, c, v }) => !q || codigoDoc(o).toLowerCase().includes(q) || codigoOrcamento(o).toLowerCase().includes(q) ||
        (c && c.nome.toLowerCase().includes(q)) || (v && qp.length >= 3 && v.placa.includes(qp)))
      .sort((a, b) => (b.o.numeroOS ?? b.o.numero) - (a.o.numeroOS ?? a.o.numero));
  }, [orcs, clientes, veiculos, titulos, movs, cads, busca, status]);

  return (
    <>
      <PageHeader title="Ordens de Serviço" subtitle={`${lista.length} ordem(ns)`} />
      <div className="panel mb-4 grid gap-3 p-4 sm:grid-cols-3">
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input className="field pl-9" placeholder="Número da OS, orçamento, cliente ou placa" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <select className="field" value={status} onChange={(e) => setStatus(e.target.value as StatusOS | "")} aria-label="Status">
          <option value="">Todos os status</option>
          {(Object.keys(STATUS_OS) as StatusOS[]).map((s) => <option key={s} value={s}>{STATUS_OS[s]}</option>)}
        </select>
      </div>
      {lista.length === 0 ? <div className="panel p-10 text-center text-sm text-muted-foreground">Nenhuma ordem de serviço. Converta um orçamento aprovado para criar a primeira.</div> : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[1200px] text-sm">
            <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="p-3">OS</th><th className="p-3">Orçamento</th><th className="p-3">Cliente</th><th className="p-3">Veículo / placa</th>
              <th className="p-3">Abertura</th><th className="p-3">Previsão</th><th className="p-3">Conclusão</th><th className="p-3">Status</th>
              {verFin && <><th className="p-3 text-right">Total</th><th className="p-3">Forma</th><th className="p-3 text-right">Recebido</th><th className="p-3 text-right">Pendente</th><th className="p-3">Financeiro</th></>}
              <th className="p-3">Responsável</th><th className="p-3" />
            </tr></thead>
            <tbody>{lista.map(({ o, c, v, fin, total, formas, temTitulo }) => (
              <tr key={o.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                <td className="p-3 font-mono text-xs font-bold">{codigoDoc(o)}</td>
                <td className="p-3 font-mono text-xs text-muted-foreground">{codigoOrcamento(o)}</td>
                <td className="p-3">{c?.nome ?? "—"}</td>
                <td className="p-3">{v ? <>{v.modelo} <span className="font-mono text-xs">{formatarPlaca(v.placa)}</span></> : "—"}</td>
                <td className="p-3">{dBr(o.historico.find((h) => h.statusNovo === "convertido")?.data ?? o.atualizadoEm)}</td>
                <td className="p-3">{dBr(o.previsao)}</td>
                <td className="p-3">{dBr(o.concluidaEm)}</td>
                <td className="p-3"><span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold">{STATUS_OS[statusOSDe(o)]}</span></td>
                {verFin && <>
                  <td className="p-3 text-right font-semibold">{moeda(total)}</td>
                  <td className="p-3 text-xs">{formas.join(", ") || "—"}</td>
                  <td className="p-3 text-right">{moeda(fin.recebido)}</td>
                  <td className="p-3 text-right">{moeda(temTitulo ? fin.pendente : total)}</td>
                  <td className="p-3"><StatusFinBadge s={fin.status} /></td>
                </>}
                <td className="p-3">{usuarios.find((u) => u.id === o.responsavelId)?.name ?? "—"}</td>
                <td className="p-3"><Link to="/ordens/$id" params={{ id: o.id }} className="btn-ghost px-2.5" title="Abrir"><Eye className="h-4 w-4" /></Link></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}
