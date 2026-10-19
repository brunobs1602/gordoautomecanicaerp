import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { atualizarOrcamento, codigoDoc, podeEditar, STATUS_LABEL, useOrcamentos, type Dados } from "@/lib/orcamentos";
import { useCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { OrcamentoForm } from "@/components/orcamentos/OrcamentoForm";

export const Route = createFileRoute("/_authenticated/ordens/$id_/editar")({
  head: () => ({
    meta: [
      { title: "Editar orçamento · Gordo Auto Mecânica ERP" },
      { name: "description", content: "Editar orçamento." },
      { property: "og:title", content: "Editar orçamento · Gordo ERP" },
      { property: "og:description", content: "Editar orçamento." },
    ],
  }),
  component: EditarOrcamento,
});

function EditarOrcamento() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const o = useOrcamentos().find((x) => x.id === id);

  if (!o || !podeEditar(o.status))
    return (
      <div className="panel p-10 text-center">
        <p className="mb-4 text-muted-foreground">
          {o ? `Orçamentos com status "${STATUS_LABEL[o.status]}" não podem ser editados.` : "Orçamento não encontrado."}
        </p>
        <Link to={o ? "/ordens/$id" : "/ordens"} params={{ id }} className="btn-ghost">Voltar</Link>
      </div>
    );

  const { id: _i, numero: _n, tipo: _t, status: _s, criadoEm: _c, atualizadoEm: _a, historico: _h, versoes: _v, ...dados } = o;
  return (
    <>
      <PageHeader title={`Editar ${codigoDoc(o)}`} subtitle="Todas as alterações ficam registradas no histórico." />
      <OrcamentoForm
        key={o.id}
        inicial={dados as Dados}
        submitLabel="Salvar alterações"
        cancelarPara={{ to: "/ordens/$id", params: { id } }}
        onSalvar={(d) => {
          atualizarOrcamento(id, d, user?.name ?? "—");
          toast.success("Alterações salvas.");
          navigate({ to: "/ordens/$id", params: { id } });
        }}
      />
    </>
  );
}
