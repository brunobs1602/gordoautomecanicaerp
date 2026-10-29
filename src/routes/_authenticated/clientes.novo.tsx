import { guard } from "@/lib/acesso";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { clienteVazio, criarCliente } from "@/lib/clientes";
import { PageHeader } from "@/components/PageHeader";
import { ClienteForm } from "@/components/clientes/ClienteForm";

export const Route = createFileRoute("/_authenticated/clientes/novo")({
  beforeLoad: guard(["clientes", "criar"]),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Novo cliente · Mecavon" },
      { name: "description", content: "Cadastrar novo cliente." },
      { property: "og:title", content: "Novo cliente · Mecavon" },
      { property: "og:description", content: "Cadastrar novo cliente." },
    ],
  }),
  component: NovoCliente,
});

function NovoCliente() {
  const navigate = useNavigate();
  return (
    <>
      <PageHeader title="Novo cliente" subtitle="Campos com * são obrigatórios." />
      <ClienteForm
        inicial={clienteVazio()}
        submitLabel="Cadastrar cliente"
        cancelarPara={{ to: "/clientes" }}
        onSalvar={(d) => {
          const c = criarCliente(d);
          navigate({ to: "/clientes/$id", params: { id: c.id } });
        }}
      />
    </>
  );
}
