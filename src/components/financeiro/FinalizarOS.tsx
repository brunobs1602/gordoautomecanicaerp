import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Modal } from "@/components/Modal";
import { useAcesso } from "@/lib/acesso";
import { getConfig } from "@/lib/config";
import { finalizarOSFinanceiro, hojeISO, r2, somarDias, useCadastrosFin, type Pagamento } from "@/lib/financeiro";
import { aguardarGravacoes, moeda } from "@/lib/store";
import { PagamentosForm, novoPagamento, totalAplicado, validarPagamentos } from "./PagamentoForm";
import { Campo } from "./ui";

/** A confirmação financeira e a conclusão da OS são uma única operação no banco. */
export function FinalizarOSModal({ osId, codigo, total, onClose, posterior = false }: {
  osId: string; codigo: string; total: number; onClose: () => void; posterior?: boolean;
}) {
  const cads = useCadastrosFin();
  const { isAdmin, pode } = useAcesso();
  const [data, setData] = useState(hojeISO());
  const [escolha, setEscolha] = useState<"pago" | "depois" | "">("");
  const [pags, setPags] = useState<Pagamento[]>(() => [novoPagamento(cads.filter((c) => c.tipo === "forma"), total)]);
  const [parcelas, setParcelas] = useState(1);
  const [venc, setVenc] = useState(() => somarDias(hojeISO(), Math.max(0, Number(getConfig().financeiro.prazoPagamento) || 0)));
  const [excesso, setExcesso] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const trava = useRef(false);
  const recebido = escolha === "pago" ? totalAplicado(pags) : 0;
  const pendente = r2(total - recebido);
  const passa = recebido > total + 0.009;
  const semFormas = !cads.some((c) => c.tipo === "forma" && c.ativo);

  const confirmar = async () => {
    if (trava.current) return;
    if (!escolha) { toast.error("Informe se o cliente já pagou ou pagará depois."); return; }
    const lista = escolha === "depois" ? [] : pags;
    if (escolha === "pago") {
      const e = validarPagamentos(lista);
      if (e) { toast.error(e); return; }
      if (lista.some((p) => !cads.some((c) => c.id === p.forma_id && c.tipo === "forma" && c.ativo))) { toast.error("Selecione somente formas de pagamento ativas."); return; }
    }
    if (!data || (pendente > 0.009 && !venc)) { toast.error("Informe as datas de recebimento e de vencimento do saldo."); return; }
    if (passa && !(isAdmin && excesso)) { toast.error("O valor recebido ultrapassa o total da OS."); return; }
    trava.current = true;
    setEnviando(true);
    try {
      await aguardarGravacoes();
      const r = await finalizarOSFinanceiro(osId, lista, data, parcelas, venc, excesso);
      toast.success(escolha === "depois"
        ? `Pagamento pendente: ${moeda(r.pendente)} em Contas a receber. Nenhuma entrada registrada no caixa.`
        : r.pendente > 0 ? `Recebido ${moeda(r.recebido)}. Saldo de ${moeda(r.pendente)} em Contas a receber.` : "Pagamento confirmado. OS totalmente paga.");
      onClose();
    } catch (e) { toast.error((e as Error).message); }
    finally { trava.current = false; setEnviando(false); }
  };

  return (
    <Modal open onOpenChange={(o) => !o && !trava.current && onClose()} wide title={`${posterior ? "Registrar pagamento ·" : "Finalizar"} ${codigo}`} description={`Total da OS: ${moeda(total)}. Confirme abaixo se houve pagamento.`}>
      <fieldset disabled={enviando} className="space-y-4">
        <Campo label="O cliente já pagou?">
          <select className="field" value={escolha} onChange={(e) => setEscolha(e.target.value as typeof escolha)}>
            <option value="">Selecione para continuar</option>
            <option value="pago">Sim, registrar pagamento agora (total ou parcial)</option>
            <option value="depois">Não, registrar pagamento depois</option>
          </select>
        </Campo>
        {escolha === "pago" && <>
          <Campo label="Data do recebimento"><input type="date" className="field" value={data} onChange={(e) => setData(e.target.value)} /></Campo>
          {semFormas ? <div className="rounded-md border border-border p-3 text-sm">
            <p>Nenhuma forma de pagamento ativa. Peça ao administrador para cadastrar ou ativar uma forma no financeiro.</p>
            {pode("financeiro") && <Link to="/financeiro/$secao" params={{ secao: "formas" }} className="mt-2 inline-block text-primary">Abrir formas de pagamento</Link>}
          </div> : <PagamentosForm tipo="receber" value={pags} onChange={setPags} dataISO={data} />}
        </>}
        {escolha === "depois" && <p className="rounded-md border border-border p-3 text-sm text-muted-foreground">Será criada apenas uma conta a receber, sem entrada no caixa e sem marcar a OS como paga. Depois, confirme o recebimento em Financeiro → Contas a receber.</p>}
        {escolha && <>
          <div className="rounded-md border border-border p-3 text-sm">
            <div className="flex justify-between"><span>Total da OS</span><b>{moeda(total)}</b></div>
            <div className="flex justify-between"><span>Pagamento e descontos</span><b>{moeda(recebido)}</b></div>
            <div className="flex justify-between"><span>Saldo pendente</span><b className={passa ? "text-destructive" : ""}>{moeda(Math.max(0, pendente))}</b></div>
            {recebido > 0 && pendente > 0.009 && <p className="mt-1 text-xs text-muted-foreground">Pagamento parcial: somente o valor recebido entra no caixa. O saldo fica em aberto.</p>}
            {passa && (isAdmin
              ? <label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={excesso} onChange={(e) => setExcesso(e.target.checked)} /> Confirmo, como administrador, o valor acima do total.</label>
              : <p className="mt-1 text-xs text-destructive">Somente um administrador pode confirmar valor acima do total.</p>)}
          </div>
          {pendente > 0.009 && <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Vencimento do saldo"><input type="date" className="field" value={venc} onChange={(e) => setVenc(e.target.value)} /></Campo>
            <details><summary className="cursor-pointer py-2 text-sm text-muted-foreground">Dividir o saldo em parcelas (opcional)</summary>
              <Campo label="Número de parcelas"><select className="field" value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))}>{Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}x de aproximadamente {moeda(r2(pendente / n))}</option>)}</select></Campo>
            </details>
          </div>}
        </>}
        <div className="flex justify-end gap-2">
          <button className="btn-ghost h-11" onClick={onClose}>Voltar</button>
          <button className="btn-primary" disabled={!escolha || (escolha === "pago" && semFormas)} onClick={confirmar}>{enviando ? "Registrando..." : posterior ? "Confirmar registro" : "Confirmar e finalizar OS"}</button>
        </div>
      </fieldset>
    </Modal>
  );
}
