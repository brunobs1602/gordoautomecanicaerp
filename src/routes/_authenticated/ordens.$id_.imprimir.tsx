import { guard } from "@/lib/acesso";
import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Cog, Printer } from "lucide-react";
import { z } from "zod";
import { STATUS_LABEL, calcularTotais, codigoDoc, subtotalItem, useOrcamentos, type Item } from "@/lib/orcamentos";
import { useClientes } from "@/lib/clientes";
import { formatarPlaca, useVeiculos } from "@/lib/veiculos";
import { useUsers } from "@/lib/auth";
import { OFICINA } from "@/lib/oficina";
import { moeda } from "@/lib/store";
import { mascaraCEP, mascaraDocumento, mascaraTelefone } from "@/lib/validacao";

export const Route = createFileRoute("/_authenticated/ordens/$id_/imprimir")({
  beforeLoad: guard(["orcamentos", "exportar"], ["ordens", "exportar"]),
  validateSearch: z.object({ auto: z.boolean().optional() }),
  head: () => ({
    meta: [
      { title: "Documento do orçamento · Gordo Auto Mecânica" },
      { name: "description", content: "Orçamento para envio ao cliente." },
      { property: "og:title", content: "Documento do orçamento · Gordo Auto Mecânica" },
      { property: "og:description", content: "Orçamento para envio ao cliente." },
    ],
  }),
  component: Documento,
});

const dataBr = (d: string) => (d ? d.split("-").reverse().join("/") : "—");

