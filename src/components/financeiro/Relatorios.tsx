import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAcesso } from "@/lib/acesso";
import { useClientes } from "@/lib/clientes";
import {
  diasAlerta, garantirHistoricoFin, hojeISO, r2, saldoTitulo, situacao, useCadastrosFin, useHistoricoFin, useMovimentos, useTitulos,
} from "@/lib/financeiro";
import { STATUS_OS, calcularTotais, codigoDoc, codigoOrcamento, statusOSDe, useOrcamentos } from "@/lib/orcamentos";
import { moeda } from "@/lib/store";
import { TIPO_MOV } from "./Contas";
import { BotoesExportar, Campo, FiltroPeriodo, Opcoes, Vazio, dataBr, dataHora, exportarPlanilha, intervalo, type Periodo } from "./ui";

const RELATORIOS = [
  ["pagar", "Contas a pagar"], ["pagas", "Contas pagas"], ["receber", "Contas a receber"], ["recebidas", "Contas recebidas"],
  ["fluxo", "Fluxo de caixa"], ["forma", "Recebimentos por forma de pagamento"], ["taxas", "Taxas de cartão"],
  ["maquininha", "Vendas por maquininha"], ["bandeira", "Vendas por bandeira"], ["os", "Ordens de serviço finalizadas"],
  ["pendentes", "Valores pendentes"], ["faturamento", "Faturamento por período"],
] as const;
type Rel = (typeof RELATORIOS)[number][0];

