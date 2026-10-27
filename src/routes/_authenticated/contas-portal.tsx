import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, Power } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { guard, useAcesso } from "@/lib/acesso";
import { ativarContaPortal, listarContasPortal, type ContaPortal } from "@/lib/portal-conta";
import { enviarRedefinicaoCliente } from "@/lib/portal-contas.functions";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export const Route = createFileRoute("/_authenticated/contas-portal")({
  beforeLoad: guard(["usuarios"]),
  head: () => ({
    meta: [
      { title: "Contas do portal do cliente · Gordo ERP" },
      { name: "description", content: "Contas dos clientes no portal de orçamentos." },
      { property: "og:title", content: "Contas do portal · Gordo ERP" },
      { property: "og:description", content: "Contas dos clientes no portal de orçamentos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Contas,
});

const dt = (s?: string | null) => (s ? new Date(s).toLocaleString("pt-BR") : "—");
const so = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function Contas() {
  const { pode } = useAcesso();
  const enviar = useServerFn(enviarRedefinicaoCliente);
  const [lista, setLista] = useState<ContaPortal[] | null>(null);
  const [busca, setBusca] = useState("");
  const recarregar = () => listarContasPortal().then(setLista).catch((e) => { toast.error((e as Error).message); setLista([]); });
  useEffect(() => { void recarregar(); }, []);

  const filtrados = useMemo(() => {
    const q = so(busca.trim()); const dig = busca.replace(/\D/g, "");
    return (lista ?? []).filter((c) => !q || so(`${c.nome} ${c.email} ${c.clientes?.data?.nome ?? ""}`).includes(q) || (dig && (c.clientes?.documento ?? "").includes(dig)));
  }, [lista, busca]);

  const alternar = async (c: ContaPortal) => {
    try { await ativarContaPortal(c.user_id, !c.ativo); toast.success(c.ativo ? "Acesso desativado." : "Acesso reativado."); await recarregar(); }
    catch (e) { toast.error((e as Error).message); }
  };
  const redefinir = async (c: ContaPortal) => {
    try { await enviar({ data: { userId: c.user_id, origem: window.location.origin } }); toast.success(`Link de nova senha enviado para ${c.email}.`); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Contas do portal do cliente" subtitle="Clientes com acesso aos orçamentos online" />
      <input className="field w-full" placeholder="Buscar por nome, e-mail ou CPF/CNPJ" value={busca} onChange={(e) => setBusca(e.target.value)} />
      <div className="text-xs text-muted-foreground">{filtrados.length} conta(s)</div>
      {!lista ? <p className="text-sm text-muted-foreground">Carregando...</p> : filtrados.length === 0 ? <div className="panel p-6 text-center text-sm text-muted-foreground">Nenhuma conta encontrada.</div> : (
        <div className="space-y-2">
          {filtrados.map((c) => (
            <div key={c.user_id} className="panel flex flex-wrap items-center gap-3 p-4 text-sm">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{c.nome || c.email}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${c.ativo ? "border-success/60 text-success" : "border-destructive/60 text-destructive"}`}>{c.ativo ? "Ativa" : "Desativada"}</span>
                </div>
                <div className="text-muted-foreground">{c.email}</div>
                <div className="text-xs text-muted-foreground">Cadastro do cliente: {c.clientes?.data?.nome ?? "—"}{c.clientes?.documento ? ` · ${c.clientes.documento}` : ""}</div>
                <div className="text-xs text-muted-foreground">Criada em {dt(c.criado_em)} · Último acesso {dt(c.ultimo_acesso)}</div>
              </div>
              {pode("usuarios", "editar") && (
                <div className="flex gap-2">
                  <ConfirmDialog trigger={<button className="btn-ghost h-9"><KeyRound className="h-4 w-4" /> Redefinir senha</button>}
                    title="Enviar link de nova senha?" description={`O cliente receberá em ${c.email} um link para criar uma nova senha.`} confirmLabel="Enviar" onConfirm={() => void redefinir(c)} />
                  <ConfirmDialog trigger={<button className="btn-ghost h-9"><Power className="h-4 w-4" /> {c.ativo ? "Desativar" : "Reativar"}</button>}
                    title={c.ativo ? "Desativar acesso?" : "Reativar acesso?"} description={c.ativo ? "O cliente não verá mais os orçamentos pela conta. Links já enviados continuam valendo." : "O cliente voltará a ver seus orçamentos pela conta."}
                    confirmLabel={c.ativo ? "Desativar" : "Reativar"} onConfirm={() => void alternar(c)} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
