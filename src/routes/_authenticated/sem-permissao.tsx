import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sem-permissao")({
  head: () => ({
    meta: [
      { title: "Acesso não autorizado · Gordo Auto Mecânica ERP" },
      { name: "description", content: "Seu perfil não tem permissão para esta área." },
      { property: "og:title", content: "Acesso não autorizado · Gordo ERP" },
      { property: "og:description", content: "Seu perfil não tem permissão para esta área." },
    ],
  }),
  component: () => (
    <div className="panel mx-auto mt-10 flex max-w-lg flex-col items-center gap-3 p-10 text-center">
      <ShieldAlert className="h-12 w-12 text-primary" />
      <h1 className="text-3xl font-bold uppercase">Acesso não autorizado</h1>
      <p className="text-sm text-muted-foreground">Seu perfil de acesso não permite abrir esta área ou realizar esta ação. Se precisar, peça ao administrador para liberar a permissão.</p>
      <Link to="/dashboard" className="btn-primary mt-2">Voltar ao início</Link>
    </div>
  ),
});
