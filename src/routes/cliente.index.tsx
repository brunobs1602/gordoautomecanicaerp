import { useEffect, useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Car, ChevronRight, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { abrirOrcamento, meusOrcamentos, minhaConta, sairCliente, SITUACAO, type OrcCliente, type Situacao } from "@/lib/portal-conta";

export const Route = createFileRoute("/cliente/")({
  ssr: false,
  beforeLoad: async () => {
    const c = await minhaConta();
    if (!c || "erro" in c) {
      if (c) await sairCliente();
      throw redirect({ to: "/cliente/entrar", search: { voltar: undefined } });
    }
    return { conta: c };
  },
  head: () => ({
    meta: [
      { title: "Meus orçamentos · Gordo Auto Mecânica" },
      { name: "description", content: "Todos os seus orçamentos da Gordo Auto Mecânica em um só lugar." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Meus orçamentos · Gordo Auto Mecânica" },
      { property: "og:description", content: "Consulte e aprove seus orçamentos online." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Central,
});

const moeda = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBr = (d: string) => (d ? d.slice(0, 10).split("-").reverse().join("/") : "—");
const COR: Record<Situacao, string> = {
  aguardando: "border-primary/60 text-primary", parcial: "border-warning/60 text-warning", aprovado: "border-success/60 text-success",
  recusado: "border-destructive/60 text-destructive", vencido: "border-border text-muted-foreground",
};

function Central() {
  const { conta } = Route.useRouteContext();
  const navigate = useNavigate();
  const [lista, setLista] = useState<OrcCliente[] | null>(null);
  const [abrindo, setAbrindo] = useState("");

  useEffect(() => { void meusOrcamentos().then(setLista).catch((e) => { toast.error((e as Error).message); setLista([]); }); }, []);

  const abrir = async (id: string) => {
    setAbrindo(id);
    try { const tk = await abrirOrcamento(id); navigate({ to: "/portal/$token", params: { token: tk } }); }
    catch (e) { toast.error((e as Error).message); setAbrindo(""); }
  };
  const sair = async () => { await sairCliente(); navigate({ to: "/cliente/entrar", search: { voltar: undefined }, replace: true }); };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <div className="font-display text-xl font-extrabold italic uppercase text-metal">{conta.empresa}</div>
            <div className="truncate text-xs text-muted-foreground">Olá, {conta.nome || conta.email}</div>
          </div>
          <button className="btn-ghost h-9" onClick={() => void sair()}><LogOut className="h-4 w-4" /> Sair</button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-3 px-4 py-5">
        <h1 className="font-display text-2xl font-bold">Meus orçamentos</h1>
        {!lista ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</p>
          : lista.length === 0 ? <div className="panel p-6 text-center text-sm text-muted-foreground">Nenhum orçamento enviado para você ainda.</div>
          : lista.map((o) => (
            <button key={o.id} onClick={() => void abrir(o.id)} disabled={!!abrindo} className="panel flex w-full items-center gap-3 p-4 text-left hover:border-primary/60">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">Orçamento {o.codigo}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${COR[o.situacao]}`}>{SITUACAO[o.situacao]}</span>
                </div>
                {o.veiculo && <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><Car className="h-3.5 w-3.5" /> {o.veiculo}</div>}
                <div className="mt-1 text-xs text-muted-foreground">Emitido em {dataBr(o.emitidoEm)}{o.validade && ` · Válido até ${dataBr(o.validade)}`}</div>
              </div>
              <div className="shrink-0 text-right font-display text-lg font-bold">{moeda(o.total)}</div>
              {abrindo === o.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
            </button>
          ))}
      </main>
    </div>
  );
}
