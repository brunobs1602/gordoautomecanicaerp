import { guard, useAcesso } from "@/lib/acesso";
import { useState, type ReactNode } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRightLeft, Copy, FileDown, History, Pencil, Printer, RotateCcw, Wrench } from "lucide-react";
import { toast } from "sonner";
import {
  STATUS_LABEL, TRANSICOES, alterarStatus, calcularTotais, codigoDoc, duplicarOrcamento, podeEditar,
  subtotalItem, useOrcamentos, type Item, type Status,
  permissaoStatus, aprovadoPeloCliente,
} from "@/lib/orcamentos";
import { useClientes } from "@/lib/clientes";
import { formatarPlaca, useVeiculos } from "@/lib/veiculos";
import { useCurrentUser, useUsers } from "@/lib/auth";
import { moeda } from "@/lib/store";
import { mascaraDocumento, mascaraTelefone } from "@/lib/validacao";
import { PageHeader } from "@/components/PageHeader";
import { ExcluirRegistro } from "@/components/ExcluirRegistro";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Modal } from "@/components/Modal";
import { StatusOrc } from "@/components/orcamentos/StatusOrc";
import { ResumoFinanceiro } from "@/components/orcamentos/OrcamentoForm";
import { OSPainel } from "@/components/financeiro/OSPainel";
import { ImagensOrcamento } from "@/components/orcamentos/ImagensOrcamento";
import { PortalPainel } from "@/components/orcamentos/PortalPainel";
import { itensParaConversao, ultimaResposta } from "@/lib/portal";

export const Route = createFileRoute("/_authenticated/ordens/$id")({
  beforeLoad: guard(["orcamentos"], ["ordens"]),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Orçamento · Gordo Auto Mecânica ERP" },
      { name: "description", content: "Detalhes do orçamento ou ordem de serviço." },
      { property: "og:title", content: "Orçamento · Gordo ERP" },
      { property: "og:description", content: "Detalhes do orçamento ou ordem de serviço." },
    ],
  }),
  component: DetalheOrcamento,
});

const dt = (iso: string) => new Date(iso).toLocaleString("pt-BR");
const dataBr = (d: string) => (d ? d.split("-").reverse().join("/") : "—");

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words">{children || "—"}</dd>
    </div>
  );
}
function Bloco({ titulo, children, acao }: { titulo: string; children: ReactNode; acao?: ReactNode }) {
  return (
    <section className="panel p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold uppercase text-metal">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  );
}

