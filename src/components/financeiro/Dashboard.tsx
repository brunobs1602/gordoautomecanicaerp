import { useMemo, useState } from "react";
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, CalendarClock, CreditCard, Landmark, TrendingUp, Wallet } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import {
  diasAlerta, hojeISO, r2, saldoConta, saldoTitulo, situacao, somarDias, useCadastrosFin, useMovimentos, useTitulos, type Movimento,
} from "@/lib/financeiro";
import { calcularTotais, useOrcamentos } from "@/lib/orcamentos";
import { moeda } from "@/lib/store";
import { Campo, FiltroPeriodo, Opcoes, intervalo, type Periodo } from "./ui";

const CORES = ["var(--primary)", "#9ca3af", "#e5e7eb", "#7f1d1d", "#f87171", "#6b7280", "#d4d4d8", "#b91c1c"];
const mesLabel = (ym: string) => { const [y, m] = ym.split("-"); return `${m}/${y!.slice(2)}`; };
const fmt = (v: number) => moeda(v);

function Grafico({ titulo, children }: { titulo: string; children: React.ReactElement }) {
  return (
    <div className="panel p-4">
      <h3 className="mb-3 font-display text-lg font-bold uppercase">{titulo}</h3>
      <div className="h-64"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>
    </div>
  );
}
function agrupar(movs: Movimento[], chave: (m: Movimento) => string) {
  const m = new Map<string, number>();
  for (const x of movs) m.set(chave(x), r2((m.get(chave(x)) ?? 0) + x.valor));
  return [...m.entries()].map(([nome, valor]) => ({ nome, valor })).filter((x) => x.valor > 0).sort((a, b) => b.valor - a.valor);
}

