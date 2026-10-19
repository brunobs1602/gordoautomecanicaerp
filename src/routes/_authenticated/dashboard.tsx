import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Car, ClipboardList, DollarSign, Users } from "lucide-react";
import { useCurrentUser } from "@/lib/auth";
import { useClientes } from "@/lib/clientes";
import { useVeiculos } from "@/lib/veiculos";
import { useOrcamentos } from "@/lib/orcamentos";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · Gordo Auto Mecânica ERP" },
      { name: "description", content: "Visão geral da oficina." },
      { property: "og:title", content: "Dashboard · Gordo ERP" },
      { property: "og:description", content: "Visão geral da oficina." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const user = useCurrentUser();
  const totalClientes = useClientes().length;
  const totalVeiculos = useVeiculos().length;
  const osAbertas = useOrcamentos().filter((o) => o.tipo === "os").length;
  const first = user?.name.split(" ")[0] ?? "";
  return (
    <>
      <PageHeader title={`Olá, ${first}!`} subtitle="Bem-vindo ao Gordo Auto Mecânica ERP" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Clientes cadastrados" value={String(totalClientes)} icon={Users} />
        <StatCard label="Veículos cadastrados" value={String(totalVeiculos)} icon={Car} />
        <StatCard label="Ordens de serviço abertas" value={String(osAbertas)} icon={ClipboardList} />
        <StatCard label="Faturamento do mês" value="R$ 0,00" icon={DollarSign} />
      </div>
      <div className="panel mt-6 flex min-h-64 flex-col items-center justify-center gap-2 p-8 text-center">
        <BarChart3 className="h-10 w-10 text-muted-foreground" />
        <h2 className="text-xl font-bold uppercase">Gráficos</h2>
        <p className="text-sm text-muted-foreground">Área reservada para futuros gráficos.</p>
      </div>
    </>
  );
}
