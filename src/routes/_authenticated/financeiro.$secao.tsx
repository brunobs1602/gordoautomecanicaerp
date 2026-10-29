import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { CadastrosFin } from "@/components/financeiro/Cadastros";
import { ContasBancarias, FluxoCaixa } from "@/components/financeiro/Contas";
import { ConfigFin, HistoricoFin } from "@/components/financeiro/Historico";
import { RelatoriosFin } from "@/components/financeiro/Relatorios";
import { Titulos } from "@/components/financeiro/Titulos";
import { SECOES_FIN } from "./financeiro";

const VALIDAS = new Set(SECOES_FIN.map(([k]) => k).filter(Boolean));

export const Route = createFileRoute("/_authenticated/financeiro/$secao")({
  beforeLoad: ({ params }) => {
    if (!VALIDAS.has(params.secao)) throw notFound();
  },
  head: ({ params }) => {
    const nome = SECOES_FIN.find(([k]) => k === params.secao)?.[1] ?? "Financeiro";
    return {
      meta: [
        { title: `${nome} · Financeiro · Mecavon` },
        { name: "description", content: `${nome} no módulo financeiro da oficina.` },
        { property: "og:title", content: `${nome} · Mecavon` },
        { property: "og:description", content: `${nome} no módulo financeiro.` },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="panel p-10 text-center text-muted-foreground">Seção não encontrada. <Link to="/financeiro" className="text-primary">Voltar ao financeiro</Link></div>
  ),
  component: Secao,
});

function Secao() {
  const { secao } = Route.useParams();
  switch (secao) {
    case "pagar": return <Titulos key="pa" tipo="pagar" modo="abertas" />;
    case "pagas": return <Titulos key="pg" tipo="pagar" modo="liquidadas" />;
    case "receber": return <Titulos key="ra" tipo="receber" modo="abertas" />;
    case "recebidas": return <Titulos key="rc" tipo="receber" modo="liquidadas" />;
    case "fluxo": return <FluxoCaixa />;
    case "contas": return <ContasBancarias />;
    case "formas": return <CadastrosFin key="f" tipo="forma" />;
    case "maquininhas": return <CadastrosFin key="m" tipo="maquininha" />;
    case "taxas": return <><CadastrosFin key="b" tipo="bandeira" /><div className="mt-8" /><CadastrosFin key="t" tipo="taxa" /></>;
    case "pix": return <CadastrosFin key="p" tipo="pix" />;
    case "categorias": return <CadastrosFin key="c" tipo="categoria" />;
    case "centros": return <CadastrosFin key="cc" tipo="centro" />;
    case "relatorios": return <RelatoriosFin />;
    case "historico": return <HistoricoFin />;
    default: return <ConfigFin />;
  }
}
