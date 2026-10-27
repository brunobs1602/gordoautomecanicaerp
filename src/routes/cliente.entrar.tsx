import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AuthCard, Field, FormError } from "@/components/AuthCard";
import { entrarCliente, esqueciSenha } from "@/lib/portal-conta";

export const Route = createFileRoute("/cliente/entrar")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ voltar: typeof s["voltar"] === "string" && /^\/portal\/[a-f0-9]{64}$/.test(s["voltar"]) ? s["voltar"] : undefined }),
  head: () => ({
    meta: [
      { title: "Área do cliente · Gordo Auto Mecânica" },
      { name: "description", content: "Entre para consultar e aprovar seus orçamentos da Gordo Auto Mecânica." },
      { property: "og:title", content: "Área do cliente · Gordo Auto Mecânica" },
      { property: "og:description", content: "Consulte e aprove seus orçamentos online." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Entrar,
});

function Entrar() {
  const navigate = useNavigate();
  const { voltar } = Route.useSearch();
  const [modo, setModo] = useState<"entrar" | "esqueci">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(""); setAviso("");
    if (!email.trim()) return setErro("Informe seu e-mail.");
    setOcupado(true);
    try {
      if (modo === "entrar") {
        await entrarCliente(email, senha);
        if (voltar) window.location.assign(voltar);
        else navigate({ to: "/cliente", replace: true });
      } else {
        await esqueciSenha(email);
        setAviso("Se este e-mail tiver conta, você receberá um link para criar uma nova senha.");
      }
    } catch (x) { setErro((x as Error).message); }
    finally { setOcupado(false); }
  };

  return (
    <AuthCard title={modo === "entrar" ? "Área do cliente" : "Recuperar senha"} subtitle={modo === "entrar" ? "Entre para ver todos os seus orçamentos." : "Enviaremos um link para o seu e-mail."}>
      <form onSubmit={enviar} className="space-y-4" noValidate>
        <FormError message={erro} />
        {aviso && <div className="rounded-md border border-success/50 bg-success/10 px-3 py-2 text-sm">{aviso}</div>}
        <Field label="E-mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {modo === "entrar" && <Field label="Senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />}
        <button className="btn-primary w-full" disabled={ocupado}>{ocupado ? "Aguarde..." : modo === "entrar" ? "Entrar" : "Enviar link"}</button>
        <button type="button" className="w-full text-sm text-muted-foreground underline" onClick={() => { setModo(modo === "entrar" ? "esqueci" : "entrar"); setErro(""); setAviso(""); }}>
          {modo === "entrar" ? "Esqueci minha senha" : "Voltar para entrar"}
        </button>
        <p className="text-center text-xs text-muted-foreground">Ainda não tem conta? Crie a sua pelo link de orçamento enviado pela oficina.</p>
      </form>
    </AuthCard>
  );
}
