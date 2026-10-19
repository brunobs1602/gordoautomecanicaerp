import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações · Gordo Auto Mecânica ERP" },
      { name: "description", content: "Módulo Configurações do Gordo ERP." },
      { property: "og:title", content: "Configurações · Gordo ERP" },
      { property: "og:description", content: "Módulo Configurações do Gordo ERP." },
    ],
  }),
  component: () => <Placeholder title="Configurações" />,
});
