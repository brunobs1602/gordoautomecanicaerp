import { ErroConexao } from "@/components/ErroConexao";
import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { carregarSistema, login, precisaConfiguracaoInicial } from "@/lib/auth";
import { AuthCard, Field, FormError } from "@/components/AuthCard";

export const Route = createFileRoute("/login")({
  ssr: false,
  errorComponent: ErroConexao,
  beforeLoad: async () => {
    if (await precisaConfiguracaoInicial()) throw redirect({ to: "/configuracao-inicial" });
    if (await carregarSistema().catch(() => null)) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Entrar · Mecavon" },
      { name: "description", content: "Acesso ao Mecavon, sistema de gestão para oficinas mecânicas." },
      { property: "og:title", content: "Entrar · Mecavon" },
      { property: "og:description", content: "Acesso ao Mecavon, sistema de gestão para oficinas mecânicas." },
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
  const [esqueci, setEsqueci] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return setError("Informe o e-mail.");
    setLoading(true);
    setError("");
    try {
      if (esqueci) {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}/redefinir-senha` });
        if (err) throw new Error("Não foi possível enviar o e-mail. Tente novamente em alguns minutos.");
        toast.success("Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha.");
        setEsqueci(false);
      } else {
        if (!password) throw new Error("Informe a senha.");
        await login(email, password);
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title={esqueci ? "Recuperar senha" : "Entrar"} subtitle={esqueci ? "Enviaremos um link para o seu e-mail." : "Acesse com seu e-mail e senha."}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormError message={error} />
        <Field label="E-mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {!esqueci && <Field label="Senha" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
        <button className="btn-primary w-full" disabled={loading}>{loading ? "Aguarde..." : esqueci ? "Enviar link" : "Entrar"}</button>
        <button type="button" className="w-full text-center text-sm text-muted-foreground hover:text-foreground" onClick={() => { setEsqueci((v) => !v); setError(""); }}>
          {esqueci ? "Voltar para o login" : "Esqueci minha senha"}
        </button>
      </form>
    </AuthCard>
  );
}
