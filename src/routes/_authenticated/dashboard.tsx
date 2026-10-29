import { useMemo, type ReactElement } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Car, CheckCircle2, ClipboardList, DollarSign, FileEdit, Hammer, Hourglass, PackageX, ThumbsDown, ThumbsUp, Users, Wrench } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { guard, useAcesso } from "@/lib/acesso";
import { useCurrentUser } from "@/lib/auth";
import { useConfig } from "@/lib/config";
import { useClientes } from "@/lib/clientes";
import { useVeiculos } from "@/lib/veiculos";
import { STATUS_LABEL, STATUS_OS, codigoDoc, statusOSDe, useOrcamentos, type Status, type StatusOS } from "@/lib/orcamentos";
import { estoqueBaixo, useProdutos } from "@/lib/produtos";
import { useServicos } from "@/lib/servicos";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";

export const Route = createFileRoute("/_authenticated/dashboard")({
  beforeLoad: guard(["dashboard"]),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Dashboard · Mecavon" },
      { name: "description", content: "Visão operacional da oficina." },
      { property: "og:title", content: "Dashboard · Mecavon" },
      { property: "og:description", content: "Visão operacional da oficina." },
    ],
  }),
  component: Dashboard,
});

const ultimosMeses = (n = 6) => {
  const out: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
};
const rotulo = (ym: string) => `${ym.slice(5)}/${ym.slice(2, 4)}`;

function Grafico({ titulo, vazio, children }: { titulo: string; vazio: boolean; children: ReactElement }) {
  return (
    <div className="panel p-4">
      <h3 className="mb-3 font-display text-lg font-bold uppercase">{titulo}</h3>
      <div className="h-56">
        {vazio ? <div className="grid h-full place-items-center text-sm text-muted-foreground">Sem dados ainda</div>
          : <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>}
      </div>
    </div>
  );
}

