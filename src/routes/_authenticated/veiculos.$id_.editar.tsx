import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { atualizarVeiculo, formatarPlaca, useVeiculos } from "@/lib/veiculos";
import { getClientes } from "@/lib/clientes";
import { PageHeader } from "@/components/PageHeader";
import { VeiculoForm } from "@/components/veiculos/VeiculoForm";

export const Route = createFileRoute("/_authenticated/veiculos/$id_/editar")({
  head: () => ({
    meta: [
      { title: "Editar veículo · Gordo Auto Mecânica ERP" },
      { name: "description", content: "Editar dados do veículo." },
      { property: "og:title", content: "Editar veículo · Gordo ERP" },
      { property: "og:description", content: "Editar dados do veículo." },
    ],
  }),
  component: EditarVeiculo,
});

const clienteExiste = (id: string) => getClientes().some((c) => c.id === id);

function EditarVeiculo() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const v = useVeiculos().find((x) => x.id === id);
  if (!v)
    return (
      <div className="panel p-10 text-center">
        <p className="mb-4 text-muted-foreground">Veículo não encontrado.</p>
        <Link to="/veiculos" className="btn-ghost">Voltar para veículos</Link>
      </div>
    );
  const { id: _i, criadoEm: _c, atualizadoEm: _a, ...dados } = v;
  return (
    <>
      <PageHeader title="Editar veículo" subtitle={formatarPlaca(v.placa)} />
      <VeiculoForm
        key={v.id}
        inicial={{ ...dados, placa: formatarPlaca(v.placa) }}
        submitLabel="Salvar alterações"
        cancelarPara={{ to: "/veiculos/$id", params: { id } }}
        onSalvar={(d) => {
          atualizarVeiculo(id, d, clienteExiste);
          navigate({ to: "/veiculos/$id", params: { id } });
        }}
      />
    </>
  );
}
