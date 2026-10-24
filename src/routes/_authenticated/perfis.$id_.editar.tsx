import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { guard, useAcesso } from "@/lib/acesso";
import { ADMIN_ID, usePerfis } from "@/lib/permissoes";
import { atualizarPerfil } from "@/lib/perfis";
import { PageHeader } from "@/components/PageHeader";
import { PerfilForm } from "@/components/perfis/PerfilForm";

export const Route = createFileRoute("/_authenticated/perfis/$id_/editar")({
  beforeLoad: guard(["perfis", "editar"]),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Editar perfil · Gordo Auto Mecânica ERP" },
      { name: "description", content: "Editar perfil de acesso e permissões." },
      { property: "og:title", content: "Editar perfil · Gordo ERP" },
      { property: "og:description", content: "Editar perfil de acesso e permissões." },
    ],
  }),
  component: Editar,
});

function Editar() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAcesso();
  const p = usePerfis().find((x) => x.id === id);
  if (!p) return <div className="panel p-10 text-center"><p className="mb-4 text-muted-foreground">Perfil não encontrado.</p><Link to="/perfis" className="btn-ghost">Voltar</Link></div>;
  const salvar = (d: Parameters<typeof atualizarPerfil>[1]) => {
    const perdeAcesso = user?.role === id && (!d.ativo || !(d.permissoes.perfis ?? []).includes("ver"));
    if (perdeAcesso && !window.confirm("Você está removendo seu próprio acesso aos perfis. Deseja continuar?")) return;
    atualizarPerfil(id, d);
    toast.success("Perfil atualizado.");
    navigate({ to: "/perfis/$id", params: { id } });
  };
  return (
    <>
      <PageHeader title={`Editar: ${p.nome}`} subtitle="As mudanças valem no próximo carregamento de cada usuário." />
      {user?.role === id && id !== ADMIN_ID && (
        <p className="mb-4 rounded-md border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-warning">Atenção: este é o seu próprio perfil. Remover permissões pode bloquear seu acesso.</p>
      )}
      <PerfilForm
        inicial={{ nome: p.nome, descricao: p.descricao, ativo: p.ativo, permissoes: p.permissoes }}
        admin={id === ADMIN_ID}
        onCancelar={() => navigate({ to: "/perfis/$id", params: { id } })}
        onSalvar={salvar}
      />
    </>
  );
}
