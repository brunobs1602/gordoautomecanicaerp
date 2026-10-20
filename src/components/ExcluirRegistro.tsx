import { Fragment, useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { podeAtual } from "@/lib/acesso";
import { excluirDefinitivo, MODULO_EXCLUSAO, verificarExclusao, type TipoExclusao } from "@/lib/exclusao";

const ROTULO: Record<TipoExclusao, string> = { cliente: "cliente", veiculo: "veículo", produto: "produto", orcamento: "orçamento" };

export function ExcluirRegistro({ tipo, id, nome, confirmacao, detalhes, compacto, aoExcluir }: {
  tipo: TipoExclusao; id: string; nome: string;
  /** Texto que o administrador precisa digitar (nome ou código). */
  confirmacao: string;
  detalhes: [string, string][];
  compacto?: boolean;
  aoExcluir?: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [etapa, setEtapa] = useState<"verificando" | "bloqueado" | "confirmar">("verificando");
  const [motivos, setMotivos] = useState<string[]>([]);
  const [digitado, setDigitado] = useState("");
  const [motivo, setMotivo] = useState("");
  const [processando, setProcessando] = useState(false);
  if (!podeAtual(MODULO_EXCLUSAO[tipo], "excluir")) return null;

  async function abrir() {
    setAberto(true); setEtapa("verificando"); setDigitado(""); setMotivo(""); setMotivos([]);
    try {
      const r = await verificarExclusao(tipo, id);
      setMotivos(r.motivos); setEtapa(r.ok ? "confirmar" : "bloqueado");
    } catch (e) { toast.error((e as Error).message); setAberto(false); }
  }

  async function confirmar() {
    if (processando) return;
    setProcessando(true);
    try {
      const r = await excluirDefinitivo(tipo, id, motivo.trim());
      if (!r.ok) { setMotivos(r.motivos); setEtapa("bloqueado"); return; }
      toast.success(`${ROTULO[tipo][0].toUpperCase() + ROTULO[tipo].slice(1)} "${nome}" excluído definitivamente.`);
      setAberto(false); aoExcluir?.();
    } catch (e) { toast.error((e as Error).message); }
    finally { setProcessando(false); }
  }

  const ok = digitado.trim().toLowerCase() === confirmacao.trim().toLowerCase();
  return (
    <>
      <button type="button" onClick={abrir} title="Excluir definitivamente"
        className={compacto ? "btn-ghost px-2.5 hover:text-destructive" : "btn-ghost h-11 hover:text-destructive"}>
        <Trash2 className="h-4 w-4" />{!compacto && " Excluir"}
      </button>
      <Dialog open={aberto} onOpenChange={(v) => !processando && setAberto(v)}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl uppercase">Excluir {ROTULO[tipo]}</DialogTitle>
            <DialogDescription>{nome}</DialogDescription>
          </DialogHeader>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-md border border-border p-3 text-sm">
            {detalhes.map(([k, v]) => (<Fragment key={k}><dt className="text-muted-foreground">{k}</dt><dd className="whitespace-pre-line">{v || "—"}</dd></Fragment>))}
          </dl>
          {etapa === "verificando" && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Verificando registros vinculados…</p>}
          {etapa === "bloqueado" && (
            <div className="space-y-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
              <p className="flex items-center gap-2 font-medium text-destructive"><AlertTriangle className="h-4 w-4" /> Exclusão não permitida</p>
              <ul className="list-disc space-y-1 pl-5">{motivos.map((m) => <li key={m}>{m}</li>)}</ul>
              <div className="flex justify-end pt-1"><button className="btn-ghost h-10" onClick={() => setAberto(false)}>Entendi</button></div>
            </div>
          )}
          {etapa === "confirmar" && (
            <div className="space-y-3 text-sm">
              <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
                Esta exclusão é <strong>definitiva</strong> e não pode ser desfeita. Os registros relacionados não serão apagados.
              </p>
              <label className="block space-y-1"><span className="text-muted-foreground">Motivo (opcional)</span>
                <input className="field" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={200} /></label>
              <label className="block space-y-1"><span className="text-muted-foreground">Para confirmar, digite <strong className="text-foreground">{confirmacao}</strong></span>
                <input className="field" value={digitado} onChange={(e) => setDigitado(e.target.value)} autoFocus /></label>
              <div className="flex justify-end gap-2">
                <button className="btn-ghost h-10" disabled={processando} onClick={() => setAberto(false)}>Cancelar</button>
                <button className="btn-primary h-10" disabled={!ok || processando} onClick={confirmar}>
                  {processando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Excluir definitivamente
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