export function RelatoriosFin() {
  const titulos = useTitulos();
  const movs = useMovimentos();
  const cads = useCadastrosFin();
  const clientes = useClientes();
  const orcs = useOrcamentos();
  const hist = useHistoricoFin();
  const { pode } = useAcesso();
  useEffect(() => { void garantirHistoricoFin().catch(() => undefined); }, []);
  const [rel, setRel] = useState<Rel>("pagar");
  const [p, setP] = useState<Periodo>("mes");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [f, setF] = useState({ categoria: "", conta: "", forma: "", maquininha: "", bandeira: "", cliente: "", usuario: "", status: "", os: "" });
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const [ini, fim] = intervalo(p, de, ate);
  const nome = (id: unknown) => cads.find((c) => c.id === id)?.nome ?? "—";
  const cli = (id: unknown) => clientes.find((c) => c.id === id)?.nome ?? "—";
  const doc = (id: unknown) => { const o = orcs.find((x) => x.id === id); return o ? codigoDoc(o) : ""; };
  const hoje = hojeISO();
  const alerta = diasAlerta();
  const usuarios = [...new Set(movs.map((m) => m.usuarioNome).filter(Boolean))].map((u) => ({ id: u, nome: u }));
  const tituloMov = new Map(hist.filter((h) => h.tituloId).map((h) => [h.tituloId, h.usuarioNome]));

  const { cab, linhas, total } = useMemo(() => {
    const noPer = (iso: string) => iso >= ini && iso <= fim;
    const tits = titulos.filter((t) => (!f.categoria || t.categoriaId === f.categoria) && (!f.cliente || t.clienteId === f.cliente) &&
      (!f.os || t.documentoId === f.os) && (!f.status || situacao(t, hoje, alerta) === f.status) &&
      (!f.usuario || tituloMov.get(t.id) === f.usuario));
    const mv = movs.filter((m) => noPer(m.dataMov) && (!f.conta || m.contaId === f.conta) && (!f.forma || m.formaId === f.forma) &&
      (!f.maquininha || m.data["maquininha_id"] === f.maquininha) && (!f.bandeira || m.data["bandeira_id"] === f.bandeira) &&
      (!f.usuario || m.usuarioNome === f.usuario) && (!f.os || m.documentoId === f.os) &&
      (!f.cliente || titulos.find((t) => t.id === m.tituloId)?.clienteId === f.cliente));
    const rec = mv.filter((m) => m.tipo === "recebimento" && !m.estornado);
    const agrupado = (chave: (m: (typeof mv)[number]) => string, rotulo: string) => {
      const g = new Map<string, { bruto: number; taxa: number; liquido: number; qtd: number }>();
      for (const m of rec) {
        const k = chave(m);
        const x = g.get(k) ?? { bruto: 0, taxa: 0, liquido: 0, qtd: 0 };
        const taxa = Number(m.data["taxa"] || 0);
        x.bruto += m.valor + taxa; x.taxa += taxa; x.liquido += m.valor; x.qtd++;
        g.set(k, x);
      }
      const l = [...g.entries()].map(([k, v]) => [k, v.qtd, r2(v.bruto), r2(v.taxa), r2(v.liquido)] as (string | number)[]);
      return { cab: [rotulo, "Qtd.", "Bruto", "Taxas", "Líquido"], linhas: l, total: l.reduce((s, x) => s + Number(x[4]), 0) };
    };
    switch (rel) {
      case "pagar": case "receber": case "pendentes": {
        const l = tits.filter((t) => (rel === "pendentes" || t.tipo === (rel === "pagar" ? "pagar" : "receber")) && (t.status === "aberto" || t.status === "parcial") && noPer(t.vencimento))
          .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
        return { cab: ["Tipo", "Descrição", "Cliente / favorecido", "Categoria", "Vencimento", "Valor", "Saldo", "Status"],
          linhas: l.map((t) => [t.tipo === "pagar" ? "Pagar" : "Receber", t.descricao, t.tipo === "receber" ? cli(t.clienteId) : String(t.data["favorecido"] ?? ""), nome(t.categoriaId), dataBr(t.vencimento), t.valor, saldoTitulo(t), situacao(t, hoje, alerta)]),
          total: l.reduce((s, t) => s + saldoTitulo(t), 0) };
      }
      case "pagas": case "recebidas": {
        const l = mv.filter((m) => m.tipo === (rel === "pagas" ? "pagamento" : "recebimento") && !m.estornado);
        return { cab: ["Data", "Conta", "Descrição", "Forma", "Conta bancária", "Responsável", "Valor"],
          linhas: l.map((m) => { const t = titulos.find((x) => x.id === m.tituloId); return [dataBr(m.dataMov), t?.descricao ?? "", t?.tipo === "receber" ? cli(t.clienteId) : String(t?.data["favorecido"] ?? ""), nome(m.formaId), nome(m.contaId), m.usuarioNome, Math.abs(m.valor)]; }),
          total: l.reduce((s, m) => s + Math.abs(m.valor), 0) };
      }
      case "fluxo":
        return { cab: ["Data", "Tipo", "Conta", "Forma", "Responsável", "Valor"],
          linhas: mv.sort((a, b) => a.dataMov.localeCompare(b.dataMov)).map((m) => [dataBr(m.dataMov), TIPO_MOV[m.tipo], nome(m.contaId), m.formaId ? nome(m.formaId) : "", m.usuarioNome, m.valor]),
          total: mv.reduce((s, m) => s + m.valor, 0) };
      case "forma": return agrupado((m) => nome(m.formaId), "Forma de pagamento");
      case "maquininha": return agrupado((m) => (m.data["maquininha_id"] ? nome(m.data["maquininha_id"]) : "Sem maquininha"), "Maquininha");
      case "bandeira": return agrupado((m) => (m.data["bandeira_id"] ? nome(m.data["bandeira_id"]) : "Sem bandeira"), "Bandeira");
      case "taxas": {
        const l = rec.filter((m) => Number(m.data["taxa"] || 0) > 0);
        return { cab: ["Data", "Maquininha", "Bandeira", "Modalidade", "Parcelas", "Bruto", "Taxa", "Líquido"],
          linhas: l.map((m) => [dataBr(m.dataMov), nome(m.data["maquininha_id"]), nome(m.data["bandeira_id"]), m.data["modalidade"] === "debito" ? "Débito" : "Crédito",
            Number(m.data["parcelas"] || 1), r2(m.valor + Number(m.data["taxa"])), Number(m.data["taxa"]), m.valor]),
          total: l.reduce((s, m) => s + Number(m.data["taxa"] || 0), 0) };
      }
      case "os": case "faturamento": {
        const os = orcs.filter((o) => o.tipo === "os" && o.concluidaEm && noPer(o.concluidaEm.slice(0, 10)) && o.statusOS !== "cancelada" &&
          (!f.cliente || o.clienteId === f.cliente) && (!f.os || o.id === f.os));
        if (rel === "faturamento") {
          const g = new Map<string, number>();
          for (const o of os) { const k = o.concluidaEm!.slice(0, 7); g.set(k, (g.get(k) ?? 0) + calcularTotais(o.itens).total); }
          const l = [...g.entries()].sort().map(([k, v]) => [k.split("-").reverse().join("/"), r2(v)] as (string | number)[]);
          return { cab: ["Mês", "Faturamento"], linhas: l, total: l.reduce((s, x) => s + Number(x[1]), 0) };
        }
        return { cab: ["OS", "Orçamento", "Cliente", "Concluída em", "Status", "Total", "Recebido", "Pendente"],
          linhas: os.map((o) => { const ts = titulos.filter((t) => t.documentoId === o.id && t.status !== "cancelado"); const tot = calcularTotais(o.itens).total; const pg = ts.reduce((s, t) => s + t.pago, 0);
            return [codigoDoc(o), codigoOrcamento(o), cli(o.clienteId), dataBr(o.concluidaEm), STATUS_OS[statusOSDe(o)], tot, r2(pg), r2(Math.max(0, tot - pg))]; }),
          total: os.reduce((s, o) => s + calcularTotais(o.itens).total, 0) };
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rel, titulos, movs, cads, orcs, clientes, f, ini, fim, hoje, alerta, hist]);

  const titulo = RELATORIOS.find(([k]) => k === rel)![1];
  return (
    <>
      <PageHeader title="Relatórios financeiros" subtitle={`${titulo} · ${linhas.length} linha(s) · Total ${moeda(r2(total))}`}
        action={pode("financeiro", "exportar") && <BotoesExportar onPlanilha={() => exportarPlanilha(`relatorio-${rel}`, cab, linhas)} />} />
      <div className="panel mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5 print:hidden">
        <Campo label="Relatório" className="sm:col-span-2"><select className="field" value={rel} onChange={(e) => setRel(e.target.value as Rel)}>{RELATORIOS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Campo>
        <FiltroPeriodo p={p} setP={setP} de={de} setDe={setDe} ate={ate} setAte={setAte} />
        <Opcoes label="Categoria" value={f.categoria} onChange={set("categoria")} itens={cads.filter((c) => c.tipo === "categoria")} vazio="Todas" />
        <Opcoes label="Conta bancária" value={f.conta} onChange={set("conta")} itens={cads.filter((c) => c.tipo === "conta")} vazio="Todas" />
        <Opcoes label="Forma de pagamento" value={f.forma} onChange={set("forma")} itens={cads.filter((c) => c.tipo === "forma")} vazio="Todas" />
        <Opcoes label="Maquininha" value={f.maquininha} onChange={set("maquininha")} itens={cads.filter((c) => c.tipo === "maquininha")} vazio="Todas" />
        <Opcoes label="Bandeira" value={f.bandeira} onChange={set("bandeira")} itens={cads.filter((c) => c.tipo === "bandeira")} vazio="Todas" />
        <Opcoes label="Cliente" value={f.cliente} onChange={set("cliente")} itens={clientes.map((c) => ({ id: c.id, nome: c.nome }))} vazio="Todos" />
        <Opcoes label="Usuário" value={f.usuario} onChange={set("usuario")} itens={usuarios} vazio="Todos" />
        <Campo label="Status"><select className="field" value={f.status} onChange={(e) => set("status")(e.target.value)}>
          <option value="">Todos</option><option value="aberto">Em aberto</option><option value="vencendo">Vencendo</option><option value="vencida">Vencida</option><option value="parcial">Parcial</option><option value="pago">Paga/recebida</option><option value="cancelado">Cancelada</option>
        </select></Campo>
        <Opcoes label="Ordem de serviço" value={f.os} onChange={set("os")} itens={orcs.filter((o) => o.tipo === "os").map((o) => ({ id: o.id, nome: doc(o.id) }))} vazio="Todas" />
      </div>
      <div className="hidden print:block"><h2 className="text-xl font-bold">{titulo}</h2><p className="text-xs">Emitido em {dataHora(new Date().toISOString())}</p></div>
      {linhas.length === 0 ? <Vazio>Nenhum dado para estes filtros.</Vazio> : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">{cab.map((c) => <th key={c} className="p-3">{c}</th>)}</tr></thead>
            <tbody>{linhas.map((l, i) => <tr key={i} className="border-b border-border/60 last:border-0">{l.map((v, j) => <td key={j} className={`p-3 ${typeof v === "number" && !Number.isInteger(v) || (typeof v === "number" && j > 1) ? "text-right tabular-nums" : ""}`}>{typeof v === "number" && (j > 1 || !Number.isInteger(v)) && !/Qtd|Parcelas/.test(cab[j]!) ? moeda(v) : v}</td>)}</tr>)}</tbody>
            <tfoot><tr className="border-t border-border font-bold"><td className="p-3" colSpan={cab.length - 1}>Total</td><td className="p-3 text-right">{moeda(r2(total))}</td></tr></tfoot>
          </table>
        </div>
      )}
    </>
  );
}
