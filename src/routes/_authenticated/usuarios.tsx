import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Eye, KeyRound, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { guard, useAcesso } from "@/lib/acesso";
import { createUser, deleteUser, isAdminRole, resetPassword, setUserActive, updateUser, useUsers, type User } from "@/lib/auth";
import { usePerfis } from "@/lib/permissoes";
import { useConfig, validarSenha } from "@/lib/config";
import { mascaraTelefone } from "@/lib/validacao";
import { PageHeader } from "@/components/PageHeader";
import { Field, FormError } from "@/components/AuthCard";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusBadge } from "@/components/clientes/StatusBadge";
import { MatrizPermissoes } from "@/components/perfis/PerfilForm";

export const Route = createFileRoute("/_authenticated/usuarios")({
  beforeLoad: guard(["usuarios"]),
  head: () => ({
    meta: [
      { title: "Usuários · Gordo Auto Mecânica ERP" },
      { name: "description", content: "Gerenciamento de usuários do sistema." },
      { property: "og:title", content: "Usuários · Gordo ERP" },
      { property: "og:description", content: "Gerenciamento de usuários do sistema." },
    ],
  }),
  component: Usuarios,
});

const dt = (s?: string) => (s ? new Date(s).toLocaleString("pt-BR") : "—");
const erroMsg = (e: unknown) => toast.error((e as Error).message);

function Usuarios() {
  const users = useUsers();
  const perfis = usePerfis();
  const cfg = useConfig();
  const { user: me, pode } = useAcesso();
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<User | "novo" | null>(null);
  const [senha, setSenha] = useState<User | null>(null);
  const [vendo, setVendo] = useState<User | null>(null);
  const nomePerfil = (id: string) => perfis.find((p) => p.id === id)?.nome ?? "Sem perfil";

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return users.filter((u) => !q || `${u.name} ${u.email}`.toLowerCase().includes(q));
  }, [users, busca]);

  return (
    <>
      <PageHeader
        title="Usuários"
        subtitle="Gerencie quem acessa o sistema e com qual perfil."
        action={pode("usuarios", "criar") && <button className="btn-primary" onClick={() => setEditando("novo")}><Plus className="h-4 w-4" /> Novo usuário</button>}
      />
      <div className="panel mb-4 p-4"><input className="field" placeholder="Buscar por nome ou e-mail..." value={busca} onChange={(e) => setBusca(e.target.value)} /></div>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="p-4">Nome</th><th className="p-4">Perfil</th><th className="p-4">Telefone</th><th className="p-4">Status</th>
              <th className="p-4">Criado em</th>{cfg.seguranca.ultimoAcesso && <th className="p-4">Último acesso</th>}<th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((u) => (
              <tr key={u.id} className="border-b border-border/60 last:border-0">
                <td className="p-4"><div className="font-medium">{u.name}{u.id === me?.id && <span className="ml-2 text-xs text-primary">(você)</span>}</div><div className="text-xs text-muted-foreground">{u.email}</div></td>
                <td className="p-4">{nomePerfil(u.role)}</td>
                <td className="p-4 text-muted-foreground">{u.phone ? mascaraTelefone(u.phone) : "—"}</td>
                <td className="p-4"><StatusBadge ativo={u.active} /></td>
                <td className="p-4 text-muted-foreground">{new Date(u.createdAt).toLocaleDateString("pt-BR")}</td>
                {cfg.seguranca.ultimoAcesso && <td className="p-4 text-muted-foreground">{dt(u.lastLogin)}</td>}
                <td className="p-4">
                  <div className="flex justify-end gap-1.5">
                    <button className="btn-ghost px-2.5" title="Ver permissões" onClick={() => setVendo(u)}><Eye className="h-4 w-4" /></button>
                    {pode("usuarios", "editar") && <button className="btn-ghost px-2.5" title="Editar" onClick={() => setEditando(u)}><Pencil className="h-4 w-4" /></button>}
                    {pode("usuarios", "editar") && cfg.seguranca.resetAdmin && <button className="btn-ghost px-2.5" title="Redefinir senha" onClick={() => setSenha(u)}><KeyRound className="h-4 w-4" /></button>}
                    {pode("usuarios", "inativar") && u.id !== me?.id && (
                      <ConfirmDialog
                        trigger={<button className="btn-ghost px-2.5" title={u.active ? "Inativar" : "Ativar"}><Power className="h-4 w-4" /></button>}
                        title={u.active ? "Inativar usuário?" : "Ativar usuário?"}
                        description={u.active ? `${u.name} não poderá mais entrar no sistema.` : `${u.name} poderá voltar a entrar no sistema.`}
                        confirmLabel={u.active ? "Inativar" : "Ativar"}
                        onConfirm={() => { try { setUserActive(u.id, !u.active); toast.success("Status atualizado."); } catch (e) { erroMsg(e); } }}
                      />
                    )}
                    {pode("usuarios", "excluir") && u.id !== me?.id && (
                      <ConfirmDialog
                        trigger={<button className="btn-ghost px-2.5 hover:text-destructive" title="Excluir"><Trash2 className="h-4 w-4" /></button>}
                        title="Excluir usuário?"
                        description={`${u.name} será excluído definitivamente. O histórico de ações é mantido.`}
                        confirmLabel="Excluir"
                        onConfirm={() => { try { deleteUser(u.id); toast.success("Usuário excluído."); } catch (e) { erroMsg(e); } }}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editando && <UsuarioForm user={editando === "novo" ? null : editando} meId={me?.id} onClose={() => setEditando(null)} />}
      {senha && <ResetSenha user={senha} onClose={() => setSenha(null)} />}
      <Modal open={vendo !== null} onOpenChange={(o) => !o && setVendo(null)} title={vendo ? `Permissões de ${vendo.name}` : ""} description={vendo ? `Perfil: ${nomePerfil(vendo.role)}` : ""} wide>
        {vendo && (() => {
          const p = perfis.find((x) => x.id === vendo.role);
          if (!p) return <p className="text-sm text-muted-foreground">Usuário sem perfil válido: não possui permissões.</p>;
          return <>{!p.ativo && <p className="mb-3 text-sm text-warning">Perfil inativo: o usuário está sem permissões no momento.</p>}<MatrizPermissoes valor={p.permissoes} bloqueado={isAdminRole(p.id)} /></>;
        })()}
      </Modal>
    </>
  );
}

const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome.").max(100),
  email: z.string().trim().email("E-mail inválido.").max(255),
  phone: z.string().max(20),
  role: z.string().min(1, "Selecione um perfil."),
  active: z.boolean(),
});