function Tabela({ titulo, itens }: { titulo: string; itens: Item[] }) {
  if (itens.length === 0) return null;
  return (
    <div className="mt-5">
      <h3 className="mb-1 border-b-2 border-primary pb-1 font-display text-sm font-bold uppercase tracking-wider">{titulo}</h3>
      <table className="w-full text-[12px]">
        <thead>
          <tr className="text-left text-ink-muted">
            <th className="py-1.5 pr-2">Descrição</th><th className="py-1.5 text-right">Qtd.</th><th className="py-1.5 text-right">Unitário</th>
            <th className="py-1.5 text-right">Desconto</th><th className="py-1.5 text-right">Acréscimo</th><th className="py-1.5 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((i) => (
            <tr key={i.id} className="border-t border-paper-border align-top">
              <td className="py-1.5 pr-2">{i.descricao}{i.observacao && <div className="text-[11px] text-ink-muted">{i.observacao}</div>}</td>
              <td className="py-1.5 text-right">{i.quantidade}</td>
              <td className="py-1.5 text-right">{moeda(i.valorUnit)}</td>
              <td className="py-1.5 text-right">{i.desconto ? moeda(i.desconto) : "—"}</td>
              <td className="py-1.5 text-right">{i.acrescimo ? moeda(i.acrescimo) : "—"}</td>
              <td className="py-1.5 text-right font-semibold">{moeda(subtotalItem(i))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Documento() {
  const { id } = Route.useParams();
  const { auto } = Route.useSearch();
  const o = useOrcamentos().find((x) => x.id === id);
  const c = useClientes().find((x) => x.id === o?.clienteId);
  const v = useVeiculos().find((x) => x.id === o?.veiculoId);
  const resp = useUsers().find((u) => u.id === o?.responsavelId);

  useEffect(() => {
    if (auto && o) {
      document.title = `${codigoDoc(o)} - Gordo Auto Mecânica`;
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [auto, o?.id]);

  if (!o) return <div className="panel p-10 text-center text-muted-foreground">Orçamento não encontrado.</div>;
  const t = calcularTotais(o.itens);
  const ehOS = o.tipo === "os";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to="/ordens/$id" params={{ id }} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted-foreground">Para PDF, escolha “Salvar como PDF” na janela de impressão.</span>
          <button className="btn-primary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Imprimir / Salvar PDF</button>
        </div>
      </div>

      <article className="mx-auto max-w-[210mm] bg-paper p-8 text-ink shadow-2xl print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-4 border-primary pb-4">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-full border-2 border-dashed border-primary" title="Espaço para a logo">
              <Cog className="h-8 w-8 text-primary" />
            </div>
            <div>
              <div className="font-display text-2xl font-extrabold italic uppercase leading-none">{OFICINA.nome}</div>
              <div className="mt-1 text-[11px] text-ink-muted">{OFICINA.endereco}</div>
              <div className="text-[11px] text-ink-muted">WhatsApp {OFICINA.telefone} · Instagram {OFICINA.instagram}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-xs font-bold uppercase tracking-widest text-primary">{ehOS ? "Ordem de serviço" : "Orçamento"}</div>
            <div className="font-display text-2xl font-bold">{codigoDoc(o)}</div>
            <div className="text-[11px] text-ink-muted">Emissão: {new Date().toLocaleDateString("pt-BR")}</div>
            {!ehOS && <div className="text-[11px] text-ink-muted">Validade: {dataBr(o.validade)}</div>}
            <div className="mt-1 inline-block rounded border border-ink px-2 py-0.5 text-[10px] font-bold uppercase">{STATUS_LABEL[o.status]}</div>
          </div>
        </header>

        <section className="mt-4 grid grid-cols-2 gap-4 text-[12px]">
          <div className="rounded border border-paper-border p-3">
            <div className="mb-1 font-display text-xs font-bold uppercase tracking-wider text-primary">Cliente</div>
            {c ? (
              <>
                <div className="font-semibold">{c.nome}</div>
                <div>{c.tipo === "PF" ? "CPF" : "CNPJ"}: {mascaraDocumento(c.documento, c.tipo)}</div>
                {c.telefone && <div>Telefone: {mascaraTelefone(c.telefone)}</div>}
                {c.email && <div>E-mail: {c.email}</div>}
                {(c.logradouro || c.cidade) && (
                  <div className="text-ink-muted">{[c.logradouro && `${c.logradouro}, ${c.numero}`, c.bairro, [c.cidade, c.estado].filter(Boolean).join("/"), c.cep && mascaraCEP(c.cep)].filter(Boolean).join(" · ")}</div>
                )}
              </>
            ) : "—"}
          </div>
          <div className="rounded border border-paper-border p-3">
            <div className="mb-1 font-display text-xs font-bold uppercase tracking-wider text-primary">Veículo</div>
            {v ? (
              <>
                <div className="font-semibold">{[v.marca, v.modelo, v.versao].filter(Boolean).join(" ")}</div>
                <div>Placa: {formatarPlaca(v.placa)}</div>
                <div>Ano: {[v.anoFabricacao, v.anoModelo].filter(Boolean).join("/") || "—"} · Cor: {v.cor || "—"}</div>
                <div>Quilometragem: {o.quilometragem ? `${Number(o.quilometragem).toLocaleString("pt-BR")} km` : "—"}</div>
              </>
            ) : "—"}
          </div>
        </section>

        {(o.problema || o.diagnostico) && (
          <section className="mt-4 grid grid-cols-2 gap-4 text-[12px]">
            <div><div className="font-display text-xs font-bold uppercase tracking-wider">Problema relatado</div><p className="whitespace-pre-wrap">{o.problema || "—"}</p></div>
            <div><div className="font-display text-xs font-bold uppercase tracking-wider">Diagnóstico</div><p className="whitespace-pre-wrap">{o.diagnostico || "—"}</p></div>
          </section>
        )}

        <Tabela titulo="Serviços" itens={o.itens.filter((i) => i.tipo === "servico")} />
        <Tabela titulo="Produtos e peças" itens={o.itens.filter((i) => i.tipo === "produto")} />

        <section className="mt-5 flex justify-end">
          <div className="w-64 space-y-1 text-[12px]">
            <div className="flex justify-between"><span>Serviços</span><span>{moeda(t.servicos)}</span></div>
            <div className="flex justify-between"><span>Produtos</span><span>{moeda(t.produtos)}</span></div>
            <div className="flex justify-between"><span>Descontos</span><span>− {moeda(t.descontos)}</span></div>
            <div className="flex justify-between"><span>Acréscimos</span><span>+ {moeda(t.acrescimos)}</span></div>
            <div className="mt-1 flex justify-between border-t-2 border-primary pt-1.5 font-display text-lg font-bold"><span>TOTAL</span><span>{moeda(t.total)}</span></div>
          </div>
        </section>

        {(o.obsCliente || o.condicoesPagamento || OFICINA.condicoesPagamento) && (
          <section className="mt-4 space-y-2 text-[12px]">
            {o.obsCliente && <div><div className="font-display text-xs font-bold uppercase tracking-wider">Observações</div><p className="whitespace-pre-wrap">{o.obsCliente}</p></div>}
            {(o.condicoesPagamento || OFICINA.condicoesPagamento) && <div><div className="font-display text-xs font-bold uppercase tracking-wider">Condições de pagamento</div><p className="whitespace-pre-wrap">{o.condicoesPagamento || OFICINA.condicoesPagamento}</p></div>}
          </section>
        )}

        <section className="mt-12 grid grid-cols-2 gap-10 text-center text-[11px]">
          <div><div className="border-t border-ink pt-1">{resp?.name ?? OFICINA.nome}<br />Responsável</div></div>
          <div><div className="border-t border-ink pt-1">{c?.nome ?? "Cliente"}<br />Aprovação do cliente — Data: ____/____/______</div></div>
        </section>
        {!ehOS && o.previsao && <p className="mt-6 text-center text-[10px] text-ink-muted">Previsão de conclusão: {dataBr(o.previsao)}</p>}
      </article>
    </div>
  );
}
