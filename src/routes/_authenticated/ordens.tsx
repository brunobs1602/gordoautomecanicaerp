import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/ordens")({
  head: () => ({
    meta: [
      { title: "Ordens de Serviço · Gordo Auto Mecânica ERP" },
      { name: "description", content: "Módulo Ordens de Serviço do Gordo ERP." },
      { property: "og:title", content: "Ordens de Serviço · Gordo ERP" },
      { property: "og:description", content: "Módulo Ordens de Serviço do Gordo ERP." },
    ],
  }),
  component: () => <Placeholder title="Ordens de Serviço" />,
});
