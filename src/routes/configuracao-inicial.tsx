import { ErroConexao } from "@/components/ErroConexao";
import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { login, precisaConfiguracaoInicial } from "@/lib/auth";
import { criarPrimeiroAdmin } from "@/lib/usuarios.functions";
import { AuthCard, Field, FormError } from "@/components/AuthCard";

const schema = z
  .object({
    name: z.string().trim().min(2, "Informe o nome.").max(100),
    email: z.string().trim().email("E-mail inválido.").max(255),
    password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres.").max(100),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "As senhas não conferem." });

export const Route = createFileRoute("/configuracao-inicial")({
  ssr: false,
  errorComponent: ErroConexao,
  beforeLoad: async () => {
    if (!(await precisaConfiguracaoInicial())) throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Configuração inicial · Mecavon" },
      { name: "description", content: "Cadastro do administrador principal." },
      { property: "og:title", content: "Configuração inicial · Mecavon" },
      { property: "og:description", content: "Cadastro do administrador principal." },
    ],
  }),
  component: Setup,
});

function Setup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Partial<Record<"name" | "email" | "password" | "confirm" | "role", string>>>({});
  const [error, setError] = useState("");
  const [salvando, setSalvando] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = schema.safeParse(form);
    if (!r.success) {
      setErrors(Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    setErrors({});
    setSalvando(true);
    try {
      await criarPrimeiroAdmin({ data: { name: r.data.name, email: r.data.email, password: r.data.password } });
      await login(r.data.email, r.data.password);
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      setError((err as Error).message || "Não foi possível criar o administrador.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <AuthCard title="Configuração inicial" subtitle="Cadastre o administrador principal do sistema.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormError message={error} />
        <Field label="Nome" value={form.name} onChange={set("name")} error={errors.name} />
        <Field label="E-mail" type="email" value={form.email} onChange={set("email")} error={errors.email} />
        <Field label="Senha" type="password" value={form.password} onChange={set("password")} error={errors.password} />
        <Field label="Confirmar senha" type="password" value={form.confirm} onChange={set("confirm")} error={errors.confirm} />
        <button className="btn-primary w-full" disabled={salvando}>{salvando ? "Criando..." : "Criar administrador"}</button>
      </form>
    </AuthCard>
  );
}
