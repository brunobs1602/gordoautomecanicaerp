import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { guard, useAcesso } from "@/lib/acesso";
import { useUsers } from "@/lib/auth";
import { ADMIN_ID, usePerfis, type Perfil } from "@/lib/permissoes";
import { alterarStatusPerfil, excluirPerfil } from "@/lib/perfis";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusBadge } from "@/components/clientes/StatusBadge";
import { Modal } from "@/components/Modal";

export const Route = createFileRoute("/_authenticated/perfis/")({
  beforeLoad: guard(["perfis"]),
  head: () => ({
    meta: [
      { title: "Perfis de acesso · Gordo Auto Mecânica ERP" },
      { name: "description", content: "Perfis de acesso e permissões dos usuários." },
      { property: "og:title", content: "Perfis de acesso · Gordo ERP" },
      { property: "og:description", content: "Perfis de acesso e permissões dos usuários." },
    ],
  }),
  component: ListaPerfis,
});

const dt = (s: string) => new Date(s).toLocaleDateString("pt-BR");

function ListaPerfis() {
  const perfis = usePerfis();
  const users = useUsers();
  const { pode } = useAcesso();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const [excluindo, setExcluindo] = useState<Perfil | null>(null);
  const qtd = (id: string) => users.filter((u) => u.role === id).length;

  const lista = useMemo(
    () => perfis.filter((p) => p.nome.toLowerCase().includes(busca.trim().toLowerCase()) && (!status || String(p.ativo) === status)),
    [perfis, busca, status],
  );

  const mudar = (p: Perfil) => {
    try {
      alterarStatusPerfil(p.id, !p.ativo);
      toast.success(p.ativo ? "Perfil inativado." : "Perfil ativado.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <>
      <PageHeader
        title="Perfis de acesso"
        subtitle="Defina o que cada perfil pode ver e fazer."
        action={pode("perfis", "criar") && <Link to="/perfis/novo" className="btn-primary"><Plus className="h-4 w-4" /> Novo perfil</Link>}
      />
      <div className="panel mb-4 grid gap-3 p-4 sm:grid-cols-[1fr_200px]">
        <input className="field" placeholder="Buscar por nome..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        <select className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select>
      </div>
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="p-4">Perfil</th><th className="p-4">Usuários</th><th className="p-4">Status</th>
              <th className="p-4">Criado em</th><th className="p-4">Atualizado em</th><th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((p) => (
              <tr key={p.id} className="border-b border-border/60 last:border-0">
                <td className="p-4">
                  <div className="font-medium">{p.nome}</div>
                  <div className="text-xs text-muted-foreground">{p.descricao}</div>
                </td>
                <td className="p-4">{qtd(p.id)}</td>
                <td className="p-4"><StatusBadge ativo={p.ativo} /></td>
                <td className="p-4 text-muted-foreground">{dt(p.criadoEm)}</td>
                <td className="p-4 text-muted-foreground">{dt(p.atualizadoEm)}</td>
                <td className="p-4">
                  <div className="flex justify-end gap-1.5">
                    <Link to="/perfis/$id" params={{ id: p.id }} className="btn-ghost px-2.5" title="Visualizar"><Eye className="h-4 w-4" /></Link>
                    {pode("perfis", "editar") && <Link to="/perfis/$id/editar" params={{ id: p.id }} className="btn-ghost px-2.5" title="Editar"><Pencil className="h-4 w-4" /></Link>}
                    {pode("perfis", "inativar") && p.id !== ADMIN_ID && (
                      <ConfirmDialog
                        trigger={<button className="btn-ghost px-2.5" title={p.ativo ? "Inativar" : "Ativar"}><Power className="h-4 w-4" /></button>}
                        title={p.ativo ? "Inativar perfil?" : "Ativar perfil?"}
                        description={p.ativo ? `Os ${qtd(p.id)} usuário(s) vinculados a "${p.nome}" perderão todas as permissões deste perfil.` : `Os usuários de "${p.nome}" voltarão a ter as permissões do perfil.`}
                        confirmLabel={p.ativo ? "Inativar" : "Ativar"}
                        onConfirm={() => mudar(p)}
                      />
                    )}
                    {pode("perfis", "excluir") && p.id !== ADMIN_ID && (
                      <button className="btn-ghost px-2.5 hover:text-destructive" title="Excluir" onClick={() => setExcluindo(p)}><Trash2 className="h-4 w-4" /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {lista.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum perfil encontrado.</td></tr>}
          </tbody>
        </table>
      </div>
      {excluindo && <ExcluirPerfil perfil={excluindo} vinculados={qtd(excluindo.id)} outros={perfis.filter((x) => x.id !== excluindo.id)} onClose={() => setExcluindo(null)} />}
    </>
  );
}

function ExcluirPerfil({ perfil, vinculados, outros, onClose }: { perfil: Perfil; vinculados: number; outros: Perfil[]; onClose: () => void }) {
  const [destino, setDestino] = useState("");
  const confirmar = () => {
    try {
      excluirPerfil(perfil.id, destino || undefined);
      toast.success("Perfil excluído.");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title="Excluir perfil?" description={`O perfil "${perfil.nome}" será excluído definitivamente. O histórico é mantido.`}>
      {vinculados > 0 && (
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-metal">Transferir {vinculados} usuário(s) para *</span>
          <select className="field" value={destino} onChange={(e) => setDestino(e.target.value)}>
            <option value="">Selecione um perfil</option>
            {outros.map((o) => <option key={o.id} value={o.id}>{o.nome}{o.ativo ? "" : " (inativo)"}</option>)}
          </select>
        </label>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-ghost h-10" onClick={onClose}>Cancelar</button>
        <button className="btn-primary h-10" disabled={vinculados > 0 && !destino} onClick={confirmar}>Excluir perfil</button>
      </div>
    </Modal>
  );
}
