import { useEffect, useMemo, useState } from "react";
import { Ban, Copy, Eye, HandCoins, Paperclip, Pencil, Plus, Search, Split, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/Modal";
import { MoneyInput } from "@/components/MoneyInput";
import { PageHeader } from "@/components/PageHeader";
import { useAcesso } from "@/lib/acesso";
import { useClientes } from "@/lib/clientes";
import {
  abrirComprovante, baixarTitulo, cancelarTitulo, criarTitulo, diasAlerta, editarTitulo, enviarComprovante, estornarMovimento,
  garantirHistoricoFin, hojeISO, parcelarTitulo, r2, saldoTitulo, situacao, somarDias, useCadastrosFin, useHistoricoFin,
  useMovimentos, useTitulos, valorFinal, type NovoTitulo, type Pagamento, type Titulo,
} from "@/lib/financeiro";
import { codigoDoc, useOrcamentos } from "@/lib/orcamentos";
import { moeda } from "@/lib/store";
import { PagamentosForm, novoPagamento, totalAplicado, validarPagamentos } from "./PagamentoForm";
import {
  BotoesExportar, Campo, FiltroPeriodo, Opcoes, SituacaoBadge, Valor, Vazio, dataBr, dataHora, exportarPlanilha, intervalo, type Periodo,
} from "./ui";

const str = (v: unknown) => (v == null ? "" : String(v));
const n = (v: unknown) => Number(v ?? 0) || 0;

// ======================= Lista =======================
export function Titulos({ tipo, modo }: { tipo: "pagar" | "receber"; modo: "abertas" | "liquidadas" }) {
  const titulos = useTitulos();
  const cads = useCadastrosFin();
  const clientes = useClientes();
  const orcs = useOrcamentos();
  const { pode } = useAcesso();
  const receber = tipo === "receber";
  const [busca, setBusca] = useState("");
  const [p, setP] = useState<Periodo>(modo === "abertas" ? "tudo" : "mes");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [sit, setSit] = useState("");
  const [cat, setCat] = useState("");
  const [editar, setEditar] = useState<Titulo | "novo" | null>(null);
  const [copia, setCopia] = useState<Titulo | null>(null);
  const [baixar, setBaixar] = useState<Titulo | null>(null);
  const [ver, setVer] = useState<Titulo | null>(null);
  const [cancelar, setCancelar] = useState<Titulo | null>(null);
  const [parcelar, setParcelar] = useState<Titulo | null>(null);

  const nome = useMemo(() => new Map(cads.map((c) => [c.id, c.nome])), [cads]);
  const cliente = useMemo(() => new Map(clientes.map((c) => [c.id, c.nome])), [clientes]);
  const docs = useMemo(() => new Map(orcs.map((o) => [o.id, codigoDoc(o)])), [orcs]);
  const hoje = hojeISO();
  const alerta = diasAlerta();
  const [ini, fim] = intervalo(p, de, ate);
  const favorecido = (t: Titulo) => (receber ? cliente.get(t.clienteId ?? "") ?? str(t.data["favorecido"]) : str(t.data["favorecido"]));

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return titulos
      .filter((t) => t.tipo === tipo)
      .filter((t) => (modo === "abertas" ? t.status === "aberto" || t.status === "parcial" : t.status === "pago" || t.status === "cancelado" || t.pago > 0))
      .filter((t) => t.vencimento >= ini && t.vencimento <= fim)
      .filter((t) => !sit || situacao(t, hoje, alerta) === sit)
      .filter((t) => !cat || t.categoriaId === cat)
      .filter((t) => !q || t.descricao.toLowerCase().includes(q) || favorecido(t).toLowerCase().includes(q) || str(t.data["numeroDoc"]).toLowerCase().includes(q) ||
        (t.documentoId && (docs.get(t.documentoId) ?? "").toLowerCase().includes(q)))
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titulos, tipo, modo, ini, fim, sit, cat, busca, hoje, alerta, cliente, docs]);

  const total = r2(lista.reduce((s, t) => s + (t.status === "cancelado" ? 0 : t.valor), 0));
  const pagoTot = r2(lista.reduce((s, t) => s + t.pago, 0));
  const titulo = receber ? (modo === "abertas" ? "Contas a receber" : "Contas recebidas") : modo === "abertas" ? "Contas a pagar" : "Contas pagas";
  const categorias = cads.filter((c) => c.tipo === "categoria" && c.data["natureza"] === (receber ? "receita" : "despesa"));

  return (
    <>
      <PageHeader title={titulo} subtitle={`${lista.length} conta(s) · Total ${moeda(total)} · ${receber ? "Recebido" : "Pago"} ${moeda(pagoTot)}`}
        action={<div className="flex flex-wrap gap-2">
          {pode("financeiro", "exportar") && <BotoesExportar onPlanilha={() => exportarPlanilha(titulo.toLowerCase().replace(/\s/g, "-"),
            ["Descrição", receber ? "Cliente" : "Favorecido", "Categoria", "Vencimento", "Valor", receber ? "Recebido" : "Pago", "Saldo", "Status"],
            lista.map((t) => [t.descricao, favorecido(t), nome.get(t.categoriaId ?? "") ?? "", dataBr(t.vencimento), t.valor, t.pago, saldoTitulo(t), situacao(t, hoje, alerta)]))} />}
          {pode("financeiro", "criar") && <button className="btn-primary" onClick={() => setEditar("novo")}><Plus className="h-4 w-4" /> Nova conta</button>}
        </div>} />

      <div className="panel mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5 print:hidden">
        <Campo label="Buscar" className="sm:col-span-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input className="field pl-9" placeholder="Descrição, favorecido, documento ou OS" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
        </Campo>
        <FiltroPeriodo p={p} setP={setP} de={de} setDe={setDe} ate={ate} setAte={setAte} />
        <Campo label="Status">
          <select className="field" value={sit} onChange={(e) => setSit(e.target.value)}>
            <option value="">Todos</option>
            {(modo === "abertas" ? ["aberto", "vencendo", "vencida", "parcial"] : ["pago", "parcial", "cancelado"]).map((s) =>
              <option key={s} value={s}>{s === "aberto" ? (receber ? "Aguardando pagamento" : "Em aberto") : s === "parcial" ? "Parcial" : s[0]!.toUpperCase() + s.slice(1)}</option>)}
          </select>
        </Campo>
        <Opcoes label="Categoria" value={cat} onChange={setCat} itens={categorias} vazio="Todas" />
      </div>

      {lista.length === 0 ? <Vazio>Nenhuma conta encontrada com estes filtros.</Vazio> : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="p-3">Descrição</th><th className="p-3">{receber ? "Cliente / OS" : "Favorecido"}</th><th className="p-3">Categoria</th>
                <th className="p-3">Vencimento</th><th className="p-3 text-right">Valor</th><th className="p-3 text-right">{receber ? "Recebido" : "Pago"}</th>
                <th className="p-3 text-right">Saldo</th><th className="p-3">Status</th><th className="p-3 text-right print:hidden">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((t) => {
                const s = situacao(t, hoje, alerta);
                const aberta = t.status === "aberto" || t.status === "parcial";
                return (
                  <tr key={t.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                    <td className="p-3">
                      <div className="font-medium">{t.descricao}</div>
                      {t.parcelas > 1 && <div className="text-xs text-muted-foreground">Parcela {t.parcela}/{t.parcelas}</div>}
                    </td>
                    <td className="p-3">{favorecido(t) || "—"}{t.documentoId && <div className="font-mono text-xs text-muted-foreground">{docs.get(t.documentoId)}</div>}</td>
                    <td className="p-3 text-muted-foreground">{nome.get(t.categoriaId ?? "") ?? "—"}</td>
                    <td className="p-3">{dataBr(t.vencimento)}</td>
                    <td className="p-3 text-right font-semibold"><Valor v={t.valor} /></td>
                    <td className="p-3 text-right"><Valor v={t.pago} /></td>
                    <td className="p-3 text-right"><Valor v={saldoTitulo(t)} /></td>
                    <td className="p-3"><SituacaoBadge s={s} receber={receber} /></td>
                    <td className="p-3 print:hidden">
                      <div className="flex justify-end gap-1">
                        {aberta && pode("financeiro", "baixar") && <button className="btn-primary h-9 px-2.5" title={receber ? "Registrar recebimento" : "Marcar como paga"} onClick={() => setBaixar(t)}><HandCoins className="h-4 w-4" /></button>}
                        <button className="btn-ghost px-2.5" title="Detalhes e histórico" onClick={() => setVer(t)}><Eye className="h-4 w-4" /></button>
                        {aberta && pode("financeiro", "editar") && <button className="btn-ghost px-2.5" title="Editar" onClick={() => setEditar(t)}><Pencil className="h-4 w-4" /></button>}
                        {pode("financeiro", "criar") && <button className="btn-ghost px-2.5" title="Duplicar" onClick={() => setCopia(t)}><Copy className="h-4 w-4" /></button>}
                        {t.status === "aberto" && t.pago === 0 && pode("financeiro", "editar") && pode("financeiro", "criar") && <button className="btn-ghost px-2.5" title="Dividir em parcelas" onClick={() => setParcelar(t)}><Split className="h-4 w-4" /></button>}
                        {aberta && t.pago === 0 && pode("financeiro", "cancelar") && <button className="btn-ghost px-2.5 hover:text-destructive" title="Cancelar" onClick={() => setCancelar(t)}><Ban className="h-4 w-4" /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(editar || copia) && <TituloForm tipo={tipo} atual={editar && editar !== "novo" ? editar : null} copia={copia} onClose={() => { setEditar(null); setCopia(null); }} />}
      {baixar && <BaixaModal t={baixar} onClose={() => setBaixar(null)} />}
      {ver && <DetalheTitulo t={titulos.find((x) => x.id === ver.id) ?? ver} onClose={() => setVer(null)} />}
      {cancelar && <MotivoModal titulo="Cancelar conta" texto={`A conta "${cancelar.descricao}" ficará cancelada. Ela não será apagada.`} acao="Cancelar conta"
        onClose={() => setCancelar(null)} onConfirm={async (m) => { await cancelarTitulo(cancelar.id, m); toast.success("Conta cancelada."); }} />}
      {parcelar && <ParcelarModal t={parcelar} onClose={() => setParcelar(null)} />}
    </>
  );
}

// ======================= Formulário =======================
function TituloForm({ tipo, atual, copia, onClose }: { tipo: "pagar" | "receber"; atual: Titulo | null; copia: Titulo | null; onClose: () => void }) {
  const base = atual ?? copia;
  const cads = useCadastrosFin();
  const clientes = useClientes();
  const orcs = useOrcamentos();
  const receber = tipo === "receber";
  const d = base?.data ?? {};
  const [f, setF] = useState({
    descricao: base?.descricao ?? "",
    categoriaId: base?.categoriaId ?? "",
    favorecido: str(d["favorecido"]),
    documentoFav: str(d["documentoFav"]),
    clienteId: base?.clienteId ?? "",
    documentoId: base?.documentoId ?? "",
    emissao: copia ? hojeISO() : str(d["emissao"]) || hojeISO(),
    vencimento: copia ? somarDias(base!.vencimento, 30) : base?.vencimento ?? hojeISO(),
    original: n(d["original"]) || base?.valor || 0,
    desconto: n(d["desconto"]), juros: n(d["juros"]), multa: n(d["multa"]), acrescimo: n(d["acrescimo"]),
    contaId: str(d["contaId"]), formaId: str(d["formaId"]), centroId: str(d["centroId"]), numeroDoc: str(d["numeroDoc"]),
    obs: str(d["obs"]), anexos: (Array.isArray(d["anexos"]) ? d["anexos"] : []) as string[],
    recorrencia: "nenhuma", repeticoes: 2, parcelas: 1,
  });
  const [salvando, setSalvando] = useState(false);
  const [duplicada, setDuplicada] = useState(false);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const ativos = (t: string) => cads.filter((c) => c.tipo === t && c.ativo);
  const final = valorFinal(f);
  const osCliente = orcs.filter((o) => o.tipo === "os" || o.status === "aprovado").filter((o) => !f.clienteId || o.clienteId === f.clienteId);

  const salvar = async () => {
    setSalvando(true);
    try {
      const data = {
        favorecido: f.favorecido, documentoFav: f.documentoFav, emissao: f.emissao, original: f.original, desconto: f.desconto,
        juros: f.juros, multa: f.multa, acrescimo: f.acrescimo, contaId: f.contaId, formaId: f.formaId, centroId: f.centroId,
        numeroDoc: f.numeroDoc, obs: f.obs, anexos: f.anexos, ...(duplicada ? { confirmarDuplicada: true } : {}),
      };
      const t: NovoTitulo = { tipo, descricao: f.descricao, vencimento: f.vencimento, valor: final, categoriaId: f.categoriaId || null,
        clienteId: receber ? f.clienteId || null : null, documentoId: receber ? f.documentoId || null : null, data };
      if (atual) {
        await editarTitulo(atual.id, t);
        toast.success("Conta atualizada.");
      } else {
        const vezes = f.recorrencia === "mensal" ? Math.min(60, Math.max(1, f.repeticoes)) : 1;
        for (let i = 0; i < vezes; i++)
          await criarTitulo({ ...t, descricao: vezes > 1 ? `${f.descricao} (${i + 1}/${vezes})` : f.descricao,
            vencimento: i ? addMeses(f.vencimento, i) : f.vencimento, data: { ...data, recorrencia: vezes > 1 ? "mensal" : "" } });
        if (receber && f.parcelas > 1 && vezes === 1) {
          const { getTitulos } = await import("@/lib/financeiro");
          const criado = [...getTitulos()].filter((x) => x.descricao === f.descricao.trim() && x.tipo === tipo).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))[0];
          if (criado) await parcelarTitulo(criado.id, f.parcelas, f.vencimento);
        }
        toast.success(vezes > 1 ? `${vezes} contas criadas.` : "Conta criada.");
      }
      onClose();
    } catch (e) {
      if ((e as Error).message === "DUPLICADA") { setDuplicada(true); toast.warning("Já existe uma conta igual (mesma descrição, vencimento e valor). Clique em salvar novamente para confirmar."); }
      else toast.error((e as Error).message);
    } finally { setSalvando(false); }
  };

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} wide title={atual ? "Editar conta" : copia ? "Duplicar conta" : receber ? "Nova conta a receber" : "Nova conta a pagar"}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Campo label="Descrição *" className="sm:col-span-2"><input className="field" value={f.descricao} onChange={(e) => set({ descricao: e.target.value })} /></Campo>
        <Opcoes label="Categoria financeira" value={f.categoriaId} onChange={(v) => set({ categoriaId: v })} itens={ativos("categoria").filter((c) => c.data["natureza"] === (receber ? "receita" : "despesa"))} />
        {receber ? <>
          <Opcoes label="Cliente" value={f.clienteId} onChange={(v) => set({ clienteId: v, documentoId: "" })} itens={clientes.filter((c) => c.ativo).map((c) => ({ id: c.id, nome: c.nome }))} />
          <Opcoes label="Orçamento / OS relacionada" value={f.documentoId} onChange={(v) => set({ documentoId: v })} itens={osCliente.map((o) => ({ id: o.id, nome: codigoDoc(o) }))} vazio="Nenhuma" />
        </> : <>
          <Campo label="Fornecedor / favorecido"><input className="field" value={f.favorecido} onChange={(e) => set({ favorecido: e.target.value })} /></Campo>
          <Campo label="CPF/CNPJ"><input className="field" value={f.documentoFav} onChange={(e) => set({ documentoFav: e.target.value })} /></Campo>
        </>}
        <Campo label="Nº do documento"><input className="field" value={f.numeroDoc} onChange={(e) => set({ numeroDoc: e.target.value })} /></Campo>
        <Campo label="Data de emissão"><input type="date" className="field" value={f.emissao} onChange={(e) => set({ emissao: e.target.value })} /></Campo>
        <Campo label="Vencimento *"><input type="date" className="field" value={f.vencimento} onChange={(e) => set({ vencimento: e.target.value })} /></Campo>
        <MoneyInput label="Valor original *" value={f.original} onChange={(v) => set({ original: v })} />
        <MoneyInput label="Desconto" value={f.desconto} onChange={(v) => set({ desconto: v })} />
        {receber ? <MoneyInput label="Acréscimo" value={f.acrescimo} onChange={(v) => set({ acrescimo: v })} /> : <>
          <MoneyInput label="Juros" value={f.juros} onChange={(v) => set({ juros: v })} />
          <MoneyInput label="Multa" value={f.multa} onChange={(v) => set({ multa: v })} />
        </>}
        <Campo label="Valor final"><div className="field flex items-center justify-end font-display text-lg font-bold">{moeda(final)}</div></Campo>
        <Opcoes label={receber ? "Conta de recebimento" : "Conta de pagamento"} value={f.contaId} onChange={(v) => set({ contaId: v })} itens={ativos("conta")} />
        <Opcoes label="Forma de pagamento" value={f.formaId} onChange={(v) => set({ formaId: v })} itens={ativos("forma")} />
        {!receber && <Opcoes label="Centro de custo" value={f.centroId} onChange={(v) => set({ centroId: v })} itens={ativos("centro")} />}
        {!atual && <>
          <Campo label="Recorrência">
            <select className="field" value={f.recorrencia} onChange={(e) => set({ recorrencia: e.target.value })}>
              <option value="nenhuma">Não se repete</option><option value="mensal">Mensal</option>
            </select>
          </Campo>
          {f.recorrencia === "mensal" && <Campo label="Quantidade de meses"><input type="number" min={2} max={60} className="field" value={f.repeticoes} onChange={(e) => set({ repeticoes: Number(e.target.value) })} /></Campo>}
          {receber && f.recorrencia === "nenhuma" && <Campo label="Número de parcelas"><input type="number" min={1} max={48} className="field" value={f.parcelas} onChange={(e) => set({ parcelas: Number(e.target.value) })} /></Campo>}
        </>}
        <Campo label="Observações" className="sm:col-span-3"><textarea className="field min-h-20" value={f.obs} onChange={(e) => set({ obs: e.target.value })} /></Campo>
        <div className="sm:col-span-3">
          <Anexos lista={f.anexos} onChange={(a) => set({ anexos: a })} />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-ghost h-11" onClick={onClose}>Cancelar</button>
        <button className="btn-primary" disabled={salvando} onClick={salvar}>{salvando ? "Salvando..." : duplicada ? "Confirmar mesmo assim" : "Salvar"}</button>
      </div>
    </Modal>
  );
}
const addMeses = (iso: string, m: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setMonth(d.getMonth() + m);
  return hojeISO(d);
};

