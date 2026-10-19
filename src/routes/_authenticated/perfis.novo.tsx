import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { guard } from "@/lib/acesso";
import { criarPerfil } from "@/lib/perfis";
import { PageHeader } from "@/components/PageHeader";
import { PerfilForm } from "@/components/perfis/PerfilForm";

export const Route = createFileRoute("/_authenticated/perfis/novo")({
  beforeLoad: guard(["perfis", "criar"]),
  head: () => ({
    meta: [
      { title: "Novo perfil · Gordo Auto Mecânica ERP" },
      { name: "description", content: "Criar perfil de acesso personalizado." },
      { property: "og:title", content: "Novo perfil · Gordo ERP" },
      { property: "og:description", content: "Criar perfil de acesso personalizado." },
    ],
  }),
  component: Novo,
});

function Novo() {
  const navigate = useNavigate();
  return (
    <>
      <PageHeader title="Novo perfil" subtitle="Escolha as permissões de cada módulo." />
      <PerfilForm
        inicial={{ nome: "", descricao: "", ativo: true, permissoes: { dashboard: ["ver"] } }}
        onCancelar={() => navigate({ to: "/perfis" })}
        onSalvar={(d) => {
          const p = criarPerfil(d);
          toast.success("Perfil criado com sucesso.");
          navigate({ to: "/perfis/$id", params: { id: p.id } });
        }}
      />
    </>
  );
}
