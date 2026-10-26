import { useMemo, useState } from "react";
import { ArrowLeftRight, Landmark, Pencil, Plus, Power, Scale, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/Modal";
import { MoneyInput } from "@/components/MoneyInput";
import { PageHeader } from "@/components/PageHeader";
import { useAcesso } from "@/lib/acesso";
import {
  TIPO_CONTA, ajustarSaldo, estornarMovimento, hojeISO, salvarCadastro, saldoConta, transferir, useCadastrosFin, useMovimentos,
  type Cadastro, type Movimento,
} from "@/lib/financeiro";
import { moeda } from "@/lib/store";
import { CONTA_CAMPOS, CadastroForm } from "./Cadastros";
import { MotivoModal } from "./Titulos";
import { BotoesExportar, Campo, FiltroPeriodo, Opcoes, Valor, Vazio, dataBr, exportarPlanilha, intervalo, type Periodo } from "./ui";

export const TIPO_MOV: Record<Movimento["tipo"], string> = {
  pagamento: "Pagamento", recebimento: "Recebimento", transferencia: "Transferência", ajuste: "Ajuste de saldo", estorno: "Estorno",
};

const mascarar = (s: unknown) => {
  const v = String(s ?? "");
  return v.length > 4 ? `•••${v.slice(-4)}` : v;
};

export function ContasBancarias() {
  const cads = useCadastrosFin();
  const movs = useMovimentos();
  const { pode } = useAcesso();
  const contas = cads.filter((c) => c.tipo === "conta").sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome));
  const [edit, setEdit] = useState<Cadastro | "novo" | null>(null);
  const [extrato, setExtrato] = useState<Cadastro | null>(null);
  const [transf, setTransf] = useState(false);
  const [ajuste, setAjuste] = useState<Cadastro | null>(null);
  const total = contas.filter((c) => c.ativo).reduce((s, c) => s + saldoConta(c, movs), 0);

  return (
    <>
      <PageHeader title="Contas bancárias" subtitle={`Saldo total ${moeda(total)}`} action={<div className="flex gap-2">
        {pode("financeiro", "editar") && contas.filter((c) => c.ativo).length > 1 && <button className="btn-ghost h-11" onClick={() => setTransf(true)}><ArrowLeftRight className="h-4 w-4" /> Transferência</button>}
        {pode("financeiro", "config") && <button className="btn-primary" onClick={() => setEdit("novo")}><Plus className="h-4 w-4" /> Nova conta</button>}
      </div>} />
      {contas.length === 0 ? <Vazio>Nenhuma conta cadastrada.</Vazio> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {contas.map((c) => {
            const m = movs.filter((x) => x.contaId === c.id);
            const ent = m.filter((x) => x.valor > 0).reduce((s, x) => s + x.valor, 0);
            const sai = m.filter((x) => x.valor < 0).reduce((s, x) => s + x.valor, 0);
            return (
              <div key={c.id} className={`panel p-5 ${c.ativo ? "" : "opacity-60"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 font-display text-xl font-bold uppercase"><Landmark className="h-5 w-5 text-primary" /> {c.nome}</div>
                    <div className="text-xs text-muted-foreground">{TIPO_CONTA[String(c.data["tipoConta"])] ?? "Conta"}{c.data["banco"] ? ` · ${String(c.data["banco"])}` : ""}
                      {c.data["agencia"] ? ` · Ag ${String(c.data["agencia"])}` : ""}{c.data["numero"] ? ` · Cc ${mascarar(c.data["numero"])}` : ""}{!c.ativo && " · Inativa"}</div>
                  </div>
                </div>
                <div className="mt-4 font-display text-3xl font-bold"><Valor v={saldoConta(c, movs)} /></div>
                <div className="mt-1 flex gap-4 text-xs text-muted-foreground"><span>Entradas <b className="text-emerald-400">{moeda(ent)}</b></span><span>Saídas <b className="text-destructive">{moeda(sai)}</b></span></div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="btn-ghost h-9" onClick={() => setExtrato(c)}>Extrato</button>
                  {pode("financeiro", "config") && <>
                    <button className="btn-ghost h-9 px-2.5" title="Editar" onClick={() => setEdit({ ...c, data: { ...c.data, __temMov: m.length > 0 } })}><Pencil className="h-4 w-4" /></button>
                    <button className="btn-ghost h-9 px-2.5" title="Ajustar saldo" onClick={() => setAjuste(c)}><Scale className="h-4 w-4" /></button>
                    <button className="btn-ghost h-9 px-2.5" title={c.ativo ? "Inativar" : "Ativar"} onClick={async () => {
                      try { await salvarCadastro({ ...c, ativo: !c.ativo }); toast.success(c.ativo ? "Conta inativada." : "Conta ativada."); } catch (e) { toast.error((e as Error).message); }
                    }}><Power className="h-4 w-4" /></button>
                  </>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">Contas não são excluídas; inative as que não usa mais. O saldo é calculado automaticamente pelas movimentações registradas.</p>
      {edit && <CadastroForm tipo="conta" atual={edit === "novo" ? null : edit} campos={CONTA_CAMPOS} singular="conta bancária" onClose={() => setEdit(null)} />}
      {extrato && <Extrato conta={extrato} onClose={() => setExtrato(null)} />}
      {transf && <TransferenciaModal contas={contas.filter((c) => c.ativo)} onClose={() => setTransf(false)} />}
      {ajuste && <AjusteModal conta={ajuste} onClose={() => setAjuste(null)} />}
    </>
  );
}

function Extrato({ conta, onClose }: { conta: Cadastro; onClose: () => void }) {
  const movs = useMovimentos();
  const cads = useCadastrosFin();
  const { pode } = useAcesso();
  const [p, setP] = useState<Periodo>("mes");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [estornar, setEstornar] = useState<string | null>(null);
  const [ini, fim] = intervalo(p, de, ate);
  const lista = useMemo(() => movs.filter((m) => m.contaId === conta.id && m.dataMov >= ini && m.dataMov <= fim)
    .sort((a, b) => a.dataMov.localeCompare(b.dataMov) || a.criadoEm.localeCompare(b.criadoEm)), [movs, conta.id, ini, fim]);
  const dia = (iso: string) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() - 1); return hojeISO(d); };
  let saldo = ini === "0000-01-01" ? Number(conta.data["saldoInicial"] || 0) : saldoConta(conta, movs, dia(ini));
  const anterior = saldo;
  const nome = (id: string | null) => cads.find((c) => c.id === id)?.nome ?? "";
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} wide title={`Extrato · ${conta.nome}`}>
      <div className="mb-3 grid gap-3 sm:grid-cols-3"><FiltroPeriodo p={p} setP={setP} de={de} setDe={setDe} ate={ate} setAte={setAte} /></div>
      <div className="mb-2 text-sm text-muted-foreground">Saldo anterior: <b className="text-foreground">{moeda(anterior)}</b></div>
      {lista.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma movimentação no período.</p> : (
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-left text-xs uppercase text-muted-foreground"><th className="p-2">Data</th><th className="p-2">Descrição</th><th className="p-2 text-right">Valor</th><th className="p-2 text-right">Saldo</th><th /></tr></thead>
          <tbody>
            {lista.map((m) => {
              saldo += m.valor;
              return (
                <tr key={m.id} className="border-b border-border/50">
                  <td className="p-2">{dataBr(m.dataMov)}</td>
                  <td className="p-2">{TIPO_MOV[m.tipo]}{m.formaId ? ` · ${nome(m.formaId)}` : ""}{m.data["obs"] ? ` · ${String(m.data["obs"])}` : ""}
                    <div className="text-xs text-muted-foreground">{m.usuarioNome}{m.estornado ? " · estornado" : ""}</div></td>
                  <td className="p-2 text-right"><Valor v={m.valor} sinal /></td>
                  <td className="p-2 text-right">{moeda(saldo)}</td>
                  <td className="p-2 text-right">{!m.estornado && m.tipo !== "estorno" && pode("financeiro", "estornar") && <button className="btn-ghost h-8 px-2" title="Estornar" onClick={() => setEstornar(m.id)}><Undo2 className="h-4 w-4" /></button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <div className="mt-2 text-right text-sm">Saldo final: <b>{moeda(saldo)}</b></div>
      {estornar && <MotivoModal titulo="Estornar movimentação" texto="Será criado um lançamento contrário." acao="Estornar" onClose={() => setEstornar(null)}
        onConfirm={async (mot) => { await estornarMovimento(estornar, mot); toast.success("Estorno registrado."); }} />}
    </Modal>
  );
}

function TransferenciaModal({ contas, onClose }: { contas: Cadastro[]; onClose: () => void }) {
  const [de, setDe] = useState(contas[0]?.id ?? "");
  const [para, setPara] = useState(contas[1]?.id ?? "");
  const [valor, setValor] = useState(0);
  const [data, setData] = useState(hojeISO());
  const [obs, setObs] = useState("");
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title="Transferência entre contas">
      <div className="grid gap-3 sm:grid-cols-2">
        <Opcoes label="Origem" value={de} onChange={setDe} itens={contas} />
        <Opcoes label="Destino" value={para} onChange={setPara} itens={contas} />
        <MoneyInput label="Valor" value={valor} onChange={setValor} />
        <Campo label="Data"><input type="date" className="field" value={data} onChange={(e) => setData(e.target.value)} /></Campo>
        <Campo label="Observação" className="sm:col-span-2"><input className="field" value={obs} onChange={(e) => setObs(e.target.value)} /></Campo>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-ghost h-11" onClick={onClose}>Cancelar</button>
        <button className="btn-primary" onClick={async () => {
          try { await transferir(de, para, valor, data, obs); toast.success("Transferência registrada."); onClose(); } catch (e) { toast.error((e as Error).message); }
        }}>Transferir</button>
      </div>
    </Modal>
  );
}

function AjusteModal({ conta, onClose }: { conta: Cadastro; onClose: () => void }) {
  const [valor, setValor] = useState(0);
  const [sinal, setSinal] = useState<1 | -1>(1);
  const [data, setData] = useState(hojeISO());
  const [motivo, setMotivo] = useState("");
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={`Ajustar saldo · ${conta.nome}`} description="O ajuste fica registrado no histórico com a justificativa.">
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo label="Tipo"><select className="field" value={sinal} onChange={(e) => setSinal(Number(e.target.value) as 1 | -1)}><option value={1}>Entrada (+)</option><option value={-1}>Saída (−)</option></select></Campo>
        <MoneyInput label="Valor" value={valor} onChange={setValor} />
        <Campo label="Data"><input type="date" className="field" value={data} onChange={(e) => setData(e.target.value)} /></Campo>
        <Campo label="Justificativa *" className="sm:col-span-2"><textarea className="field min-h-16" value={motivo} onChange={(e) => setMotivo(e.target.value)} /></Campo>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-ghost h-11" onClick={onClose}>Cancelar</button>
        <button className="btn-primary" onClick={async () => {
          try { await ajustarSaldo(conta.id, sinal * valor, data, motivo); toast.success("Ajuste registrado."); onClose(); } catch (e) { toast.error((e as Error).message); }
        }}>Registrar ajuste</button>
      </div>
    </Modal>
  );
}

export function FluxoCaixa() {
  const movs = useMovimentos();
  const cads = useCadastrosFin();
  const { pode } = useAcesso();
  const [p, setP] = useState<Periodo>("mes");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [conta, setConta] = useState("");
  const [forma, setForma] = useState("");
  const [ini, fim] = intervalo(p, de, ate);
  const nome = (id: string | null) => cads.find((c) => c.id === id)?.nome ?? "—";
  const lista = movs.filter((m) => m.dataMov >= ini && m.dataMov <= fim && (!conta || m.contaId === conta) && (!forma || m.formaId === forma))
    .sort((a, b) => b.dataMov.localeCompare(a.dataMov) || b.criadoEm.localeCompare(a.criadoEm));
  const ent = lista.filter((m) => m.valor > 0).reduce((s, m) => s + m.valor, 0);
  const sai = lista.filter((m) => m.valor < 0).reduce((s, m) => s + m.valor, 0);
  return (
    <>
      <PageHeader title="Fluxo de caixa" subtitle={`Entradas ${moeda(ent)} · Saídas ${moeda(-sai)} · Resultado ${moeda(ent + sai)}`}
        action={pode("financeiro", "exportar") && <BotoesExportar onPlanilha={() => exportarPlanilha("fluxo-de-caixa", ["Data", "Tipo", "Conta", "Forma", "Valor", "Usuário", "Observação"],
          lista.map((m) => [dataBr(m.dataMov), TIPO_MOV[m.tipo], nome(m.contaId), m.formaId ? nome(m.formaId) : "", m.valor, m.usuarioNome, String(m.data["obs"] ?? "")]))} />} />
      <div className="panel mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5 print:hidden">
        <FiltroPeriodo p={p} setP={setP} de={de} setDe={setDe} ate={ate} setAte={setAte} />
        <Opcoes label="Conta" value={conta} onChange={setConta} itens={cads.filter((c) => c.tipo === "conta")} vazio="Todas" />
        <Opcoes label="Forma" value={forma} onChange={setForma} itens={cads.filter((c) => c.tipo === "forma")} vazio="Todas" />
      </div>
      {lista.length === 0 ? <Vazio>Nenhuma movimentação no período.</Vazio> : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground"><th className="p-3">Data</th><th className="p-3">Tipo</th><th className="p-3">Conta</th><th className="p-3">Forma</th><th className="p-3">Responsável</th><th className="p-3 text-right">Valor</th></tr></thead>
            <tbody>{lista.map((m) => (
              <tr key={m.id} className="border-b border-border/60 last:border-0">
                <td className="p-3">{dataBr(m.dataMov)}</td>
                <td className="p-3">{TIPO_MOV[m.tipo]}{m.estornado && <span className="ml-1 text-xs text-muted-foreground">(estornado)</span>}{m.data["obs"] ? <div className="text-xs text-muted-foreground">{String(m.data["obs"])}</div> : null}</td>
                <td className="p-3">{nome(m.contaId)}</td><td className="p-3">{m.formaId ? nome(m.formaId) : "—"}</td><td className="p-3 text-muted-foreground">{m.usuarioNome}</td>
                <td className="p-3 text-right font-semibold"><Valor v={m.valor} sinal /></td>
              </tr>))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}