function Anexos({ lista, onChange }: { lista: string[]; onChange: (a: string[]) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {lista.map((a, i) => <button key={a} className="btn-ghost h-9" onClick={() => abrirComprovante(a).catch((e) => toast.error(e.message))}><Paperclip className="h-4 w-4" /> Anexo {i + 1}</button>)}
      <label className="btn-ghost h-9 cursor-pointer"><Paperclip className="h-4 w-4" /> Anexar
        <input type="file" className="hidden" accept="application/pdf,image/*" onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try { onChange([...lista, await enviarComprovante(file)]); toast.success("Arquivo anexado."); } catch (err) { toast.error((err as Error).message); }
        }} />
      </label>
    </div>
  );
}

// ======================= Baixa =======================
function BaixaModal({ t, onClose }: { t: Titulo; onClose: () => void }) {
  const cads = useCadastrosFin();
  const { isAdmin } = useAcesso();
  const formas = cads.filter((c) => c.tipo === "forma");
  const saldo = saldoTitulo(t);
  const [data, setData] = useState(hojeISO());
  const [pags, setPags] = useState<Pagamento[]>(() => {
    const p = novoPagamento(formas, saldo);
    if (t.data["formaId"]) p.forma_id = String(t.data["formaId"]);
    if (t.data["contaId"]) p.conta_id = String(t.data["contaId"]);
    return [p];
  });
  const [excesso, setExcesso] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const aplicado = totalAplicado(pags);
  const receber = t.tipo === "receber";
  const passa = aplicado > saldo + 0.009;

  const confirmar = async () => {
    const erro = validarPagamentos(pags);
    if (erro) { toast.error(erro); return; }
    if (passa && !excesso) { toast.error("O valor ultrapassa o saldo da conta."); return; }
    setEnviando(true);
    try {
      const r = (await baixarTitulo(t.id, pags, data, excesso)) as { status: string };
      toast.success(r.status === "pago" ? (receber ? "Recebimento registrado. Conta quitada." : "Pagamento registrado. Conta quitada.") : "Pagamento parcial registrado.");
      onClose();
    } catch (e) { toast.error((e as Error).message); } finally { setEnviando(false); }
  };

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} wide title={receber ? "Registrar recebimento" : "Registrar pagamento"} description={`${t.descricao} · Saldo ${moeda(saldo)}`}>
      <div className="space-y-4">
        <Campo label={receber ? "Data do recebimento" : "Data do pagamento"} className="max-w-xs"><input type="date" className="field" value={data} onChange={(e) => setData(e.target.value)} /></Campo>
        <PagamentosForm tipo={t.tipo} value={pags} onChange={setPags} dataISO={data} />
        <div className="rounded-md border border-border p-3 text-sm">
          <div className="flex justify-between"><span>Saldo da conta</span><b>{moeda(saldo)}</b></div>
          <div className="flex justify-between"><span>Total abatido</span><b>{moeda(aplicado)}</b></div>
          <div className="flex justify-between"><span>Restará</span><b className={passa ? "text-destructive" : ""}>{moeda(Math.max(0, saldo - aplicado))}</b></div>
          {aplicado < saldo - 0.009 && aplicado > 0 && <p className="mt-1 text-xs text-amber-400">Será registrado como pagamento parcial.</p>}
          {passa && (isAdmin
            ? <label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={excesso} onChange={(e) => setExcesso(e.target.checked)} /> Confirmo, como administrador, o valor acima do saldo.</label>
            : <p className="mt-1 text-xs text-destructive">Valor acima do saldo. Somente um administrador pode confirmar.</p>)}
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn-ghost h-11" onClick={onClose}>Voltar</button>
          <button className="btn-primary" disabled={enviando} onClick={confirmar}>{enviando ? "Registrando..." : "Confirmar"}</button>
        </div>
      </div>
    </Modal>
  );
}