function TabelaItens({ itens }: { itens: Item[] }) {
  if (itens.length === 0) return <p className="text-sm text-muted-foreground">Nenhum item.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <th className="py-2 pr-2">Descrição</th><th className="py-2 text-right">Qtd.</th><th className="py-2 text-right">Unit.</th>
            <th className="py-2 text-right">Desc.</th><th className="py-2 text-right">Acrés.</th><th className="py-2 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((i) => (
            <tr key={i.id} className="border-b border-border/50 last:border-0">
              <td className="py-2 pr-2">{i.descricao}{i.observacao && <div className="text-xs text-muted-foreground">{i.observacao}</div>}</td>
              <td className="py-2 text-right">{i.quantidade}</td>
              <td className="py-2 text-right">{moeda(i.valorUnit)}</td>
              <td className="py-2 text-right">{i.desconto ? moeda(i.desconto) : "—"}</td>
              <td className="py-2 text-right">{i.acrescimo ? moeda(i.acrescimo) : "—"}</td>
              <td className="py-2 text-right font-semibold">{moeda(subtotalItem(i))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AlterarStatus({ id, atual, usuario, tipo }: { id: string; atual: Status; usuario: string; tipo: "orcamento" | "os" }) {
  const { pode } = useAcesso();
  const opcoes = TRANSICOES[atual].filter((s) => s !== "reaberto" && s !== "convertido" && pode(...permissaoStatus(tipo, s)));
  const [open, setOpen] = useState(false);
  const [novo, setNovo] = useState<Status | "">("");
  const [obs, setObs] = useState("");
  if (opcoes.length === 0) return null;
  return (
    <>
      <button className="btn-ghost h-11" onClick={() => { setNovo(""); setObs(""); setOpen(true); }}><ArrowRightLeft className="h-4 w-4" /> Alterar status</button>
      <Modal open={open} onOpenChange={setOpen} title="Alterar status" description={`Status atual: ${STATUS_LABEL[atual]}`}>
        <div className="space-y-4">
          <div className="grid gap-2">
            {opcoes.map((s) => (
              <label key={s} className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 ${novo === s ? "border-primary bg-primary/10" : "border-border"}`}>
                <input type="radio" name="status" checked={novo === s} onChange={() => setNovo(s)} className="accent-primary" />
                <StatusOrc status={s} />
              </label>
            ))}
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-metal">Observação da alteração</span>
            <textarea className="field h-20 py-2" value={obs} onChange={(e) => setObs(e.target.value)} />
          </label>
          <div className="flex justify-end gap-2">
            <button className="btn-ghost h-10" onClick={() => setOpen(false)}>Cancelar</button>
            <button
              className="btn-primary h-10"
              disabled={!novo}
              onClick={() => {
                if (!novo) return;
                try {
                  alterarStatus(id, novo, usuario, obs.trim());
                  toast.success(`Status alterado para "${STATUS_LABEL[novo]}".`);
                  setOpen(false);
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              Confirmar alteração
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function DetalheOrcamento() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const { pode } = useAcesso();
  const nomeUser = user?.name ?? "—";
  const o = useOrcamentos().find((x) => x.id === id);
  const clientes = useClientes();
  const veiculos = useVeiculos();
  const usuarios = useUsers();
  const [versao, setVersao] = useState<number | null>(null);

  if (!o)
    return (
      <div className="panel p-10 text-center">
        <p className="mb-4 text-muted-foreground">Orçamento não encontrado.</p>
        <Link to="/ordens" className="btn-ghost">Voltar</Link>
      </div>
    );

  const c = clientes.find((x) => x.id === o.clienteId);
  const v = veiculos.find((x) => x.id === o.veiculoId);
  const resp = usuarios.find((u) => u.id === o.responsavelId);
  const totais = calcularTotais(o.itens);
  const servicos = o.itens.filter((i) => i.tipo === "servico");
  const produtos = o.itens.filter((i) => i.tipo === "produto");
  const converter = async () => {
    try {
      // Aprovação feita pelo cliente: a OS leva somente os itens aprovados.
      const r = aprovadoPeloCliente(o) ? await ultimaResposta(o.id) : null;
      const ids = r ? itensParaConversao(o.itens, r).map((i) => i.id) : undefined;
      alterarStatus(o.id, "convertido", nomeUser, "", ids);
      toast.success("Convertido em ordem de serviço.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const mudar = (s: Status, msg: string) => {
    try {
      alterarStatus(o.id, s, nomeUser);
      toast.success(msg);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const vSel = versao !== null ? o.versoes[versao] : null;

  return (
    <>
      <Link to="/ordens" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar para orçamentos
      </Link>
      <PageHeader
        title={`${o.tipo === "os" ? "Ordem de serviço" : "Orçamento"} ${codigoDoc(o)}`}
        subtitle={`Criado em ${dt(o.criadoEm)} · Atualizado em ${dt(o.atualizadoEm)}`}
        action={
          <div className="flex flex-wrap gap-2">
            {podeEditar(o.status) && pode(o.tipo === "os" ? "ordens" : "orcamentos", "editar") && <Link to="/ordens/$id/editar" params={{ id }} className="btn-ghost h-11"><Pencil className="h-4 w-4" /> Editar</Link>}
            <AlterarStatus id={o.id} atual={o.status} usuario={nomeUser} tipo={o.tipo} />
            {o.status === "recusado" && pode("orcamentos", "reabrir") && (
              <ConfirmDialog
                trigger={<button className="btn-ghost h-11"><RotateCcw className="h-4 w-4" /> Reabrir orçamento</button>}
                title="Reabrir orçamento?" description="O status mudará para Reaberto e o orçamento voltará a permitir edição."
                confirmLabel="Reabrir" onConfirm={() => mudar("reaberto", "Orçamento reaberto.")}
              />
            )}
            {o.status === "aprovado" && pode("ordens", "criar") && (
              <ConfirmDialog
                trigger={<button className="btn-primary"><Wrench className="h-4 w-4" /> Converter em OS</button>}
                title="Converter em ordem de serviço?" description={aprovadoPeloCliente(o) ? "Somente os itens aprovados pelo cliente irão para a OS. O histórico será preservado." : "Todos os dados, itens, valores e histórico serão preservados."}
                confirmLabel="Converter" onConfirm={() => void converter()}
              />
            )}
            {o.tipo === "orcamento" && <ExcluirRegistro tipo="orcamento" id={o.id} nome={codigoDoc(o)} confirmacao={codigoDoc(o)}
              detalhes={[["Número", codigoDoc(o)], ["Cliente", c?.nome ?? ""], ["Veículo", v ? [formatarPlaca(v.placa), v.modelo].filter(Boolean).join(" ") : ""],
                ["Valor total", moeda(totais.total)], ["Itens", o.itens.length ? o.itens.map((i) => `${i.quantidade}× ${i.descricao}`).join("\n") : "Nenhum"]]}
              aoExcluir={() => navigate({ to: "/ordens", replace: true })} />}
            {pode("orcamentos", "criar") && <ConfirmDialog
              trigger={<button className="btn-ghost h-11"><Copy className="h-4 w-4" /> Duplicar</button>}
              title="Duplicar orçamento?" description="Será criado um novo rascunho com os mesmos dados." confirmLabel="Duplicar"
              onConfirm={() => { const n = duplicarOrcamento(o.id, nomeUser); toast.success(`Criado ${codigoDoc(n)}.`); navigate({ to: "/ordens/$id", params: { id: n.id } }); }}
            />}
            {pode(o.tipo === "os" ? "ordens" : "orcamentos", "exportar") && <>
            <Link to="/ordens/$id/imprimir" params={{ id }} search={{ auto: true }} className="btn-ghost h-11"><FileDown className="h-4 w-4" /> Exportar PDF</Link>
            <Link to="/ordens/$id/imprimir" params={{ id }} search={{ auto: true }} className="btn-ghost h-11"><Printer className="h-4 w-4" /> Imprimir</Link>
            </>}
          </div>
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-3"><StatusOrc status={o.status} /><span className="text-sm text-muted-foreground">Responsável: {resp?.name ?? "—"}</span></div>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <Bloco titulo="Cliente">
              {c ? (
                <dl className="grid gap-3">
                  <Info label="Nome"><Link to="/clientes/$id" params={{ id: c.id }} className="text-primary hover:underline">{c.nome}</Link></Info>
                  <Info label={c.tipo === "PF" ? "CPF" : "CNPJ"}>{mascaraDocumento(c.documento, c.tipo)}</Info>
                  <Info label="Telefone">{mascaraTelefone(c.telefone)}</Info>
                </dl>
              ) : <p className="text-sm text-muted-foreground">Cliente não encontrado.</p>}
            </Bloco>
            <Bloco titulo="Veículo">
              {v ? (
                <dl className="grid gap-3">
                  <Info label="Placa"><Link to="/veiculos/$id" params={{ id: v.id }} className="font-mono text-primary hover:underline">{formatarPlaca(v.placa)}</Link></Info>
                  <Info label="Veículo">{[v.marca, v.modelo, v.anoModelo].filter(Boolean).join(" ")}</Info>
                  <Info label="Quilometragem">{o.quilometragem ? `${Number(o.quilometragem).toLocaleString("pt-BR")} km` : ""}</Info>
                </dl>
              ) : <p className="text-sm text-muted-foreground">Veículo não encontrado.</p>}
            </Bloco>
          </div>
          <Bloco titulo="Atendimento">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Info label="Validade">{dataBr(o.validade)}</Info>
              <Info label="Previsão de conclusão">{dataBr(o.previsao)}</Info>
              <Info label="Problema relatado"><span className="whitespace-pre-wrap">{o.problema}</span></Info>
              <Info label="Diagnóstico"><span className="whitespace-pre-wrap">{o.diagnostico}</span></Info>
            </dl>
          </Bloco>
          <ImagensOrcamento o={o} />
          <Bloco titulo="Serviços"><TabelaItens itens={servicos} /></Bloco>
          <Bloco titulo="Produtos e peças"><TabelaItens itens={produtos} /></Bloco>
          <Bloco titulo="Observações">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Info label="Para o cliente"><span className="whitespace-pre-wrap">{o.obsCliente}</span></Info>
              <Info label="Condições de pagamento"><span className="whitespace-pre-wrap">{o.condicoesPagamento}</span></Info>
              <Info label="Internas"><span className="whitespace-pre-wrap">{o.obsInterna}</span></Info>
            </dl>
          </Bloco>
        </div>

        <div className="space-y-5">
          {o.tipo === "os" && <OSPainel o={o} usuario={nomeUser} />}
          <PortalPainel o={o} />
          <ResumoFinanceiro totais={totais} />
          <Bloco titulo="Histórico" acao={<History className="h-4 w-4 text-muted-foreground" />}>
            <ol className="relative space-y-4 border-l border-border pl-4">
              {[...o.historico].reverse().map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                  <div className="text-sm font-semibold">{h.acao}</div>
                  <div className="text-xs text-muted-foreground">{dt(h.data)} · {h.usuario}</div>
                  {h.statusNovo && (
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                      {h.statusAnterior && <><StatusOrc status={h.statusAnterior} /> →</>} <StatusOrc status={h.statusNovo} />
                    </div>
                  )}
                  {h.detalhes.length > 0 && <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">{h.detalhes.map((d, i) => <li key={i}>{d}</li>)}</ul>}
                  {h.observacao && <p className="mt-1 text-xs italic">“{h.observacao}”</p>}
                </li>
              ))}
            </ol>
          </Bloco>
          {o.versoes.length > 0 && (
            <Bloco titulo="Versões anteriores">
              <ul className="space-y-2">
                {o.versoes.map((ver, i) => (
                  <li key={i}>
                    <button className="w-full rounded-md border border-border p-3 text-left text-sm hover:bg-accent" onClick={() => setVersao(i)}>
                      <div className="font-medium">Versão {i + 1} · {moeda(calcularTotais(ver.dados.itens).total)}</div>
                      <div className="text-xs text-muted-foreground">Substituída em {dt(ver.data)} por {ver.usuario}</div>
                    </button>
                  </li>
                ))}
              </ul>
            </Bloco>
          )}
        </div>
      </div>

      <Modal open={vSel !== null} onOpenChange={(op) => !op && setVersao(null)} title={`Versão ${(versao ?? 0) + 1}`} description={vSel ? `Dados antes da edição de ${dt(vSel.data)}` : ""} wide>
        {vSel && (
          <div className="space-y-4">
            <TabelaItens itens={vSel.dados.itens} />
            <div className="text-right font-display text-xl font-bold">Total: {moeda(calcularTotais(vSel.dados.itens).total)}</div>
            <dl className="grid gap-3 sm:grid-cols-2">
              <Info label="Problema">{vSel.dados.problema}</Info>
              <Info label="Diagnóstico">{vSel.dados.diagnostico}</Info>
              <Info label="Obs. cliente">{vSel.dados.obsCliente}</Info>
              <Info label="Validade">{dataBr(vSel.dados.validade)}</Info>
            </dl>
          </div>
        )}
      </Modal>
    </>
  );
}
