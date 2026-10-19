import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { guard } from "@/lib/acesso";
import { useAuditoria } from "@/lib/auditoria";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/historico")({
  beforeLoad: guard(["usuarios"], ["perfis"], ["configuracoes", "config"]),
  head: () => ({
    meta: [
      { title: "Histórico administrativo · Gordo Auto Mecânica ERP" },
      { name: "description", content: "Registro das ações administrativas do sistema." },
      { property: "og:title", content: "Histórico administrativo · Gordo ERP" },
      { property: "og:description", content: "Registro das ações administrativas do sistema." },
    ],
  }),
  component: Historico,
});

function Historico() {
  const registros = useAuditoria();
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("");
  const tipos = useMemo(() => [...new Set(registros.map((r) => r.tipo))].sort(), [registros]);
  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return [...registros].reverse().filter((r) => (!tipo || r.tipo === tipo) && (!q || `${r.alvo} ${r.descricao} ${r.adminNome} ${r.secao ?? ""}`.toLowerCase().includes(q)));
  }, [registros, busca, tipo]);
  return (
    <>
      <PageHeader title="Histórico administrativo" subtitle="Usuários, perfis e configurações. Os registros nunca são apagados." />
      <div className="panel mb-4 grid gap-3 p-4 sm:grid-cols-[1fr_260px]">
        <input className="field" placeholder="Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        <select className="field" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Todas as ações</option>
          {tipos.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="p-4">Data e hora</th><th className="p-4">Responsável</th><th className="p-4">Ação</th><th className="p-4">Afetado</th><th className="p-4">Descrição</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((r) => (
              <tr key={r.id} className="border-b border-border/60 align-top last:border-0">
                <td className="whitespace-nowrap p-4 text-muted-foreground">{new Date(r.data).toLocaleString("pt-BR")}</td>
                <td className="p-4">{r.adminNome}</td>
                <td className="p-4 font-medium">{r.tipo}</td>
                <td className="p-4">{r.secao ? `Configurações · ${r.secao}` : r.alvo}</td>
                <td className="p-4 text-muted-foreground">
                  {r.descricao}
                  {r.antes !== undefined && <div className="mt-1 text-xs">Antes: {r.antes || "—"} · Depois: {r.depois || "—"}</div>}
                </td>
              </tr>
            ))}
            {lista.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum registro.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
