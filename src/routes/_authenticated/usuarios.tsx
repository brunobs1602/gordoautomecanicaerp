import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Plus, X } from "lucide-react";
import { z } from "zod";
import { createUser, getCurrentUser, toggleUserActive, useCurrentUser, useUsers, type Role } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Field, FormError } from "@/components/AuthCard";

export const Route = createFileRoute("/_authenticated/usuarios")({
  beforeLoad: () => {
    if (getCurrentUser()?.role !== "admin") throw redirect({ to: "/dashboard" });
  },
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

const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome.").max(100),
  email: z.string().trim().email("E-mail inválido.").max(255),
  password: z.string().min(6, "Mínimo de 6 caracteres.").max(100),
  role: z.enum(["admin", "funcionario"]),
});

function Usuarios() {
  const users = useUsers();
  const me = useCurrentUser();
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <PageHeader
        title="Usuários"
        subtitle="Gerencie quem acessa o sistema."
        action={
          <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Cancelar" : "Novo usuário"}
          </button>
        }
      />
      {showForm && <NewUserForm onDone={() => setShowForm(false)} />}

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="p-4">Nome</th>
              <th className="p-4">E-mail</th>
              <th className="p-4">Perfil</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Ação</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border/60 last:border-0">
                <td className="p-4 font-medium">{u.name}</td>
                <td className="p-4 text-muted-foreground">{u.email}</td>
                <td className="p-4">{u.role === "admin" ? "Administrador" : "Funcionário"}</td>
                <td className="p-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${u.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                    {u.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="p-4 text-right">
                  {u.id !== me?.id && (
                    <button className="btn-ghost" onClick={() => toggleUserActive(u.id)}>
                      {u.active ? "Desativar" : "Ativar"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function NewUserForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "funcionario" as Role });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = schema.safeParse(form);
    if (!r.success) return setErrors(Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message])));
    setErrors({});
    try {
      await createUser(r.data);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="panel mb-6 grid gap-4 p-5 sm:grid-cols-2">
      <div className="sm:col-span-2"><FormError message={error} /></div>
      <Field label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
      <Field label="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />
      <Field label="Senha" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} />
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-metal">Perfil</span>
        <select className="field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
          <option value="funcionario">Funcionário</option>
          <option value="admin">Administrador</option>
        </select>
      </label>
      <div className="sm:col-span-2 flex justify-end">
        <button className="btn-primary">Salvar usuário</button>
      </div>
    </form>
  );
}
