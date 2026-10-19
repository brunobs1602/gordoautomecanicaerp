import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/veiculos")({
  head: () => ({
    meta: [
      { title: "Veículos · Gordo Auto Mecânica ERP" },
      { name: "description", content: "Módulo Veículos do Gordo ERP." },
      { property: "og:title", content: "Veículos · Gordo ERP" },
      { property: "og:description", content: "Módulo Veículos do Gordo ERP." },
    ],
  }),
  component: () => <Placeholder title="Veículos" />,
});
