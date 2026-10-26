import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAcesso } from "@/lib/acesso";
import { getConfig } from "@/lib/config";
import { STATUS_FIN_OS, statusFinanceiroOS, useCadastrosFin, useMovimentos, useTitulos } from "@/lib/financeiro";
import { STATUS_OS, alterarStatusOS, calcularTotais, codigoDoc, codigoOrcamento, statusOSDe, type Orcamento, type StatusOS } from "@/lib/orcamentos";
import { moeda } from "@/lib/store";
import { FinalizarOSModal } from "./FinalizarOS";
import { dataBr } from "./ui";

export function StatusFinBadge({ s }: { s: keyof typeof STATUS_FIN_OS }) {
  const cor = s === "pago" ? "border-emerald-500/50 text-emerald-400" : s === "parcial" ? "border-primary/50 text-primary" : s === "pendente" ? "border-amber-500/60 text-amber-400" : "border-border text-muted-foreground";
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cor}`}>{STATUS_FIN_OS[s]}</span>;
}

/** Status da OS + resumo financeiro + etapa de pagamento ao finalizar. */
export function OSPainel({ o, usuario }: { o: Orcamento; usuario: string }) {
  const { pode } = useAcesso();
  const titulos = useTitulos().filter((t) => t.documentoId === o.id);
  const movs = useMovimentos().filter((m) => m.documentoId === o.id && m.tipo === "recebimento" && !m.estornado);
  const cads = useCadastrosFin();
  const [finalizar, setFinalizar] = useState(false);
  const atual = statusOSDe(o);
  const total = calcularTotais(o.itens).total;
  const fin = statusFinanceiroOS(titulos, atual === "cancelada");
  const verFin = pode("financeiro");
  const formas = [...new Set(movs.map((m) => cads.find((c) => c.id === m.formaId)?.nome).filter(Boolean))];
  const travado = atual === "cancelada" || atual === "entregue";

  const mudar = (s: StatusOS) => {
    if (s === "finalizada" && getConfig().financeiro["financeiroAoFinalizar"] !== false && pode("financeiro", "baixar") && !titulos.some((t) => t.status !== "cancelado")) {
      setFinalizar(true);
      return;
    }
    try { alterarStatusOS(o.id, s, usuario); toast.success(`Status: ${STATUS_OS[s]}.`); } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="panel p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold uppercase">Ordem de serviço</h2>
        {verFin && <StatusFinBadge s={fin.status} />}
      </div>
      <dl className="grid gap-2 text-sm">
        <div className="flex justify-between"><dt className="text-muted-foreground">Número</dt><dd className="font-mono">{codigoDoc(o)}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">Orçamento de origem</dt><dd className="font-mono">{codigoOrcamento(o)}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">Previsão de entrega</dt><dd>{dataBr(o.previsao)}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">Conclusão</dt><dd>{dataBr(o.concluidaEm)}</dd></div>
        {verFin && <>
          <div className="flex justify-between"><dt className="text-muted-foreground">Valor total</dt><dd className="font-semibold">{moeda(total)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Recebido</dt><dd>{moeda(fin.recebido)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Pendente</dt><dd>{moeda(titulos.length ? fin.pendente : total)}</dd></div>
          {formas.length > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">Forma(s)</dt><dd>{formas.join(", ")}</dd></div>}
        </>}
      </dl>
      <label className="mt-4 block space-y-1.5">
        <span className="text-sm font-medium text-metal">Status da OS</span>
        <select className="field" value={atual} disabled={travado || !pode("ordens", "status")} onChange={(e) => mudar(e.target.value as StatusOS)}>
          {(Object.keys(STATUS_OS) as StatusOS[]).map((s) => <option key={s} value={s}>{STATUS_OS[s]}</option>)}
        </select>
      </label>
      {atual !== "finalizada" && !travado && pode("ordens", "status") && (
        <button className="btn-primary mt-3 w-full" onClick={() => mudar("finalizada")}><CheckCircle2 className="h-4 w-4" /> Finalizar OS</button>
      )}
      {verFin && titulos.length > 0 && <Link to="/financeiro/$secao" params={{ secao: "receber" }} className="btn-ghost mt-2 h-10 w-full">Ver contas a receber</Link>}
      {finalizar && <FinalizarOSModal osId={o.id} codigo={codigoDoc(o)} total={total} onClose={() => setFinalizar(false)}
        onFinalizar={() => alterarStatusOS(o.id, "finalizada", usuario)} />}
    </div>
  );
}
