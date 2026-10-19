import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Pencil } from "lucide-react";
import { guard, useAcesso } from "@/lib/acesso";
import { useUsers } from "@/lib/auth";
import { ADMIN_ID, usePerfis } from "@/lib/permissoes";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/clientes/StatusBadge";
import { MatrizPermissoes } from "@/components/perfis/PerfilForm";

export const Route = createFileRoute("/_authenticated/perfis/$id")({
  beforeLoad: guard(["perfis"]),
  head: () => ({
    meta: [
      { title: "Perfil de acesso · Gordo Auto Mecânica ERP" },
      { name: "description", content: "Detalhes e permissões do perfil." },
      { property: "og:title", content: "Perfil de acesso · Gordo ERP" },
      { property: "og:description", content: "Detalhes e permissões do perfil." },
    ],
  }),
  component: Detalhe,
});

function Detalhe() {
  const { id } = Route.useParams();
  const { pode } = useAcesso();
  const p = usePerfis().find((x) => x.id === id);
  const usuarios = useUsers().filter((u) => u.role === id);
  if (!p) return <div className="panel p-10 text-center"><p className="mb-4 text-muted-foreground">Perfil não encontrado.</p><Link to="/perfis" className="btn-ghost">Voltar</Link></div>;
  return (
    <>
      <Link to="/perfis" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Voltar para perfis</Link>
      <PageHeader
        title={p.nome}
        subtitle={p.descricao}
        action={pode("perfis", "editar") && <Link to="/perfis/$id/editar" params={{ id }} className="btn-ghost h-11"><Pencil className="h-4 w-4" /> Editar</Link>}
      />
      <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <StatusBadge ativo={p.ativo} />
        <span>Criado em {new Date(p.criadoEm).toLocaleDateString("pt-BR")}</span>
        <span>· Atualizado em {new Date(p.atualizadoEm).toLocaleString("pt-BR")}</span>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
        <div className="panel p-5">
          <h2 className="mb-3 text-xl font-bold uppercase">Permissões</h2>
          <MatrizPermissoes valor={p.permissoes} bloqueado={id === ADMIN_ID} />
        </div>
        <div className="panel p-5">
          <h2 className="mb-3 text-xl font-bold uppercase">Usuários ({usuarios.length})</h2>
          <ul className="space-y-2 text-sm">
            {usuarios.map((u) => <li key={u.id} className="flex justify-between gap-2"><span>{u.name}</span><StatusBadge ativo={u.active} /></li>)}
            {usuarios.length === 0 && <li className="text-muted-foreground">Nenhum usuário vinculado.</li>}
          </ul>
        </div>
      </div>
    </>
  );
}
