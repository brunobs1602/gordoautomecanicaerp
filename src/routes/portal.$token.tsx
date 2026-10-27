import { useMemo, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Cog, Loader2, Phone, X } from "lucide-react";
import { lerPortal } from "@/lib/portal.functions";
import { confirmarResposta, OBS_MAX, validarObs } from "@/lib/portal-conta";
import { ContaBox } from "@/components/orcamentos/ContaBox";
import { totaisSelecao, type PortalDados, type PortalItem } from "@/lib/portal";

export const Route = createFileRoute("/portal/$token")({
  loader: ({ params }) => lerPortal({ data: { token: params.token } }),
  head: () => ({
    meta: [
      { title: "Seu orçamento · Gordo Auto Mecânica" },
      { name: "description", content: "Consulte e aprove seu orçamento da Gordo Auto Mecânica." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Seu orçamento · Gordo Auto Mecânica" },
      { property: "og:description", content: "Consulte e aprove seu orçamento online." },
    ],
  }),
  component: Portal,
});

const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBr = (d: string) => (d ? d.slice(0, 10).split("-").reverse().join("/") : "—");
const MSG: Record<string, string> = {
  invalido: "Este link não é válido. Confira o endereço recebido ou fale com a oficina.",
  desativado: "A consulta online de orçamentos está indisponível no momento. Fale com a oficina.",
  falha: "Não foi possível abrir o orçamento agora. Tente novamente em instantes.",
};

function Aviso({ texto }: { texto: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <div className="panel max-w-md p-8 text-center">
        <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-primary" />
        <p>{texto}</p>
      </div>
    </div>
  );
}

function Portal() {
  const r = Route.useLoaderData();
  if ("erro" in r) return <Aviso texto={MSG[r.erro] ?? MSG["falha"]!} />;
  return <Conteudo d={r} />;
}

function Conteudo({ d }: { d: PortalDados }) {
  const { token } = Route.useParams();
  const router = useRouter();
  const [sel, setSel] = useState<Set<string>>(() => new Set(d.itens.map((i) => i.id)));
  const [resumo, setResumo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [foto, setFoto] = useState("");
  const [obs, setObs] = useState("");
  const tot = useMemo(() => totaisSelecao(d.itens, sel), [d.itens, sel]);
  const pode = d.podeAprovar;
  const ap = d.aprovacao;
  const itens: PortalItem[] = ap ? ap.itens : d.itens;
  const contato = d.empresa.whatsapp || d.empresa.telefone;

  const alternar = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const confirmar = async () => {
    if (enviando) return;
    const eObs = validarObs(obs);
    if (eObs) { setErro(eObs); return; }
    setEnviando(true); setErro("");
    const res = await confirmarResposta(token, [...sel], d.versao, obs).catch(() => ({ ok: false as const, mensagem: "Falha de conexão. Tente novamente." }));
    setEnviando(false);
    if (!res.ok) { setErro(res.mensagem); return; }
    setResumo(false);
    await router.invalidate();
  };

  const grupo = (tipo: "servico" | "produto", titulo: string) => {
    const lista = itens.filter((i) => i.tipo === tipo);
    if (!lista.length) return null;
    return (
      <section className="panel p-4 sm:p-5">
        <h2 className="mb-3 text-base font-bold uppercase text-metal">{titulo}</h2>
        <ul className="divide-y divide-border">
          {lista.map((i) => {
            const marcado = ap ? !!i.aprovado : sel.has(i.id);
            return (
              <li key={i.id}>
                <label className={`flex items-start gap-3 py-3 ${pode ? "cursor-pointer" : ""}`}>
                  {pode ? (
                    <input type="checkbox" className="mt-1 h-5 w-5 accent-primary" checked={marcado} onChange={() => alternar(i.id)} />
                  ) : ap ? (
                    marcado ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" /> : <X className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                  ) : null}
                  <div className={`min-w-0 flex-1 ${!marcado && (pode || ap) ? "text-muted-foreground" : ""}`}>
                    <div className={`font-medium ${ap && !marcado ? "line-through" : ""}`}>{i.descricao}</div>
                    {i.observacao && <div className="text-xs text-muted-foreground">{i.observacao}</div>}
                    <div className="text-xs text-muted-foreground">
                      {i.quantidade} × {moeda(i.valorUnit)}{i.desconto ? ` · desconto ${moeda(i.desconto)}` : ""}{i.acrescimo ? ` · acréscimo ${moeda(i.acrescimo)}` : ""}
                    </div>
                  </div>
                  <div className="shrink-0 font-semibold">{moeda(i.subtotal)}</div>
                </label>
              </li>
            );
          })}
        </ul>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          {d.empresa.logo ? <img src={d.empresa.logo} alt={d.empresa.nome} className="h-12 w-12 rounded-full object-contain" />
            : <div className="grid h-12 w-12 place-items-center rounded-full border-2 border-primary/60"><Cog className="h-6 w-6 text-primary" /></div>}
          <div className="min-w-0">
            <div className="font-display text-xl font-extrabold italic uppercase text-metal">{d.empresa.nome}</div>
            {d.empresa.endereco && <div className="truncate text-xs text-muted-foreground">{d.empresa.endereco}</div>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-5">
        <section className="panel p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="font-display text-2xl font-bold">Orçamento {d.codigo}</h1>
            <span className="text-sm text-muted-foreground">Emitido em {dataBr(d.emitidoEm)}{d.validade && ` · Válido até ${dataBr(d.validade)}`}</span>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-xs uppercase text-muted-foreground">Cliente</dt><dd>{d.cliente.nome || "—"}</dd></div>
            {d.veiculo && <div><dt className="text-xs uppercase text-muted-foreground">Veículo</dt>
              <dd>{[d.veiculo.marca, d.veiculo.modelo, d.veiculo.ano].filter(Boolean).join(" ")} · <span className="font-mono">{d.veiculo.placa}</span>{d.veiculo.km && ` · ${Number(d.veiculo.km).toLocaleString("pt-BR")} km`}</dd></div>}
          </dl>
        </section>

        {ap ? (
          <div className="panel border-success/50 p-4 text-sm"><CheckCircle2 className="mb-1 inline h-5 w-5 text-success" /> Sua resposta foi registrada em {new Date(ap.respondidoEm).toLocaleString("pt-BR")}. Total aprovado: <strong>{moeda(Number(ap.totalAprovado))}</strong>. Obrigado!
            {ap.observacao && <div className="mt-2"><div className="text-xs uppercase text-muted-foreground">Suas observações</div><p className="whitespace-pre-wrap">{ap.observacao}</p></div>}</div>
        ) : !d.valido ? (
          <div className="panel border-primary/60 p-4 text-sm"><AlertTriangle className="mb-1 mr-1 inline h-5 w-5 text-primary" /> O prazo de aprovação deste orçamento expirou. Entre em contato com a oficina para atualizar o orçamento.</div>
        ) : !d.linkAtivo ? (
          <div className="panel p-4 text-sm">Este link foi substituído por um mais recente. Peça o novo link à oficina.</div>
        ) : !pode ? (
          <div className="panel p-4 text-sm">Este orçamento não está aguardando aprovação no momento. Fale com a oficina.</div>
        ) : (
          <p className="text-sm text-muted-foreground">Marque os itens que deseja autorizar e toque em <strong>Revisar e aprovar</strong>.</p>
        )}

        {(d.problema || d.diagnostico) && (
          <section className="panel space-y-3 p-4 text-sm sm:p-5">
            {d.problema && <div><h2 className="text-xs uppercase text-muted-foreground">Problema relatado</h2><p className="whitespace-pre-wrap">{d.problema}</p></div>}
            {d.diagnostico && <div><h2 className="text-xs uppercase text-muted-foreground">Diagnóstico</h2><p className="whitespace-pre-wrap">{d.diagnostico}</p></div>}
          </section>
        )}

        {d.imagens.length > 0 && (
          <section className="panel p-4 sm:p-5">
            <h2 className="mb-3 text-base font-bold uppercase text-metal">Fotos</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {d.imagens.map((u) => <button key={u} onClick={() => setFoto(u)} className="aspect-square overflow-hidden rounded-md border border-border"><img src={u} alt="Foto do problema" className="h-full w-full object-cover" loading="lazy" /></button>)}
            </div>
          </section>
        )}

        {grupo("servico", "Serviços")}
        {grupo("produto", "Peças e produtos")}

        {(d.obsCliente || d.condicoesPagamento) && (
          <section className="panel space-y-3 p-4 text-sm sm:p-5">
            {d.obsCliente && <div><h2 className="text-xs uppercase text-muted-foreground">Observações</h2><p className="whitespace-pre-wrap">{d.obsCliente}</p></div>}
            {d.condicoesPagamento && <div><h2 className="text-xs uppercase text-muted-foreground">Condições de pagamento</h2><p className="whitespace-pre-wrap">{d.condicoesPagamento}</p></div>}
          </section>
        )}

        <ContaBox token={token} />

        {contato && <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><Phone className="h-4 w-4" /> Dúvidas? Fale com a oficina: {contato}</p>}
      </main>

      {pode && !ap && (
        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-card/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
            <div><div className="text-xs text-muted-foreground">{sel.size} de {d.itens.length} itens</div><div className="font-display text-2xl font-bold">{moeda(tot.aprovado)}</div></div>
            <button className="btn-primary h-12" onClick={() => { setErro(""); setResumo(true); }}>Revisar e aprovar</button>
          </div>
        </div>
      )}

      {resumo && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-background/80 sm:place-items-center" onClick={() => !enviando && setResumo(false)}>
          <div className="panel max-h-[85vh] w-full max-w-lg overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-3 font-display text-xl font-bold">Confirme sua decisão</h2>
            {sel.size === 0 ? <p className="mb-3 text-sm">Nenhum item marcado: o orçamento será <strong>recusado</strong>.</p> : (
              <ul className="mb-3 space-y-1 text-sm">
                {d.itens.filter((i) => sel.has(i.id)).map((i) => <li key={i.id} className="flex justify-between gap-2"><span>{i.descricao}</span><span>{moeda(i.subtotal)}</span></li>)}
              </ul>
            )}
            {tot.recusado > 0 && <p className="text-xs text-muted-foreground">Itens não marcados ({moeda(tot.recusado)}) ficarão como recusados.</p>}
            <div className="my-4 flex justify-between border-t border-border pt-3 text-lg font-bold"><span>Total aprovado</span><span>{moeda(tot.aprovado)}</span></div>
            <label className="mb-4 block space-y-1">
              <span className="text-sm font-medium">Observações do cliente <span className="text-xs text-muted-foreground">(opcional)</span></span>
              <textarea className="field min-h-24 w-full py-2" maxLength={OBS_MAX} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Dúvidas, pedidos de esclarecimento ou comentários sobre os itens" />
              <span className="block text-right text-xs text-muted-foreground">{obs.length}/{OBS_MAX}</span>
            </label>
            <p className="mb-4 text-xs text-muted-foreground">Após confirmar, sua resposta fica registrada e não pode ser alterada por este link.</p>
            {erro && <p className="mb-3 rounded-md bg-destructive/10 p-2 text-sm text-destructive">{erro}</p>}
            <div className="flex justify-end gap-2">
              <button className="btn-ghost h-11" disabled={enviando} onClick={() => setResumo(false)}>Voltar</button>
              <button className="btn-primary h-11" disabled={enviando} onClick={() => void confirmar()}>
                {enviando && <Loader2 className="h-4 w-4 animate-spin" />} {sel.size === 0 ? "Recusar orçamento" : "Confirmar aprovação"}
              </button>
            </div>
          </div>
        </div>
      )}

      {foto && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/95 p-4" onClick={() => setFoto("")}>
          <img src={foto} alt="Foto ampliada" className="max-h-full max-w-full rounded-md object-contain" />
        </div>
      )}
    </div>
  );
}