function UsuarioForm({ user, meId, onClose }: { user: User | null; meId?: string | undefined; onClose: () => void }) {
  const perfis = usePerfis();
  const [form, setForm] = useState({
    name: user?.name ?? "", email: user?.email ?? "", phone: user?.phone ?? "", role: user?.role ?? "", active: user?.active ?? true, password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const proprio = user?.id === meId;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = schema.safeParse(form);
    const errs: Record<string, string> = r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message]));
    if (!user) {
      const s = validarSenha(form.password);
      if (s) errs.password = s;
    }
    setErrors(errs);
    if (Object.keys(errs).length || !r.success) return;
    if (proprio && user && isAdminRole(user.role) && !isAdminRole(form.role) &&
      !window.confirm("Você está removendo sua própria permissão de administrador. Deseja continuar?")) return;
    try {
      const phone = r.data.phone.replace(/\D/g, "");
      if (user) {
        updateUser(user.id, { ...r.data, phone });
        toast.success("Usuário atualizado.");
      } else {
        await createUser({ ...r.data, phone, password: form.password });
        toast.success("Usuário cadastrado com sucesso.");
      }
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={user ? "Editar usuário" : "Novo usuário"}>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <FormError message={error} />
        <Field label="Nome *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
        <Field label="E-mail *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />
        <Field label="Telefone" value={mascaraTelefone(form.phone)} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 11) })} />
        {!user && <Field label="Senha inicial *" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} />}
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-metal">Perfil de acesso *</span>
          <select className="field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="">Selecione</option>
            {perfis.map((p) => <option key={p.id} value={p.id}>{p.nome}{p.ativo ? "" : " (inativo)"}</option>)}
          </select>
          {errors.role && <span className="text-xs text-destructive">{errors.role}</span>}
        </label>
        {!proprio && (
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-metal">Status</span>
            <select className="field" value={form.active ? "1" : "0"} onChange={(e) => setForm({ ...form, active: e.target.value === "1" })}>
              <option value="1">Ativo</option><option value="0">Inativo</option>
            </select>
          </label>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost h-10" onClick={onClose}>Cancelar</button>
          <button className="btn-primary h-10">Salvar usuário</button>
        </div>
      </form>
    </Modal>
  );
}

function ResetSenha({ user, onClose }: { user: User; onClose: () => void }) {
  const [pw, setPw] = useState("");
  const [conf, setConf] = useState("");
  const [erro, setErro] = useState("");
  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== conf) return setErro("As senhas não conferem.");
    try {
      await resetPassword(user.id, pw);
      toast.success("Senha redefinida.");
      onClose();
    } catch (err) {
      setErro((err as Error).message);
    }
  };
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title="Redefinir senha" description={`Nova senha para ${user.name}. A senha atual nunca é exibida.`}>
      <form onSubmit={salvar} noValidate className="grid gap-4">
        <FormError message={erro} />
        <Field label="Nova senha" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <Field label="Confirmar senha" type="password" autoComplete="new-password" value={conf} onChange={(e) => setConf(e.target.value)} />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost h-10" onClick={onClose}>Cancelar</button>
          <button className="btn-primary h-10">Redefinir</button>
        </div>
      </form>
    </Modal>
  );
}
