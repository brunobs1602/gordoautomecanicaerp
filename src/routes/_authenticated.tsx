import { useEffect } from "react";
import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { carregarSistema, logout, precisaConfiguracaoInicial, registrarAtividade, sessaoExpirada, useCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import "@/lib/dados";
import { atualizarDoBanco } from "@/lib/store";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const AO_VIVO = ["clientes", "veiculos", "produtos", "servicos", "orcamentos", "categorias", "marcas", "configuracoes", "fin_cadastros", "fin_titulos"];

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const user = await carregarSistema();
    if (!user) {
      if (await precisaConfiguracaoInicial()) throw redirect({ to: "/configuracao-inicial" });
      throw redirect({ to: "/login" });
    }
    if (sessaoExpirada()) {
      await logout();
      throw redirect({ to: "/login" });
    }
    registrarAtividade();
  },
  pendingComponent: () => (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Carregando dados...</div>
  ),
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="panel max-w-md p-8 text-center">
        <h1 className="mb-2 text-2xl font-bold uppercase">Não foi possível carregar</h1>
        <p className="mb-4 text-sm text-muted-foreground">{error instanceof Error ? error.message : "Falha de conexão."}</p>
        <button className="btn-primary" onClick={() => window.location.reload()}>Tentar novamente</button>
      </div>
    </div>
  ),
  component: Layout,
});

function Layout() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  // Expiração da sessão por inatividade, conforme Configurações.
  useEffect(() => {
    const ativo = () => registrarAtividade();
    // Ao voltar para a aba, relê o banco para não exibir dados antigos.
    let ultimo = Date.now();
    const voltou = () => {
      if (document.visibilityState !== "visible" || Date.now() - ultimo < 10_000) return;
      ultimo = Date.now();
      void atualizarDoBanco().catch(() => toast.error("Não foi possível atualizar os dados. Tente novamente."));
    };
    window.addEventListener("pointerdown", ativo);
    window.addEventListener("keydown", ativo);
    document.addEventListener("visibilitychange", voltou);
    window.addEventListener("focus", voltou);
    window.addEventListener("online", voltou);
    const t = setInterval(() => {
      if (sessaoExpirada()) void logout().then(() => navigate({ to: "/login", replace: true }));
    }, 60_000);
    return () => {
      window.removeEventListener("pointerdown", ativo);
      window.removeEventListener("keydown", ativo);
      document.removeEventListener("visibilitychange", voltou);
      window.removeEventListener("focus", voltou);
      window.removeEventListener("online", voltou);
      clearInterval(t);
    };
  }, [navigate]);
  // Alterações feitas em outro computador aparecem sozinhas: relê só a tabela alterada (RLS continua valendo).
  useEffect(() => {
    const pendentes = new Set<string>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const canal = supabase.channel("cadastros-ao-vivo");
    for (const table of AO_VIVO)
      canal.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        pendentes.add(table);
        clearTimeout(timer);
        timer = setTimeout(() => {
          const nomes = [...pendentes];
          pendentes.clear();
          void atualizarDoBanco(nomes).catch(() => undefined);
        }, 400);
      });
    canal.subscribe();
    return () => { clearTimeout(timer); void supabase.removeChannel(canal); };
  }, [navigate]);
  if (!user) return null;
  return (
    <AppShell user={user}>
      <Outlet />
    </AppShell>
  );
}
