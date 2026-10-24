import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell, Car, ClipboardList, LayoutDashboard, LogOut, Menu, Package, Settings, Users, Wrench, X,
} from "lucide-react";
import { logout, type User } from "@/lib/auth";
import { useAcesso } from "@/lib/acesso";
import { useConfig } from "@/lib/config";
import { useProdutos, estoqueBaixo } from "@/lib/produtos";
import { useOrcamentos } from "@/lib/orcamentos";
import type { Acao, Modulo } from "@/lib/permissoes";
import { BrandName, LogoSlot } from "./Brand";

type Item = { to: string; label: string; icon: typeof Users; req: [Modulo, Acao?][] };
const items: Item[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, req: [["dashboard"]] },
  { to: "/clientes", label: "Clientes", icon: Users, req: [["clientes"]] },
  { to: "/veiculos", label: "Veículos", icon: Car, req: [["veiculos"]] },
  { to: "/ordens", label: "Orçamentos e OS", icon: ClipboardList, req: [["orcamentos"], ["ordens"]] },
  { to: "/produtos", label: "Produtos e peças", icon: Package, req: [["produtos"]] },
  { to: "/servicos", label: "Serviços", icon: Wrench, req: [["servicos"]] },
  { to: "/configuracoes", label: "Configurações", icon: Settings, req: [["configuracoes"], ["usuarios"], ["perfis"]] },
];

function Notificacoes() {
  const cfg = useConfig().notificacoes;
  const { pode } = useAcesso();
  const produtos = useProdutos();
  const orcs = useOrcamentos();
  const [open, setOpen] = useState(false);
  if (!cfg.ativas) return null;
  const avisos: string[] = [];
  const baixo = cfg.estoqueBaixo && pode("produtos") ? produtos.filter((p) => p.ativo && estoqueBaixo(p)).length : 0;
  if (baixo) avisos.push(`${baixo} produto(s) com estoque baixo`);
  const aguard = cfg.aguardando && pode("orcamentos") ? orcs.filter((o) => o.status === "aguardando").length : 0;
  if (aguard) avisos.push(`${aguard} orçamento(s) aguardando aprovação`);
  const recus = cfg.recusado && pode("orcamentos") ? orcs.filter((o) => o.status === "recusado").length : 0;
  if (recus) avisos.push(`${recus} orçamento(s) recusado(s)`);
  const aprov = cfg.aprovado && pode("orcamentos") ? orcs.filter((o) => o.status === "aprovado").length : 0;
  if (aprov) avisos.push(`${aprov} orçamento(s) aprovado(s) aguardando conversão`);
  return (
    <div className="relative">
      <button className="relative grid h-9 w-9 place-items-center rounded-md hover:bg-accent" onClick={() => setOpen((v) => !v)} aria-label="Notificações">
        <Bell className="h-5 w-5" />
        {avisos.length > 0 && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-primary" />}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-md border border-border bg-popover p-3 text-sm shadow-lg">
          <div className="mb-2 font-display text-sm font-bold uppercase">Notificações</div>
          {avisos.length ? <ul className="space-y-1.5">{avisos.map((a) => <li key={a}>• {a}</li>)}</ul> : <p className="text-muted-foreground">Nenhuma notificação.</p>}
        </div>
      )}
    </div>
  );
}

export function AppShell({ user, children }: { user: User; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { pode, perfil } = useAcesso();
  const vis = useConfig().visual;
  const recolhido = Boolean(vis.menuRecolhido);
  const direita = vis.menuPosicao === "direita";

  const sair = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await logout();
    await navigate({ to: "/login", replace: true });
  };

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {items
        .filter((i) => i.req.some(([m, a]) => pode(m, a ?? "ver")))
        .map((i) => {
          const active = path === i.to || path.startsWith(i.to + "/");
          return (
            <Link
              key={i.to}
              to={i.to}
              title={i.label}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-md border-l-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "border-primary bg-sidebar-accent text-sidebar-accent-foreground"
                  : "border-transparent text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
              }`}
            >
              <i.icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : ""}`} />
              <span className={recolhido ? "lg:hidden" : ""}>{i.label}</span>
            </Link>
          );
        })}
      <button
        onClick={sair}
        title="Sair"
        className="mt-auto flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 hover:bg-destructive/15 hover:text-destructive"
      >
        <LogOut className="h-4 w-4 shrink-0" /> <span className={recolhido ? "lg:hidden" : ""}>Sair</span>
      </button>
    </nav>
  );

  return (
    <div className={`flex min-h-screen w-full ${direita ? "lg:flex-row-reverse" : ""}`}>
      <aside
        className={`fixed inset-y-0 z-40 flex w-64 flex-col bg-sidebar transition-transform print:hidden lg:static lg:translate-x-0 ${
          recolhido ? "lg:w-[68px]" : ""
        } ${direita ? "right-0 border-l border-sidebar-border" : "left-0 border-r border-sidebar-border"} ${
          open ? "translate-x-0" : direita ? "translate-x-full" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-sidebar-border p-4">
          {vis.logoMenu && <LogoSlot size={recolhido ? 36 : Number(vis.tamanhoLogo) || 44} />}
          {vis.mostrarNome && <div className={recolhido ? "lg:hidden" : ""}><BrandName compact /></div>}
          <button className="ml-auto lg:hidden" onClick={() => setOpen(false)} aria-label="Fechar menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        {nav}
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-background/70 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-border bg-sidebar/80 px-4 backdrop-blur print:hidden">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <Notificacoes />
            <div className="text-right text-sm leading-tight">
              <div className="font-semibold">{user.name}</div>
              <div className="text-xs text-muted-foreground">{perfil?.nome ?? "Sem perfil"}{perfil && !perfil.ativo ? " (inativo)" : ""}</div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 print:p-0">{children}</main>
      </div>
    </div>
  );
}
