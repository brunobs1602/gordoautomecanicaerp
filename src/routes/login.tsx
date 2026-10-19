import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { getCurrentUser, hasAdmin, login } from "@/lib/auth";
import { AuthCard, Field, FormError } from "@/components/AuthCard";

export const Route = createFileRoute("/login")({
  ssr: false,
  beforeLoad: () => {
    if (!hasAdmin()) throw redirect({ to: "/configuracao-inicial" });
    if (getCurrentUser()) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Entrar · Gordo Auto Mecânica ERP" },
      { name: "description", content: "Acesso ao sistema interno da Gordo Auto Mecânica." },
      { property: "og:title", content: "Entrar · Gordo ERP" },
      { property: "og:description", content: "Acesso ao sistema interno da Gordo Auto Mecânica." },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return setError("Preencha e-mail e senha.");
    setLoading(true);
    try {
      await login(email, password);
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Entrar" subtitle="Acesse com seu e-mail e senha.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormError message={error} />
        <Field label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn-primary w-full" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button>
      </form>
    </AuthCard>
  );
}
