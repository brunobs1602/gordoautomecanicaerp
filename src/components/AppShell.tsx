import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Car, ClipboardList, LayoutDashboard, LogOut, Menu, Settings, Users, UserCog, X } from "lucide-react";
import { logout, type User } from "@/lib/auth";
import { BrandName, LogoSlot } from "./Brand";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/veiculos", label: "Veículos", icon: Car },
  { to: "/ordens", label: "Ordens de Serviço", icon: ClipboardList },
  { to: "/usuarios", label: "Usuários", icon: UserCog, adminOnly: true },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function AppShell({ user, children }: { user: User; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const sair = () => {
    logout();
    navigate({ to: "/login", replace: true });
  };

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {items
        .filter((i) => !("adminOnly" in i) || user.role === "admin")
        .map((i) => {
          const active = path === i.to || path.startsWith(i.to + "/");
          return (
            <Link
              key={i.to}
              to={i.to}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-md border-l-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "border-primary bg-sidebar-accent text-sidebar-accent-foreground"
                  : "border-transparent text-sidebar-foreground/80 hover:bg-sidebar-accent/60"
              }`}
            >
              <i.icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
              {i.label}
            </Link>
          );
        })}
      <button
        onClick={sair}
        className="mt-auto flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 hover:bg-destructive/15 hover:text-destructive"
      >
        <LogOut className="h-4 w-4" /> Sair
      </button>
    </nav>
  );

  return (
    <div className="flex min-h-screen w-full">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-sidebar-border p-4">
          <LogoSlot size={44} />
          <BrandName compact />
          <button className="ml-auto lg:hidden" onClick={() => setOpen(false)} aria-label="Fechar menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        {nav}
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-background/70 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-border bg-sidebar/80 px-4 backdrop-blur">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="ml-auto text-right text-sm leading-tight">
            <div className="font-semibold">{user.name}</div>
            <div className="text-xs text-muted-foreground">{user.role === "admin" ? "Administrador" : "Funcionário"}</div>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
