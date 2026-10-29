import { useState } from "react";
import type { ItemTooltip } from "./TooltipGrafico";

type Selecao = { active: true; payload: ItemTooltip[]; label: unknown };
type EstadoGrafico = { activePayload?: ItemTooltip[]; activeLabel?: unknown };

// Recharts calcula a categoria sob o ponteiro. O clique também é emitido ao
// tocar na tela e fixa a consulta mesmo depois de retirar o dedo.
export function useInteracaoGrafico() {
  const [selecao, setSelecao] = useState<Selecao | null>(null);
  const consultar = (estado: EstadoGrafico | null) => {
    setSelecao(estado?.activePayload?.length
      ? { active: true, payload: estado.activePayload, label: estado.activeLabel }
      : null);
  };
  return {
    selecao,
    eventos: {
      onClick: consultar,
      // Recharts 2 encaminha touchstart/touchend aos callbacks de mouse.
      onMouseDown: consultar,
      onMouseUp: consultar,
      onMouseMove: () => setSelecao(null),
    },
    tooltip: {
      active: selecao ? true : undefined,
      position: selecao ? { x: 8, y: 8 } : undefined,
    },
  };
}
