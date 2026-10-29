import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { TooltipGrafico, valorGrafico } from "./TooltipGrafico";

const CORES = ["var(--primary)", "#9ca3af", "#e5e7eb", "#7f1d1d", "#f87171", "#6b7280", "#d4d4d8", "#b91c1c"];
type Fatia = { nome: string; valor: number };

export function PizzaRecebimentos({ dados, periodo }: { dados: Fatia[]; periodo: string }) {
  const [sobre, setSobre] = useState<number | null>(null);
  const [fixada, setFixada] = useState<number | null>(null);
  const indice = sobre ?? fixada;
  const fatia = indice === null ? undefined : dados[indice];
  const total = dados.reduce((soma, item) => soma + item.valor, 0);
  const selecionar = (index: number) => setFixada((anterior) => anterior === index ? null : index);

  return <div className="relative h-full min-w-0" onMouseLeave={() => setSobre(null)}>
    <div className="h-40" aria-label="Recebimentos por forma de pagamento">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={dados} dataKey="valor" nameKey="nome" outerRadius={70} isAnimationActive={false}
            onMouseEnter={(_, index) => setSobre(index)} onMouseLeave={() => setSobre(null)}
            onClick={(_, index) => { setSobre(null); selecionar(index); }}>
            {dados.map((item, index) => <Cell key={item.nome} fill={CORES[index % CORES.length]}
              stroke="var(--card)" strokeWidth={2} cursor="pointer" />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
    {fatia && <div className="pointer-events-none absolute left-1/2 top-0 z-30 -translate-x-1/2">
      <TooltipGrafico active monetario periodo={periodo} total={total}
        payload={[{ name: "Recebido", value: fatia.valor, color: CORES[indice! % CORES.length], payload: fatia }]} />
    </div>}
    <ul aria-label="Consultar valores por forma de pagamento" className="max-h-24 space-y-1 overflow-y-auto text-xs">
      {dados.map((item, index) => <li key={item.nome}>
        <button type="button" aria-pressed={fixada === index} onClick={() => selecionar(index)}
          className="flex min-h-8 w-full items-center gap-2 rounded px-2 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
          onMouseEnter={() => setSobre(index)} onMouseLeave={() => setSobre(null)}
          onFocus={() => setSobre(index)} onBlur={() => setSobre(null)}>
          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: CORES[index % CORES.length] }} />
          <span className="min-w-0 flex-1 break-words">{item.nome}</span>
          <span className="shrink-0 tabular-nums">{valorGrafico(item.valor, true)}</span>
        </button>
      </li>)}
    </ul>
  </div>;
}
