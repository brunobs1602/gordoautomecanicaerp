import { useEffect, useState } from "react";
import { Check, Copy, Link2, Link2Off, MessageCircle, X } from "lucide-react";
import { toast } from "sonner";
import { useAcesso } from "@/lib/acesso";
import { useConfig } from "@/lib/config";
import { moeda } from "@/lib/store";
import type { Orcamento } from "@/lib/orcamentos";
import { useClientes } from "@/lib/clientes";
import { carregarPortalInterno, desativarLink, gerarLink, urlPortal, type Resposta } from "@/lib/portal";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const dt = (iso: string) => new Date(iso).toLocaleString("pt-BR");
type Dados = Awaited<ReturnType<typeof carregarPortalInterno>>;

function RespostaCard({ r, atual }: { r: Resposta; atual: boolean }) {
  const ap = r.itens.filter((i) => i.aprovado);
  const rec = r.itens.filter((i) => !i.aprovado);
  return (
    <div className={`rounded-md border p-3 text-sm ${atual ? "border-primary bg-primary/5" : "border-border"}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">{ap.length > 0 ? "Aprovado pelo cliente" : "Recusado pelo cliente"}</span>
        <span className="text-xs text-muted-foreground">{dt(r.respondido_em)} · {r.conta_id ? "pela conta do cliente" : "pelo link"}</span>
      </div>
      {ap.length > 0 && <ul className="mb-2 space-y-0.5">{ap.map((i) => <li key={i.id} className="flex gap-1.5"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /><span className="flex-1">{i.descricao}</span><span>{moeda(i.subtotal)}</span></li>)}</ul>}
      {rec.length > 0 && <ul className="mb-2 space-y-0.5 text-muted-foreground">{rec.map((i) => <li key={i.id} className="flex gap-1.5"><X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" /><span className="flex-1 line-through">{i.descricao}</span><span>{moeda(i.subtotal)}</span></li>)}</ul>}
      {r.observacao && <div className="mb-2 rounded-md bg-muted/40 p-2"><div className="text-xs uppercase text-muted-foreground">Observações do cliente</div><p className="whitespace-pre-wrap">{r.observacao}</p></div>}
      <div className="flex justify-between border-t border-border pt-2 font-semibold"><span>Total aprovado</span><span>{moeda(Number(r.total_aprovado))}</span></div>
      {Number(r.total_recusado) > 0 && <div className="flex justify-between text-xs text-muted-foreground"><span>Recusado</span><span>{moeda(Number(r.total_recusado))}</span></div>}
    </div>
  );
}

/** Link de aprovação para o cliente e respostas recebidas. */
export function PortalPainel({ o }: { o: Orcamento }) {
  const cfg = useConfig();
  const { pode } = useAcesso();
  const clientes = useClientes();
  const [d, setD] = useState<Dados | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const ativoCfg = cfg.orcamentos.portalCliente === true;

  useEffect(() => {
    let vivo = true;
    void carregarPortalInterno(o.id).then((x) => vivo && setD(x)).catch(() => vivo && setD({ links: [], respostas: [] }));
    return () => { vivo = false; };
  }, [o.id, o.atualizadoEm]);

  if (!d || (!ativoCfg && d.links.length === 0 && d.respostas.length === 0)) return null;
  const ativo = d.links.find((l) => l.ativo);
  const respostaAtiva = ativo && d.respostas.find((r) => r.link_id === ativo.id);
  const podeGerar = ativoCfg && o.tipo === "orcamento" && ["rascunho", "reaberto", "aguardando"].includes(o.status) && pode("orcamentos", "editar");
  const url = ativo ? urlPortal(ativo.token) : "";
  const tel = (clientes.find((c) => c.id === o.clienteId)?.telefone ?? "").replace(/\D/g, "");

  const gerar = async () => {
    setOcupado(true);
    try { const tk = await gerarLink(o.id); await navigator.clipboard?.writeText(urlPortal(tk)).catch(() => {}); toast.success("Link gerado e copiado."); setD(await carregarPortalInterno(o.id)); }
    catch (e) { toast.error((e as Error).message); }
    finally { setOcupado(false); }
  };
  const desativar = async () => {
    try { await desativarLink(o.id); toast.success("Link desativado."); setD(await carregarPortalInterno(o.id)); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <section className="panel p-5">
      <h2 className="mb-4 text-lg font-bold uppercase text-metal">Aprovação do cliente</h2>
      {respostaAtiva ? (
        <p className="mb-3 rounded-md bg-primary/10 p-2 text-sm font-semibold text-primary">O cliente respondeu em {dt(respostaAtiva.respondido_em)}.</p>
      ) : ativo ? (
        <p className="mb-3 text-sm text-muted-foreground">Aguardando resposta do cliente pelo link.</p>
      ) : null}
      {ativo && !respostaAtiva && (
        <div className="mb-3 space-y-2">
          <input readOnly value={url} className="field h-10 w-full font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost h-9" onClick={() => void navigator.clipboard.writeText(url).then(() => toast.success("Link copiado."))}><Copy className="h-4 w-4" /> Copiar</button>
            <a className="btn-ghost h-9" target="_blank" rel="noreferrer"
              href={`https://wa.me/${tel ? (tel.length <= 11 ? "55" + tel : tel) : ""}?text=${encodeURIComponent(`Olá! Segue o orçamento da ${cfg.empresa.nomeFantasia || "oficina"} para sua aprovação: ${url}`)}`}>
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
            {pode("orcamentos", "editar") && <ConfirmDialog trigger={<button className="btn-ghost h-9"><Link2Off className="h-4 w-4" /> Desativar</button>}
              title="Desativar link?" description="O cliente não conseguirá mais abrir este link." confirmLabel="Desativar" onConfirm={() => void desativar()} />}
          </div>
        </div>
      )}
      {podeGerar && (
        <ConfirmDialog
          trigger={<button className="btn-primary h-10 w-full" disabled={ocupado}><Link2 className="h-4 w-4" /> {ativo ? "Gerar novo link" : "Gerar link para o cliente"}</button>}
          title={ativo ? "Gerar novo link?" : "Enviar para aprovação do cliente?"}
          description={ativo ? "O link anterior deixará de funcionar. O cliente fará uma nova aprovação." : "O orçamento ficará como Aguardando aprovação e o cliente poderá escolher os itens pelo link."}
          confirmLabel="Gerar link" onConfirm={() => void gerar()}
        />
      )}
      {!ativoCfg && <p className="text-xs text-muted-foreground">A interatividade com o cliente está desativada nas configurações.</p>}
      {d.respostas.length > 0 && (
        <div className="mt-4 space-y-2">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Histórico de respostas</h3>
          {d.respostas.map((r, i) => <RespostaCard key={r.id} r={r} atual={i === 0} />)}
        </div>
      )}
    </section>
  );
}
