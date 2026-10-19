import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logout } from "@/lib/auth";
import { AuthCard, Field, FormError } from "@/components/AuthCard";

export const Route = createFileRoute("/redefinir-senha")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nova senha · Gordo Auto Mecânica ERP" },
      { name: "description", content: "Crie uma nova senha de acesso." },
      { property: "og:title", content: "Nova senha · Gordo ERP" },
      { property: "og:description", content: "Crie uma nova senha de acesso." },
    ],
  }),
  component: Redefinir,
});

function Redefinir() {
  const navigate = useNavigate();
  const [pronto, setPronto] = useState(false);
  const [pw, setPw] = useState("");
  const [conf, setConf] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((ev) => {
      if (ev === "PASSWORD_RECOVERY" || ev === "SIGNED_IN") setPronto(true);
    });
    void supabase.auth.getSession().then(({ data: d }) => d.session && setPronto(true));
    return () => data.subscription.unsubscribe();
  }, []);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) return setErro("A senha deve ter pelo menos 6 caracteres.");
    if (pw !== conf) return setErro("As senhas não conferem.");
    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSalvando(false);
    if (error) return setErro("Não foi possível salvar a nova senha. Use uma senha mais forte ou solicite um novo link.");
    toast.success("Senha alterada. Entre com a nova senha.");
    await logout();
    navigate({ to: "/login", replace: true });
  };

  return (
    <AuthCard title="Nova senha" subtitle={pronto ? "Digite e confirme a nova senha." : "Abra esta página pelo link enviado ao seu e-mail."}>
      {pronto && (
        <form onSubmit={salvar} className="space-y-4" noValidate>
          <FormError message={erro} />
          <Field label="Nova senha" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          <Field label="Confirmar senha" type="password" autoComplete="new-password" value={conf} onChange={(e) => setConf(e.target.value)} />
          <button className="btn-primary w-full" disabled={salvando}>{salvando ? "Salvando..." : "Salvar nova senha"}</button>
        </form>
      )}
    </AuthCard>
  );
}