// ======================= Detalhe / histórico =======================
export function DetalheTitulo({ t, onClose }: { t: Titulo; onClose: () => void }) {
  const movs = useMovimentos().filter((m) => m.tituloId === t.id);
  const hist = useHistoricoFin().filter((h) => h.tituloId === t.id);
  const cads = useCadastrosFin();
  const { pode } = useAcesso();
  const nome = (id: string | null) => cads.find((c) => c.id === id)?.nome ?? "—";
  const [estornar, setEstornar] = useState<string | null>(null);
  useEffect(() => { void garantirHistoricoFin().catch(() => undefined); }, []);
  const anexos = (Array.isArray(t.data["anexos"]) ? t.data["anexos"] : []) as string[];

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} wide title={t.descricao} description={`Vencimento ${dataBr(t.vencimento)} · Valor ${moeda(t.valor)} · ${t.tipo === "receber" ? "Recebido" : "Pago"} ${moeda(t.pago)}`}>
      <div className="space-y-5">
        <div className="grid gap-2 text-sm sm:grid-cols-3">
          {t.data["numeroDoc"] ? <div><span className="text-muted-foreground">Documento: </span>{str(t.data["numeroDoc"])}</div> : null}
          {t.data["centroId"] ? <div><span className="text-muted-foreground">Centro de custo: </span>{nome(str(t.data["centroId"]))}</div> : null}
          {t.data["obs"] ? <div className="sm:col-span-3"><span className="text-muted-foreground">Obs.: </span>{str(t.data["obs"])}</div> : null}
          {t.data["motivoCancelamento"] ? <div className="sm:col-span-3 text-destructive">Cancelada: {str(t.data["motivoCancelamento"])}</div> : null}
        </div>
        {anexos.length > 0 && <div className="flex flex-wrap gap-2">{anexos.map((a, i) => <button key={a} className="btn-ghost h-9" onClick={() => abrirComprovante(a).catch((e) => toast.error(e.message))}><Paperclip className="h-4 w-4" /> Anexo {i + 1}</button>)}</div>}
        <div>
          <h3 className="mb-2 font-display text-lg font-bold uppercase">Movimentações</h3>
          {movs.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p> : (
            <ul className="space-y-2 text-sm">
              {movs.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2.5">
                  <div>
                    <div className="font-medium">{m.tipo === "estorno" ? "Estorno" : nome(m.formaId)} · <Valor v={m.valor} sinal /></div>
                    <div className="text-xs text-muted-foreground">{dataBr(m.dataMov)} · {nome(m.contaId)} · {m.usuarioNome}
                      {n(m.data["taxa"]) > 0 && ` · taxa ${moeda(n(m.data["taxa"]))}`}{m.data["obs"] ? ` · ${str(m.data["obs"])}` : ""}</div>
                  </div>
                  <div className="flex gap-1">
                    {m.data["comprovante"] ? <button className="btn-ghost h-8 px-2" onClick={() => abrirComprovante(str(m.data["comprovante"])).catch((e) => toast.error(e.message))}><Paperclip className="h-4 w-4" /></button> : null}
                    {m.estornado && <span className="text-xs text-muted-foreground">Estornado</span>}
                    {!m.estornado && m.tipo !== "estorno" && pode("financeiro", "estornar") && <button className="btn-ghost h-8 px-2 text-xs" onClick={() => setEstornar(m.id)}><Undo2 className="h-4 w-4" /> Estornar</button>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="mb-2 font-display text-lg font-bold uppercase">Histórico</h3>
          <ol className="space-y-2 border-l border-border pl-4 text-sm">
            {[...hist].sort((a, b) => b.data.localeCompare(a.data)).map((h) => (
              <li key={h.id}>
                <div className="font-medium">{h.tipo}{h.valor != null && ` · ${moeda(h.valor)}`}</div>
                <div className="text-xs text-muted-foreground">{dataHora(h.data)} · {h.usuarioNome || "—"}{h.statusAnterior && h.statusNovo && h.statusAnterior !== h.statusNovo ? ` · ${h.statusAnterior} → ${h.statusNovo}` : ""}</div>
                {h.observacao && <div className="text-xs">{h.observacao}</div>}
              </li>
            ))}
          </ol>
        </div>
      </div>
      {estornar && <MotivoModal titulo="Estornar movimentação" texto="Será criado um lançamento contrário. O registro original é mantido." acao="Estornar"
        onClose={() => setEstornar(null)} onConfirm={async (m) => { await estornarMovimento(estornar, m); toast.success("Estorno registrado."); }} />}
    </Modal>
  );
}

export function MotivoModal({ titulo, texto, acao, onClose, onConfirm }: { titulo: string; texto: string; acao: string; onClose: () => void; onConfirm: (motivo: string) => Promise<void> }) {
  const [m, setM] = useState("");
  const [enviando, setEnviando] = useState(false);
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={titulo} description={texto}>
      <Campo label="Justificativa *"><textarea className="field min-h-20" value={m} onChange={(e) => setM(e.target.value)} /></Campo>
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-ghost h-11" onClick={onClose}>Voltar</button>
        <button className="btn-primary" disabled={enviando || m.trim().length < 3} onClick={async () => {
          setEnviando(true);
          try { await onConfirm(m.trim()); onClose(); } catch (e) { toast.error((e as Error).message); } finally { setEnviando(false); }
        }}>{acao}</button>
      </div>
    </Modal>
  );
}

function ParcelarModal({ t, onClose }: { t: Titulo; onClose: () => void }) {
  const [qtd, setQtd] = useState(2);
  const [primeiro, setPrimeiro] = useState(t.vencimento);
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title="Dividir em parcelas" description={`${t.descricao} · ${moeda(t.valor)}. A conta original fica cancelada e o histórico é mantido.`}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo label="Parcelas"><input type="number" min={2} max={48} className="field" value={qtd} onChange={(e) => setQtd(Number(e.target.value))} /></Campo>
        <Campo label="1º vencimento"><input type="date" className="field" value={primeiro} onChange={(e) => setPrimeiro(e.target.value)} /></Campo>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{qtd} × aprox. {moeda(r2(t.valor / Math.max(1, qtd)))} (mensal)</p>
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-ghost h-11" onClick={onClose}>Voltar</button>
        <button className="btn-primary" onClick={async () => {
          try { await parcelarTitulo(t.id, qtd, primeiro); toast.success("Conta parcelada."); onClose(); } catch (e) { toast.error((e as Error).message); }
        }}>Parcelar</button>
      </div>
    </Modal>
  );
}
