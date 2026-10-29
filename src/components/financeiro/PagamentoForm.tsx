import { Paperclip, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { MoneyInput } from "@/components/MoneyInput";
import { useAcesso } from "@/lib/acesso";
import { buscarTaxa, calcularTaxa, enviarComprovante, r2, somarDias, useCadastrosFin, type Cadastro, type Pagamento } from "@/lib/financeiro";
import { moeda } from "@/lib/store";
import { Campo, Opcoes } from "./ui";

export const chaveForma = (formas: Cadastro[], id: string) => String(formas.find((f) => f.id === id)?.data["chave"] ?? "");

export function novoPagamento(formas: Cadastro[], valor = 0): Pagamento {
  const f = formas.find((x) => x.ativo);
  return { conta_id: String(f?.data["contaPadrao"] ?? ""), forma_id: f?.id ?? "", valor: r2(valor), parcelas: 1, modalidade: "credito" };
}

/** Recalcula taxa e líquido do cartão a partir da tabela de taxas cadastrada. */
export function recalcular(p: Pagamento, todos: Cadastro[], dataISO: string): Pagamento {
  const formas = todos.filter((c) => c.tipo === "forma");
  const chave = chaveForma(formas, p.forma_id);
  const cartao = chave === "debito" || chave === "credito";
  const pix = chave === "pix";
  const out: Pagamento = { ...p, bruto: p.valor };
  if (cartao) {
    out.modalidade = chave as "debito" | "credito";
    if (out.modalidade === "debito") out.parcelas = 1;
    if (!p.taxa_manual) {
      const t = p.maquininha_id && p.bandeira_id
        ? buscarTaxa(todos.filter((c) => c.tipo === "taxa"), { maquininhaId: p.maquininha_id, bandeiraId: p.bandeira_id, modalidade: out.modalidade, parcelas: out.parcelas ?? 1 }, dataISO)
        : undefined;
      out.taxa = t ? calcularTaxa(p.valor, Number(t.data["percentual"] || 0), Number(t.data["fixo"] || 0)).taxa : 0;
      out.previsto = t ? somarDias(dataISO, Number(t.data["prazo"] || 0)) : dataISO;
    }
  } else if (pix) {
    const k = todos.find((c) => c.id === p.pix_id);
    if (!p.taxa_manual) out.taxa = k ? r2(p.valor * (Number(k.data["taxa"] || 0) / 100)) : 0;
    if (k?.data["contaId"]) out.conta_id = String(k.data["contaId"]);
  } else if (!p.taxa_manual) out.taxa = 0;
  out.liquido = r2(p.valor + (p.juros ?? 0) + (p.multa ?? 0) - (out.taxa ?? 0));
  return out;
}

export function PagamentosForm({ tipo, value, onChange, dataISO }: {
  tipo: "pagar" | "receber"; value: Pagamento[]; onChange: (v: Pagamento[]) => void; dataISO: string;
}) {
  const todos = useCadastrosFin();
  const { pode } = useAcesso();
  const ativos = (t: Cadastro["tipo"]) => todos.filter((c) => c.tipo === t && c.ativo);
  const formas = ativos("forma");
  const contas = ativos("conta");
  const set = (i: number, patch: Partial<Pagamento>) => {
    const novo = value.map((p, j) => (j === i ? recalcular({ ...p, ...patch }, todos, dataISO) : p));
    onChange(novo);
  };
  const receber = tipo === "receber";

  return (
    <div className="space-y-3">
      {value.map((p, i) => {
        const chave = chaveForma(formas, p.forma_id);
        const cartao = receber && (chave === "debito" || chave === "credito");
        const pix = chave === "pix";
        const maqs = ativos("maquininha");
        const forma = formas.find((f) => f.id === p.forma_id);
        const maxParc = Number(forma?.data["maxParcelas"] || 12);
        return (
          <div key={i} className="rounded-md border border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pagamento {i + 1}</span>
              {value.length > 1 && <button className="text-muted-foreground hover:text-destructive" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remover pagamento"><Trash2 className="h-4 w-4" /></button>}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Opcoes label="Forma de pagamento" value={p.forma_id} itens={formas}
                onChange={(v) => set(i, {
                  forma_id: v, conta_id: String(formas.find((f) => f.id === v)?.data["contaPadrao"] ?? ""),
                  maquininha_id: undefined, bandeira_id: undefined, pix_id: undefined, nsu: undefined,
                  parcelas: 1, previsto: undefined, taxa: 0, taxa_manual: false,
                })} />
              <MoneyInput label="Valor" value={p.valor} onChange={(v) => set(i, { valor: v })} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{p.conta_id ? `Conta: ${contas.find((c) => c.id === p.conta_id)?.nome ?? "selecione uma conta ativa nas opções"}.` : "Conta automática: usa a conta padrão da forma, a única conta ativa ou o Caixa da oficina."} Sem maquininha, bandeira ou chave Pix, o recebimento é registrado sem taxa automática.</p>
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-muted-foreground">Opções adicionais: conta, descontos, taxas e comprovante</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Opcoes label={receber ? "Conta de recebimento (opcional)" : "Conta de pagamento (opcional)"} value={p.conta_id} itens={contas} vazio="Automática" onChange={(v) => set(i, { conta_id: v })} />
              {receber ? <>
                <MoneyInput label="Desconto concedido" value={p.desconto ?? 0} onChange={(v) => set(i, { desconto: v })} />
                <MoneyInput label="Acréscimo / juros" value={p.juros ?? 0} onChange={(v) => set(i, { juros: v })} />
              </> : <>
                <MoneyInput label="Juros" value={p.juros ?? 0} onChange={(v) => set(i, { juros: v })} />
                <MoneyInput label="Multa" value={p.multa ?? 0} onChange={(v) => set(i, { multa: v })} />
                <MoneyInput label="Desconto obtido" value={p.desconto ?? 0} onChange={(v) => set(i, { desconto: v })} />
              </>}
              {cartao && <>
                <Opcoes label="Maquininha" value={p.maquininha_id ?? ""} itens={maqs}
                  onChange={(v) => set(i, { maquininha_id: v, conta_id: String(maqs.find((m) => m.id === v)?.data["contaId"] ?? p.conta_id), taxa_manual: false })} />
                <Opcoes label="Bandeira" value={p.bandeira_id ?? ""} itens={ativos("bandeira")} onChange={(v) => set(i, { bandeira_id: v, taxa_manual: false })} />
                {chave === "credito" && (
                  <Campo label="Parcelas">
                    <select className="field" value={p.parcelas ?? 1} onChange={(e) => set(i, { parcelas: Number(e.target.value), taxa_manual: false })}>
                      {Array.from({ length: Math.max(1, maxParc) }, (_, k) => k + 1).map((n) => <option key={n} value={n}>{n}x</option>)}
                    </select>
                  </Campo>
                )}
              </>}
              {pix && <>
                <Opcoes label="Chave Pix" value={p.pix_id ?? ""} itens={ativos("pix")} onChange={(v) => set(i, { pix_id: v })} />
                <Campo label="Identificador da transação"><input className="field" value={p.nsu ?? ""} onChange={(e) => set(i, { nsu: e.target.value })} /></Campo>
              </>}
              {cartao && <Campo label="NSU / autorização"><input className="field" value={p.nsu ?? ""} onChange={(e) => set(i, { nsu: e.target.value })} /></Campo>}
              {(cartao || pix) && (
                <MoneyInput label={pode("financeiro", "config") ? "Taxa aplicada (editável)" : "Taxa aplicada"} value={p.taxa ?? 0}
                  disabled={!pode("financeiro", "config")} onChange={(v) => set(i, { taxa: v, taxa_manual: true })} />
              )}
              <Campo label="Observação" className="sm:col-span-2"><input className="field" value={p.obs ?? ""} onChange={(e) => set(i, { obs: e.target.value })} /></Campo>
              <Campo label="Comprovante">
                <span className="field flex cursor-pointer items-center gap-2 text-sm">
                  <Paperclip className="h-4 w-4" /> {p.comprovante ? "Anexado ✓" : "Anexar arquivo"}
                  <input type="file" className="hidden" accept="application/pdf,image/*" onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try { set(i, { comprovante: await enviarComprovante(f) }); toast.success("Comprovante anexado."); }
                    catch (err) { toast.error((err as Error).message); }
                  }} />
                </span>
              </Campo>
              </div>
            </details>
            {(cartao || pix) && (
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span>Bruto: <b className="text-foreground">{moeda(p.valor)}</b></span>
                <span>Taxa: <b className="text-foreground">{moeda(p.taxa ?? 0)}</b></span>
                <span>Líquido: <b className="text-foreground">{moeda(p.liquido ?? p.valor)}</b></span>
                {cartao && p.previsto && <span>Previsão de recebimento: <b className="text-foreground">{p.previsto.split("-").reverse().join("/")}</b></span>}
                {cartao && !p.taxa_manual && (p.taxa ?? 0) === 0 && p.maquininha_id && p.bandeira_id && <span className="text-amber-400">Nenhuma taxa cadastrada para esta combinação.</span>}
              </div>
            )}
          </div>
        );
      })}
      <button className="btn-ghost h-10" onClick={() => onChange([...value, novoPagamento(formas, 0)])}><Plus className="h-4 w-4" /> Outra forma de pagamento</button>
    </div>
  );
}

/** Validação antes de enviar. */
export function validarPagamentos(ps: Pagamento[]) {
  if (!ps.length) return "Informe ao menos um pagamento.";
  for (const [i, p] of ps.entries()) {
    if (!p.forma_id) return `Pagamento ${i + 1}: selecione a forma de pagamento.`;
    if (!Number.isFinite(p.valor) || !(p.valor > 0)) return `Pagamento ${i + 1}: informe um valor válido maior que zero.`;
    if ([p.desconto, p.juros, p.multa, p.taxa].some((v) => v !== undefined && (!Number.isFinite(v) || v < 0))) return `Pagamento ${i + 1}: descontos, acréscimos e taxas devem ser valores válidos e não negativos.`;
  }
  return "";
}
export const totalAplicado = (ps: Pagamento[]) => r2(ps.reduce((s, p) => s + p.valor + (p.desconto ?? 0), 0));
