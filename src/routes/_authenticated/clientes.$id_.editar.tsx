import { guard } from "@/lib/acesso";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { atualizarCliente, useClientes } from "@/lib/clientes";
import { mascaraCEP, mascaraDocumento, mascaraTelefone } from "@/lib/validacao";
import { PageHeader } from "@/components/PageHeader";
import { ClienteForm } from "@/components/clientes/ClienteForm";

export const Route = createFileRoute("/_authenticated/clientes/$id_/editar")({
  beforeLoad: guard(["clientes", "editar"]),
  head: () => ({
    meta: [
      { title: "Editar cliente · Gordo Auto Mecânica ERP" },
      { name: "description", content: "Editar dados do cliente." },
      { property: "og:title", content: "Editar cliente · Gordo ERP" },
      { property: "og:description", content: "Editar dados do cliente." },
    ],
  }),
  component: EditarCliente,
});

function EditarCliente() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const c = useClientes().find((x) => x.id === id);

  if (!c)
    return (
      <div className="panel p-10 text-center">
        <p className="mb-4 text-muted-foreground">Cliente não encontrado.</p>
        <Link to="/clientes" className="btn-ghost">Voltar para clientes</Link>
      </div>
    );

  const { id: _i, criadoEm: _c, atualizadoEm: _a, ...dados } = c;
  return (
    <>
      <PageHeader title="Editar cliente" subtitle={c.nome} />
      <ClienteForm
        key={c.id}
        inicial={{
          ...dados,
          documento: mascaraDocumento(c.documento, c.tipo),
          telefone: mascaraTelefone(c.telefone),
          telefone2: mascaraTelefone(c.telefone2),
          cep: mascaraCEP(c.cep),
        }}
        submitLabel="Salvar alterações"
        cancelarPara={{ to: "/clientes/$id", params: { id } }}
        onSalvar={(d) => {
          atualizarCliente(id, d);
          navigate({ to: "/clientes/$id", params: { id } });
        }}
      />
    </>
  );
}
