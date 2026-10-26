import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { guard } from "@/lib/acesso";

export const SECOES_FIN: [string, string][] = [
  ["", "Dashboard"], ["pagar", "Contas a pagar"], ["pagas", "Contas pagas"], ["receber", "Contas a receber"], ["recebidas", "Contas recebidas"],
  ["fluxo", "Fluxo de caixa"], ["contas", "Contas bancárias"], ["formas", "Formas de pagamento"], ["maquininhas", "Maquininhas"],
  ["taxas", "Bandeiras e taxas"], ["pix", "Pix"], ["categorias", "Categorias financeiras"], ["centros", "Centros de custo"],
  ["relatorios", "Relatórios"], ["historico", "Histórico"], ["configuracoes", "Configurações"],
];

export const Route = createFileRoute("/_authenticated/financeiro")({
  beforeLoad: guard(["financeiro"]),
  component: LayoutFinanceiro,
});

function LayoutFinanceiro() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <>
      <nav className="mb-5 flex gap-1.5 overflow-x-auto pb-1 print:hidden" aria-label="Seções do financeiro">
        {SECOES_FIN.map(([k, l]) => {
          const ativo = k ? path === `/financeiro/${k}` : path === "/financeiro" || path === "/financeiro/";
          return k
            ? <Link key={k} to="/financeiro/$secao" params={{ secao: k }} className={`whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${ativo ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>{l}</Link>
            : <Link key="dash" to="/financeiro" className={`whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${ativo ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>{l}</Link>;
        })}
      </nav>
      <Outlet />
    </>
  );
}
