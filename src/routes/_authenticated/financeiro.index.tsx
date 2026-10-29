import { createFileRoute } from "@tanstack/react-router";
import { DashboardFinanceiro } from "@/components/financeiro/Dashboard";

export const Route = createFileRoute("/_authenticated/financeiro/")({
  head: () => ({
    meta: [
      { title: "Financeiro · Mecavon" },
      { name: "description", content: "Dashboard financeiro da oficina: contas, saldos e recebimentos." },
      { property: "og:title", content: "Financeiro · Mecavon" },
      { property: "og:description", content: "Dashboard financeiro da oficina." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardFinanceiro,
});
