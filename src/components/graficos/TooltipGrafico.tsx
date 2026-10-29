import { moeda } from "@/lib/store";

export type ItemTooltip = { name?: unknown; value?: unknown; color?: string; payload?: Record<string, unknown> };

type Props = {
  active?: boolean;
  payload?: readonly ItemTooltip[];
  label?: unknown;
  periodo?: string;
  monetario?: boolean;
  total?: number;
};

export function numeroGrafico(valor: unknown): number | null {
  if (typeof valor !== "number" && typeof valor !== "string") return null;
  if (typeof valor === "string" && !valor.trim()) return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

export function valorGrafico(valor: unknown, monetario = false): string {
  const numero = numeroGrafico(valor);
  return numero === null ? "—" : monetario ? moeda(numero) : numero.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

export function temValoresGrafico(dados: readonly Record<string, unknown>[], chaves: readonly string[]): boolean {
  return dados.some((dado) => chaves.some((chave) => {
    const numero = numeroGrafico(dado[chave]);
    return numero !== null && numero !== 0;
  }));
}

export function mesGrafico(ym: string): string {
  const [ano, mes] = ym.split("-");
  return ano && mes ? `${mes}/${ano}` : "Período não informado";
}

export function periodoGrafico(inicio: string, fim: string): string {
  const data = (iso: string) => iso.split("-").reverse().join("/");
  if (inicio === "0000-01-01" && fim === "9999-12-31") return "Todo o período";
  if (inicio === "0000-01-01") return `Até ${data(fim)}`;
  if (fim === "9999-12-31") return `Desde ${data(inicio)}`;
  return `${data(inicio)} a ${data(fim)}`;
}

function texto(valor: unknown): string {
  return typeof valor === "string" || typeof valor === "number" ? String(valor) : "";
}

export function TooltipGrafico({ active, payload, label, periodo, monetario = false, total }: Props) {
  if (!active || !payload?.length) return null;
  const dado = payload[0]?.payload;
  const categoria = texto(dado?.nomeCompleto) || texto(dado?.nome) || texto(dado?.periodo) || texto(label) || "Valores";
  const intervalo = texto(dado?.periodo) || periodo;
  return (
    <div role="status" aria-live="polite" className="max-w-[min(16rem,75vw)] break-words rounded-md border border-border bg-popover p-3 text-xs text-popover-foreground shadow-lg">
      <p className="font-semibold">{categoria}</p>
      {intervalo && intervalo !== categoria && <p className="mt-1 text-muted-foreground">{intervalo}</p>}
      <ul className="mt-2 space-y-1">
        {payload.map((item, index) => {
          const numero = numeroGrafico(item.value);
          const percentual = numero !== null && total !== undefined && Number.isFinite(total) && total > 0
            ? (numero / total * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : null;
          return <li key={index} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="flex items-center gap-1.5">
              {item.color && <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} />}
              {texto(item.name) || "Valor"}
            </span>
            <span className="font-semibold tabular-nums">{valorGrafico(item.value, monetario)}{percentual !== null && ` (${percentual}%)`}</span>
          </li>;
        })}
      </ul>
    </div>
  );
}

// O conteúdo não intercepta o mouse/toque e permanece dentro da área do gráfico.
export const tooltipGraficoProps = {
  wrapperStyle: { zIndex: 30, pointerEvents: "none" as const },
  allowEscapeViewBox: { x: false, y: false },
  isAnimationActive: false,
  cursor: { fill: "var(--muted)", fillOpacity: 0.35 },
};