export function DashboardFinanceiro() {
  const titulos = useTitulos();
  const movs = useMovimentos();
  const cads = useCadastrosFin();
  const orcs = useOrcamentos();
  const [p, setP] = useState<Periodo>("mes");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [conta, setConta] = useState("");
  const [forma, setForma] = useState("");
  const [status, setStatus] = useState("");
  const [ini, fim] = intervalo(p, de, ate);
  const hoje = hojeISO();
  const alerta = diasAlerta();
  const nome = (id: unknown) => cads.find((c) => c.id === id)?.nome ?? "Outros";

  const d = useMemo(() => {
    const tit = titulos.filter((t) => t.status !== "cancelado" && (!status || situacao(t, hoje, alerta) === status) &&
      (!forma || t.data["formaId"] === forma) && (!conta || t.data["contaId"] === conta));
    const noPer = (iso: string) => iso >= ini && iso <= fim;
    const mv = movs.filter((m) => (!conta || m.contaId === conta) && (!forma || m.formaId === forma));
    const mvPer = mv.filter((m) => noPer(m.dataMov));
    const operacionais = mvPer.filter((m) => m.tipo === "pagamento" || m.tipo === "recebimento" || m.tipo === "estorno");
    const abertos = (tipo: "pagar" | "receber") => tit.filter((t) => t.tipo === tipo && (t.status === "aberto" || t.status === "parcial"));
    const somaSaldo = (l: typeof tit) => r2(l.reduce((s, t) => s + saldoTitulo(t), 0));
    const recebMes = r2(operacionais.filter((m) => m.tipo === "recebimento" && !m.estornado).reduce((s, m) => s + m.valor, 0));
    const pagMes = r2(-operacionais.filter((m) => m.tipo === "pagamento" && !m.estornado).reduce((s, m) => s + m.valor, 0));
    const taxas = r2(mvPer.filter((m) => m.tipo === "recebimento" && !m.estornado).reduce((s, m) => s + Number(m.data["taxa"] || 0), 0));
    const recebidas = mvPer.filter((m) => m.tipo === "recebimento" && !m.estornado);

    // séries mensais (últimos 12 meses até o fim do período)
    const meses: string[] = [];
    const base = new Date(`${(fim > hoje ? hoje : fim).slice(0, 7)}-15T12:00:00`);
    for (let i = 11; i >= 0; i--) { const x = new Date(base); x.setMonth(x.getMonth() - i); meses.push(hojeISO(x).slice(0, 7)); }
    const serie = meses.map((ym) => {
      const ms = mv.filter((m) => m.dataMov.startsWith(ym));
      const os = orcs.filter((o) => o.tipo === "os" && (o.concluidaEm ?? "").startsWith(ym) && o.statusOS !== "cancelada");
      return {
        mes: mesLabel(ym),
        Entradas: r2(ms.filter((m) => m.valor > 0 && m.tipo !== "transferencia").reduce((s, m) => s + m.valor, 0)),
        Saídas: r2(-ms.filter((m) => m.valor < 0 && m.tipo !== "transferencia").reduce((s, m) => s + m.valor, 0)),
        Faturamento: r2(os.reduce((s, o) => s + calcularTotais(o.itens).total, 0)),
      };
    });
    const vencendoProx = tit.filter((t) => (t.status === "aberto" || t.status === "parcial") && t.vencimento > hoje && t.vencimento <= somarDias(hoje, alerta));
    const osPer = orcs.filter((o) => o.tipo === "os" && o.concluidaEm && noPer(o.concluidaEm.slice(0, 10)) && o.statusOS !== "cancelada");
    return {
      aPagar: somaSaldo(abertos("pagar")), aReceber: somaSaldo(abertos("receber")),
      pago: pagMes, recebido: recebMes,
      vencidos: somaSaldo(tit.filter((t) => situacao(t, hoje, alerta) === "vencida")),
      hoje: somaSaldo(tit.filter((t) => (t.status === "aberto" || t.status === "parcial") && t.vencimento === hoje)),
      proximos: somaSaldo(vencendoProx),
      saldo: r2(cads.filter((c) => c.tipo === "conta" && c.ativo && (!conta || c.id === conta)).reduce((s, c) => s + saldoConta(c, movs), 0)),
      faturamento: r2(osPer.reduce((s, o) => s + calcularTotais(o.itens).total, 0)),
      taxas, lucro: r2(recebMes - pagMes),
      serie,
      pagarReceber: [
        { nome: "A pagar", Aberto: somaSaldo(abertos("pagar")), Liquidado: pagMes },
        { nome: "A receber", Aberto: somaSaldo(abertos("receber")), Liquidado: recebMes },
      ],
      porForma: agrupar(recebidas, (m) => nome(m.formaId)),
      porBandeira: agrupar(recebidas.filter((m) => m.data["bandeira_id"]), (m) => nome(m.data["bandeira_id"])),
      porMaquininha: agrupar(recebidas.filter((m) => m.data["maquininha_id"]), (m) => nome(m.data["maquininha_id"])),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titulos, movs, cads, orcs, ini, fim, conta, forma, status, hoje, alerta]);

  const eixo = { stroke: "var(--muted-foreground)", fontSize: 11 };
  const tip = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6 }, formatter: (v: number) => fmt(v) };

  return (
    <>
      <PageHeader title="Dashboard financeiro" subtitle="Valores reais registrados no sistema." />
      <div className="panel mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <FiltroPeriodo p={p} setP={setP} de={de} setDe={setDe} ate={ate} setAte={setAte} />
        <Opcoes label="Conta bancária" value={conta} onChange={setConta} itens={cads.filter((c) => c.tipo === "conta")} vazio="Todas" />
        <Opcoes label="Forma de pagamento" value={forma} onChange={setForma} itens={cads.filter((c) => c.tipo === "forma")} vazio="Todas" />
        <Campo label="Status">
          <select className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos</option><option value="aberto">Em aberto</option><option value="vencendo">Vencendo</option>
            <option value="vencida">Vencida</option><option value="parcial">Parcial</option><option value="pago">Paga/recebida</option>
          </select>
        </Campo>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total a pagar" value={moeda(d.aPagar)} icon={ArrowUpCircle} />
        <StatCard label="Total a receber" value={moeda(d.aReceber)} icon={ArrowDownCircle} />
        <StatCard label="Pago no período" value={moeda(d.pago)} icon={Wallet} />
        <StatCard label="Recebido no período" value={moeda(d.recebido)} icon={Wallet} />
        <StatCard label="Vencidos" value={moeda(d.vencidos)} icon={AlertTriangle} />
        <StatCard label="Vencendo hoje" value={moeda(d.hoje)} icon={CalendarClock} />
        <StatCard label={`Próximos ${alerta} dias`} value={moeda(d.proximos)} icon={CalendarClock} />
        <StatCard label="Saldo das contas" value={moeda(d.saldo)} icon={Landmark} />
        <StatCard label="Faturamento das OS" value={moeda(d.faturamento)} icon={TrendingUp} />
        <StatCard label="Taxas de maquininha" value={moeda(d.taxas)} icon={CreditCard} />
        <StatCard label="Lucro bruto estimado" value={d.recebido || d.pago ? moeda(d.lucro) : "—"} icon={TrendingUp} />
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Grafico titulo="Entradas e saídas"><BarChart data={d.serie}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="mes" {...eixo} /><YAxis {...eixo} width={70} /><Tooltip {...tip} /><Legend /><Bar dataKey="Entradas" fill="#9ca3af" /><Bar dataKey="Saídas" fill="var(--primary)" /></BarChart></Grafico>
        <Grafico titulo="Contas a pagar e receber"><BarChart data={d.pagarReceber}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="nome" {...eixo} /><YAxis {...eixo} width={70} /><Tooltip {...tip} /><Legend /><Bar dataKey="Aberto" fill="var(--primary)" /><Bar dataKey="Liquidado" fill="#9ca3af" /></BarChart></Grafico>
        <Grafico titulo="Recebimentos por forma de pagamento">
          {d.porForma.length ? <PieChart><Pie data={d.porForma} dataKey="valor" nameKey="nome" outerRadius={90} label={(e: { nome: string }) => e.nome}>{d.porForma.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}</Pie><Tooltip {...tip} /></PieChart> : <SemDados />}
        </Grafico>
        <Grafico titulo="Faturamento por mês"><BarChart data={d.serie}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="mes" {...eixo} /><YAxis {...eixo} width={70} /><Tooltip {...tip} /><Bar dataKey="Faturamento" fill="var(--primary)" /></BarChart></Grafico>
        <Grafico titulo="Recebido por bandeira">{d.porBandeira.length ? <BarChart data={d.porBandeira} layout="vertical"><XAxis type="number" {...eixo} /><YAxis type="category" dataKey="nome" {...eixo} width={110} /><Tooltip {...tip} /><Bar dataKey="valor" name="Valor" fill="var(--primary)" /></BarChart> : <SemDados />}</Grafico>
        <Grafico titulo="Recebido por maquininha">{d.porMaquininha.length ? <BarChart data={d.porMaquininha} layout="vertical"><XAxis type="number" {...eixo} /><YAxis type="category" dataKey="nome" {...eixo} width={110} /><Tooltip {...tip} /><Bar dataKey="valor" name="Valor" fill="#9ca3af" /></BarChart> : <SemDados />}</Grafico>
      </div>
    </>
  );
}
function SemDados() {
  return <BarChart data={[]}><text x="50%" y="50%" textAnchor="middle" fill="var(--muted-foreground)" fontSize={13}>Sem dados no período</text></BarChart>;
}
