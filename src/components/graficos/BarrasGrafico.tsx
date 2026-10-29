import type { ComponentProps, ReactNode } from "react";
import { BarChart, Tooltip } from "recharts";
import { TooltipGrafico, tooltipGraficoProps } from "./TooltipGrafico";
import { useInteracaoGrafico } from "./useInteracaoGrafico";

type Props = ComponentProps<typeof BarChart> & { periodo: string; monetario?: boolean; children: ReactNode };

export function BarrasGrafico({ periodo, monetario = false, children, ...props }: Props) {
  // Uma mudança nos filtros ou nos valores descarta qualquer consulta fixada.
  const contexto = JSON.stringify([periodo, props.data]);
  return <BarrasInterativas key={contexto} {...props} periodo={periodo} monetario={monetario}>{children}</BarrasInterativas>;
}

function BarrasInterativas({ periodo, monetario, children, ...props }: Props) {
  const interacao = useInteracaoGrafico();
  return <BarChart {...props} {...interacao.eventos} accessibilityLayer>
    {children}
    <Tooltip {...tooltipGraficoProps} {...interacao.tooltip}
      content={(tooltip) => <TooltipGrafico {...tooltip} {...(interacao.selecao ?? {})} periodo={periodo} monetario={monetario} />} />
  </BarChart>;
}
