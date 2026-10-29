import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TooltipGrafico, mesGrafico, periodoGrafico, temValoresGrafico, valorGrafico } from "./TooltipGrafico";
import { useInteracaoGrafico } from "./useInteracaoGrafico";

afterEach(cleanup);

describe("valores e conteúdo dos gráficos", () => {
  it("formata reais e quantidades sem casas excessivas", () => {
    expect(valorGrafico(1250.5, true).replace(/\s/g, " ")).toBe("R$ 1.250,50");
    expect(valorGrafico(1234.5678)).toBe("1.234,57");
    expect(valorGrafico(0, true).replace(/\s/g, " ")).toBe("R$ 0,00");
    for (const invalido of [undefined, null, NaN, Infinity, "abc", "", [], {}]) {
      expect(valorGrafico(invalido, true)).toBe("—");
    }
  });

  it("mostra categoria completa, período, reais e percentual da fatia", () => {
    render(<TooltipGrafico active monetario periodo="01/10/2026 a 31/10/2026" total={2000}
      payload={[{ name: "Recebido", value: 1250.5, payload: { nome: "Pix" } }]} />);
    expect(screen.getByText("Pix")).toBeInTheDocument();
    expect(screen.getByText("01/10/2026 a 31/10/2026")).toBeInTheDocument();
    expect(screen.getByRole("status").textContent?.replace(/\s/g, " ")).toContain("R$ 1.250,50 (62,53%)");
  });

  it("usa o mês ou intervalo da própria categoria sem trocar o filtro", () => {
    render(<TooltipGrafico active label="10/26" periodo="Ano"
      payload={[{ name: "Clientes", value: 3, payload: { periodo: "10/2026" } }]} />);
    expect(screen.getByText("10/2026")).toBeInTheDocument();
    expect(screen.queryByText("Ano")).not.toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("preserva o nome completo e evita percentuais inválidos", () => {
    render(<TooltipGrafico active total={0} label="Nome curto"
      payload={[{ value: NaN, payload: { nome: "Nome curto", nomeCompleto: "Nome completo do produto" } }]} />);
    expect(screen.getByText("Nome completo do produto")).toBeInTheDocument();
    expect(screen.getByRole("status")).not.toHaveTextContent(/NaN|undefined|Infinity|%/);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("não renderiza tooltip inativo ou sem dados", () => {
    const { rerender } = render(<TooltipGrafico active payload={[]} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    rerender(<TooltipGrafico active={false} payload={[{ value: 1 }]} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("reconhece séries vazias e zeradas sem alterar os dados", () => {
    const dados = [{ Entradas: 0, Saídas: 0 }];
    expect(temValoresGrafico([], ["Entradas"])).toBe(false);
    expect(temValoresGrafico(dados, ["Entradas", "Saídas"])).toBe(false);
    expect(temValoresGrafico([{ Entradas: -10 }], ["Entradas"])).toBe(true);
    expect(temValoresGrafico([{ Entradas: NaN }], ["Entradas"])).toBe(false);
    expect(dados).toEqual([{ Entradas: 0, Saídas: 0 }]);
  });

  it("identifica períodos completos e limites abertos", () => {
    expect(mesGrafico("2026-10")).toBe("10/2026");
    expect(periodoGrafico("2026-10-01", "2026-10-31")).toBe("01/10/2026 a 31/10/2026");
    expect(periodoGrafico("0000-01-01", "9999-12-31")).toBe("Todo o período");
    expect(periodoGrafico("0000-01-01", "2026-10-31")).toBe("Até 31/10/2026");
    expect(periodoGrafico("2026-10-01", "9999-12-31")).toBe("Desde 01/10/2026");
  });
});

describe("consulta fixada nas barras", () => {
  it("fixa o valor no clique/toque e libera ao voltar a mover o mouse", () => {
    const { result } = renderHook(useInteracaoGrafico);
    const payload = [{ name: "Recebido", value: 150 }];
    act(() => result.current.eventos.onClick({ activePayload: payload, activeLabel: "Pix" }));
    expect(result.current.selecao).toEqual({ active: true, payload, label: "Pix" });
    expect(result.current.tooltip.active).toBe(true);
    act(() => result.current.eventos.onMouseMove());
    expect(result.current.selecao).toBeNull();
    act(() => result.current.eventos.onMouseDown({ activePayload: payload, activeLabel: "Pix" }));
    act(() => result.current.eventos.onMouseUp({ activePayload: payload, activeLabel: "Pix" }));
    expect(result.current.selecao?.payload).toEqual(payload);
    act(() => result.current.eventos.onClick(null));
    expect(result.current.selecao).toBeNull();
  });
});