function Dashboard() {
  const user = useCurrentUser();
  const { pode } = useAcesso();
  const empresa = String(useConfig().empresa.nomeFantasia || "Mecavon");
  const clientes = useClientes();
  const veiculos = useVeiculos();
  const docs = useOrcamentos();
  const produtos = useProdutos();
  const servicos = useServicos();
  const first = user?.name.split(" ")[0] ?? "";
  const verOrc = pode("orcamentos");
  const verOS = pode("ordens");

  const d = useMemo(() => {
    const orcs = docs.filter((o) => o.tipo === "orcamento");
    const os = docs.filter((o) => o.tipo === "os");
    const nOrc = (s: Status) => orcs.filter((o) => o.status === s).length;
    const nOS = (s: StatusOS) => os.filter((o) => statusOSDe(o) === s).length;
    const meses = ultimosMeses();
    const porMes = (lista: { criadoEm: string }[]) => meses.map((m) => lista.filter((x) => (x.criadoEm || "").startsWith(m)).length);
    const cli = porMes(clientes), vei = porMes(veiculos), osm = porMes(os.map((o) => ({ criadoEm: o.historico.find((h) => h.statusNovo === "convertido")?.data ?? o.criadoEm })));
    const uso = (tipo: "servico" | "produto") => {
      const m = new Map<string, number>();
      for (const o of docs) if (o.status !== "cancelado" && o.status !== "recusado")
        for (const i of o.itens) if (i.tipo === tipo && i.descricao) m.set(i.descricao, (m.get(i.descricao) ?? 0) + i.quantidade);
      return [...m.entries()].map(([nome, qtd]) => ({ nome: nome.slice(0, 22), qtd })).sort((a, b) => b.qtd - a.qtd).slice(0, 6);
    };
    const baixo = produtos.filter((p) => p.ativo && estoqueBaixo(p));
    const atividades = docs
      .filter((o) => (o.tipo === "os" ? verOS : verOrc))
      .flatMap((o) => o.historico.map((h) => ({ ...h, doc: codigoDoc(o), docId: o.id })))
      .sort((a, b) => b.data.localeCompare(a.data)).slice(0, 8);
    return {
      orc: { rascunho: nOrc("rascunho") + nOrc("reaberto"), aguardando: nOrc("aguardando"), aprovado: nOrc("aprovado"), recusado: nOrc("recusado") },
      os: { aberta: nOS("aberta"), execucao: nOS("execucao"), peca: nOS("aguardando_peca"), finalizada: nOS("finalizada") + nOS("entregue") },
      orcStatus: (Object.keys(STATUS_LABEL) as Status[]).map((s) => ({ nome: STATUS_LABEL[s], qtd: nOrc(s) })).filter((x) => x.qtd > 0),
      osStatus: (Object.keys(STATUS_OS) as StatusOS[]).map((s) => ({ nome: STATUS_OS[s], qtd: nOS(s) })).filter((x) => x.qtd > 0),
      cadastros: meses.map((m, i) => ({ mes: rotulo(m), Clientes: cli[i], Veículos: vei[i], OS: osm[i] })),
      servUso: uso("servico"), prodUso: uso("produto"),
      baixo: baixo.map((p) => ({ nome: p.nome.slice(0, 22), Estoque: p.estoque, Mínimo: p.estoqueMinimo })).slice(0, 8),
      nBaixo: baixo.length,
      atividades,
    };
  }, [docs, clientes, veiculos, produtos, verOrc, verOS]);

  const eixo = { stroke: "var(--muted-foreground)", fontSize: 11 };
  const tip = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6 } };
  const barras = (data: object[], chave: string, cor = "var(--primary)", vertical = false) => vertical
    ? <BarChart data={data} layout="vertical"><XAxis type="number" allowDecimals={false} {...eixo} /><YAxis type="category" dataKey="nome" width={120} {...eixo} /><Tooltip {...tip} /><Bar dataKey={chave} name="Quantidade" fill={cor} /></BarChart>
    : <BarChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="nome" {...eixo} /><YAxis allowDecimals={false} {...eixo} width={30} /><Tooltip {...tip} /><Bar dataKey={chave} name="Quantidade" fill={cor} /></BarChart>;

  return (
    <>
      <PageHeader title={`Olá, ${first}!`} subtitle={`Bem-vindo ao ${empresa} ERP`}
        action={pode("financeiro") && <Link to="/financeiro" className="btn-ghost h-11"><DollarSign className="h-4 w-4" /> Dashboard Financeiro</Link>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {pode("clientes") && <StatCard label="Clientes ativos" value={String(clientes.filter((c) => c.ativo).length)} icon={Users} />}
        {pode("veiculos") && <StatCard label="Veículos cadastrados" value={String(veiculos.length)} icon={Car} />}
        {pode("servicos") && <StatCard label="Serviços cadastrados" value={String(servicos.filter((s) => s.ativo).length)} icon={Wrench} />}
        {pode("produtos") && <StatCard label="Estoque baixo" value={String(d.nBaixo)} icon={PackageX} />}
        {verOrc && <>
          <StatCard label="Orçamentos em rascunho" value={String(d.orc.rascunho)} icon={FileEdit} />
          <StatCard label="Aguardando aprovação" value={String(d.orc.aguardando)} icon={Hourglass} />
          <StatCard label="Orçamentos aprovados" value={String(d.orc.aprovado)} icon={ThumbsUp} />
          <StatCard label="Orçamentos recusados" value={String(d.orc.recusado)} icon={ThumbsDown} />
        </>}
        {verOS && <>
          <StatCard label="OS abertas" value={String(d.os.aberta)} icon={ClipboardList} />
          <StatCard label="OS em execução" value={String(d.os.execucao)} icon={Hammer} />
          <StatCard label="OS aguardando peça" value={String(d.os.peca)} icon={AlertTriangle} />
          <StatCard label="OS finalizadas" value={String(d.os.finalizada)} icon={CheckCircle2} />
        </>}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {verOrc && <Grafico titulo="Orçamentos por status" vazio={!d.orcStatus.length}>{barras(d.orcStatus, "qtd")}</Grafico>}
        {verOS && <Grafico titulo="Ordens de serviço por status" vazio={!d.osStatus.length}>{barras(d.osStatus, "qtd", "#9ca3af")}</Grafico>}
        {(pode("clientes") || pode("veiculos") || verOS) && (
          <Grafico titulo="Cadastros e OS por mês" vazio={false}>
            <BarChart data={d.cadastros}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="mes" {...eixo} /><YAxis allowDecimals={false} width={30} {...eixo} /><Tooltip {...tip} />
              {pode("clientes") && <Bar dataKey="Clientes" fill="var(--primary)" />}
              {pode("veiculos") && <Bar dataKey="Veículos" fill="#9ca3af" />}
              {verOS && <Bar dataKey="OS" fill="#e5e7eb" />}
            </BarChart>
          </Grafico>
        )}
        {(verOrc || verOS) && <Grafico titulo="Serviços mais utilizados" vazio={!d.servUso.length}>{barras(d.servUso, "qtd", "var(--primary)", true)}</Grafico>}
        {(verOrc || verOS) && <Grafico titulo="Produtos mais utilizados" vazio={!d.prodUso.length}>{barras(d.prodUso, "qtd", "#9ca3af", true)}</Grafico>}
        {pode("produtos") && (
          <Grafico titulo="Produtos com estoque baixo" vazio={!d.baixo.length}>
            <BarChart data={d.baixo} layout="vertical"><XAxis type="number" allowDecimals={false} {...eixo} /><YAxis type="category" dataKey="nome" width={120} {...eixo} /><Tooltip {...tip} />
              <Bar dataKey="Estoque" fill="var(--primary)" /><Bar dataKey="Mínimo" fill="#9ca3af" /></BarChart>
          </Grafico>
        )}
      </div>

      {(verOrc || verOS) && (
        <div className="panel mt-6 p-5">
          <h3 className="mb-3 font-display text-lg font-bold uppercase">Atividades recentes</h3>
          {d.atividades.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma atividade ainda.</p> : (
            <ul className="divide-y divide-border text-sm">
              {d.atividades.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span><Link to="/ordens/$id" params={{ id: a.docId }} className="font-mono text-xs font-bold text-primary hover:underline">{a.doc}</Link> · {a.acao}</span>
                  <span className="text-xs text-muted-foreground">{new Date(a.data).toLocaleString("pt-BR")} · {a.usuario}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
