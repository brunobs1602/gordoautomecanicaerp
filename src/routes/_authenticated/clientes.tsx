import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes · Gordo Auto Mecânica ERP" },
      { name: "description", content: "Módulo Clientes do Gordo ERP." },
      { property: "og:title", content: "Clientes · Gordo ERP" },
      { property: "og:description", content: "Módulo Clientes do Gordo ERP." },
    ],
  }),
  component: () => <Placeholder title="Clientes" />,
});
