import type { ReactNode } from "react";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { STATUS_RECEBER, STATUS_TITULO, hojeISO, somarDias, type SituacaoTitulo } from "@/lib/financeiro";
import { moeda } from "@/lib/store";

export const dataBr = (d?: string | null) => (d ? d.slice(0, 10).split("-").reverse().join("/") : "—");
export const dataHora = (iso: string) => new Date(iso).toLocaleString("pt-BR");

export function Campo({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-sm font-medium text-metal">{label}</span>
      {children}
    </label>
  );
}

export function Opcoes({ label, value, onChange, itens, vazio = "Selecione", className = "" }: {
  label: string; value: string; onChange: (v: string) => void; itens: { id: string; nome: string }[]; vazio?: string; className?: string;
}) {
  return (
    <Campo label={label} className={className}>
      <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{vazio}</option>
        {itens.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
      </select>
    </Campo>
  );
}

const COR: Record<SituacaoTitulo, string> = {
  aberto: "border-border text-foreground",
  parcial: "border-primary/50 text-primary",
  pago: "border-emerald-500/50 text-emerald-400",
  cancelado: "border-border text-muted-foreground line-through",
  vencida: "border-destructive bg-destructive/15 text-destructive",
  vencendo: "border-amber-500/60 text-amber-400",
};
export function SituacaoBadge({ s, receber }: { s: SituacaoTitulo; receber?: boolean }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${COR[s]}`}>{(receber ? STATUS_RECEBER : STATUS_TITULO)[s]}</span>;
}

export function Vazio({ children }: { children: ReactNode }) {
  return <div className="panel p-10 text-center text-sm text-muted-foreground">{children}</div>;
}

export function Valor({ v, sinal }: { v: number; sinal?: boolean }) {
  const cls = sinal ? (v < 0 ? "text-destructive" : v > 0 ? "text-emerald-400" : "") : "";
  return <span className={`tabular-nums ${cls}`}>{moeda(v)}</span>;
}

// ---------- Período ----------
export type Periodo = "hoje" | "semana" | "mes" | "mes_anterior" | "ano" | "personalizado" | "tudo";
export const PERIODOS: [Periodo, string][] = [
  ["hoje", "Hoje"], ["semana", "Semana"], ["mes", "Mês atual"], ["mes_anterior", "Mês anterior"], ["ano", "Ano"], ["personalizado", "Personalizado"], ["tudo", "Todo o período"],
];
export function intervalo(p: Periodo, de = "", ate = "", hoje = hojeISO()): [string, string] {
  const [y, m] = hoje.split("-").map(Number) as [number, number];
  const pad = (n: number) => String(n).padStart(2, "0");
  const fimMes = (yy: number, mm: number) => `${yy}-${pad(mm)}-${pad(new Date(yy, mm, 0).getDate())}`;
  switch (p) {
    case "hoje": return [hoje, hoje];
    case "semana": {
      const dow = new Date(`${hoje}T12:00:00`).getDay();
      const ini = somarDias(hoje, -dow);
      return [ini, somarDias(ini, 6)];
    }
    case "mes": return [`${y}-${pad(m)}-01`, fimMes(y, m)];
    case "mes_anterior": {
      const yy = m === 1 ? y - 1 : y;
      const mm = m === 1 ? 12 : m - 1;
      return [`${yy}-${pad(mm)}-01`, fimMes(yy, mm)];
    }
    case "ano": return [`${y}-01-01`, `${y}-12-31`];
    case "personalizado": return [de || "0000-01-01", ate || "9999-12-31"];
    default: return ["0000-01-01", "9999-12-31"];
  }
}
export function FiltroPeriodo({ p, setP, de, setDe, ate, setAte }: {
  p: Periodo; setP: (p: Periodo) => void; de: string; setDe: (v: string) => void; ate: string; setAte: (v: string) => void;
}) {
  return (
    <>
      <Campo label="Período">
        <select className="field" value={p} onChange={(e) => setP(e.target.value as Periodo)}>
          {PERIODOS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </Campo>
      {p === "personalizado" && <>
        <Campo label="De"><input type="date" className="field" value={de} onChange={(e) => setDe(e.target.value)} /></Campo>
        <Campo label="Até"><input type="date" className="field" value={ate} onChange={(e) => setAte(e.target.value)} /></Campo>
      </>}
    </>
  );
}

// ---------- Exportação ----------
export function exportarPlanilha(nome: string, cab: string[], linhas: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = typeof v === "number" ? v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(v ?? "");
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = "\uFEFF" + [cab, ...linhas].map((l) => l.map(esc).join(";")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nome}-${hojeISO()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
export function BotoesExportar({ onPlanilha }: { onPlanilha: () => void }) {
  return (
    <div className="flex gap-2 print:hidden">
      <button className="btn-ghost h-10" onClick={onPlanilha}><FileSpreadsheet className="h-4 w-4" /> Planilha</button>
      <button className="btn-ghost h-10" onClick={() => window.print()}><FileDown className="h-4 w-4" /> PDF</button>
    </div>
  );
}
