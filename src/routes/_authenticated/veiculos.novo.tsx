import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { criarVeiculo, veiculoVazio } from "@/lib/veiculos";
import { getClientes } from "@/lib/clientes";
import { PageHeader } from "@/components/PageHeader";
import { VeiculoForm } from "@/components/veiculos/VeiculoForm";

export const Route = createFileRoute("/_authenticated/veiculos/novo")({
  validateSearch: z.object({ clienteId: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Novo veículo · Gordo Auto Mecânica ERP" },
      { name: "description", content: "Cadastrar novo veículo." },
      { property: "og:title", content: "Novo veículo · Gordo ERP" },
      { property: "og:description", content: "Cadastrar novo veículo." },
    ],
  }),
  component: NovoVeiculo,
});

const clienteExiste = (id: string) => getClientes().some((c) => c.id === id);

function NovoVeiculo() {
  const { clienteId } = Route.useSearch();
  const navigate = useNavigate();
  const inicial = clienteId && clienteExiste(clienteId) ? clienteId : "";
  return (
    <>
      <PageHeader title="Novo veículo" subtitle="Campos com * são obrigatórios." />
      <VeiculoForm
        inicial={veiculoVazio(inicial)}
        submitLabel="Cadastrar veículo"
        cancelarPara={inicial ? { to: "/clientes/$id", params: { id: inicial } } : { to: "/veiculos" }}
        onSalvar={(d) => {
          const v = criarVeiculo(d, clienteExiste);
          navigate({ to: "/veiculos/$id", params: { id: v.id } });
        }}
      />
    </>
  );
}
