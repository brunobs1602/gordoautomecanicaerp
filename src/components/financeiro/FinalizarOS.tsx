import { useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/Modal";
import { useAcesso } from "@/lib/acesso";
import { finalizarOSFinanceiro, hojeISO, r2, somarDias, useCadastrosFin, type Pagamento } from "@/lib/financeiro";
import { aguardarGravacoes, moeda } from "@/lib/store";
import { PagamentosForm, novoPagamento, totalAplicado, validarPagamentos } from "./PagamentoForm";
import { Campo } from "./ui";

/** Etapa financeira da finalização: várias formas de pagamento, parcial ou integral, parcelas do saldo. */
export function FinalizarOSModal({ osId, codigo, total, onClose, onFinalizar }: {
  osId: string; codigo: string; total: number; onClose: () => void; onFinalizar: () => void;
}) {
  const cads = useCadastrosFin();
  const { isAdmin } = useAcesso();
  const [data, setData] = useState(hojeISO());
  const [semPagamento, setSemPagamento] = useState(false);
  const [pags, setPags] = useState<Pagamento[]>(() => [novoPagamento(cads.filter((c) => c.tipo === "forma"), total)]);
  const [parcelas, setParcelas] = useState(1);
  const [venc, setVenc] = useState(somarDias(hojeISO(), 30));
  const [excesso, setExcesso] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const recebido = semPagamento ? 0 : totalAplicado(pags);
  const pendente = r2(total - recebido);
  const passa = recebido > total + 0.009;

  const confirmar = async () => {
    const lista = semPagamento ? [] : pags.filter((p) => p.valor > 0);
    if (!semPagamento) { const e = validarPagamentos(lista); if (e) return toast.error(e); }
    if (passa && !excesso) return toast.error("O valor recebido ultrapassa o total da OS.");
    setEnviando(true);
    try {
      onFinalizar();
      await aguardarGravacoes();
      const r = await finalizarOSFinanceiro(osId, lista, data, parcelas, venc, excesso);
      toast.success(r.pendente > 0 ? `OS finalizada. Recebido ${moeda(r.recebido)}, pendente ${moeda(r.pendente)}.` : "OS finalizada e totalmente paga.");
      onClose();
    } catch (e) { toast.error((e as Error).message); } finally { setEnviando(false); }
  };

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} wide title={`Finalizar ${codigo}`} description={`Total da OS: ${moeda(total)}. Registre como o cliente pagou.`}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Campo label="Data do recebimento"><input type="date" className="field" value={data} onChange={(e) => setData(e.target.value)} /></Campo>
          <label className="flex items-end gap-2 pb-3 text-sm sm:col-span-2"><input type="checkbox" checked={semPagamento} onChange={(e) => setSemPagamento(e.target.checked)} /> Cliente ainda não pagou (gerar conta a receber)</label>
        </div>
        {!semPagamento && <PagamentosForm tipo="receber" value={pags} onChange={setPags} dataISO={data} />}
        <div className="rounded-md border border-border p-3 text-sm">
          <div className="flex justify-between"><span>Total da OS</span><b>{moeda(total)}</b></div>
          <div className="flex justify-between"><span>Total recebido</span><b>{moeda(recebido)}</b></div>
          <div className="flex justify-between"><span>Saldo pendente</span><b className={passa ? "text-destructive" : ""}>{moeda(Math.max(0, pendente))}</b></div>
          {recebido > 0 && pendente > 0.009 && <p className="mt-1 text-xs text-amber-400">Pagamento parcial: o saldo vira conta a receber.</p>}
          {passa && (isAdmin
            ? <label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={excesso} onChange={(e) => setExcesso(e.target.checked)} /> Confirmo, como administrador, o valor acima do total.</label>
            : <p className="mt-1 text-xs text-destructive">Valor acima do total. Somente um administrador pode confirmar.</p>)}
        </div>
        {pendente > 0.009 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Parcelar o saldo em"><select className="field" value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))}>{Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}x de {moeda(r2(pendente / n))}</option>)}</select></Campo>
            <Campo label="Primeiro vencimento"><input type="date" className="field" value={venc} onChange={(e) => setVenc(e.target.value)} /></Campo>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button className="btn-ghost h-11" onClick={onClose}>Voltar</button>
          <button className="btn-primary" disabled={enviando} onClick={confirmar}>{enviando ? "Registrando..." : "Finalizar OS"}</button>
        </div>
      </div>
    </Modal>
  );
}
