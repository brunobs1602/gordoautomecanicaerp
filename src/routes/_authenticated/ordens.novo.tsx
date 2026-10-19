import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { criarOrcamento, dadosVazios, codigoDoc } from "@/lib/orcamentos";
import { useCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { OrcamentoForm } from "@/components/orcamentos/OrcamentoForm";

export const Route = createFileRoute("/_authenticated/ordens/novo")({
  head: () => ({
    meta: [
      { title: "Novo orçamento · Gordo Auto Mecânica ERP" },
      { name: "description", content: "Criar novo orçamento." },
      { property: "og:title", content: "Novo orçamento · Gordo ERP" },
      { property: "og:description", content: "Criar novo orçamento." },
    ],
  }),
  component: NovoOrcamento,
});

function NovoOrcamento() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  return (
    <>
      <PageHeader title="Novo orçamento" subtitle="O orçamento será salvo como Rascunho." />
      <OrcamentoForm
        inicial={dadosVazios(user?.id ?? "")}
        submitLabel="Salvar rascunho"
        cancelarPara={{ to: "/ordens" }}
        onSalvar={(d) => {
          const o = criarOrcamento(d, user?.name ?? "—");
          toast.success(`Orçamento ${codigoDoc(o)} salvo como rascunho.`);
          navigate({ to: "/ordens/$id", params: { id: o.id } });
        }}
      />
    </>
  );
}
