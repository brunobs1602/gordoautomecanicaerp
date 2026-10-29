import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BarrasGrafico } from "./BarrasGrafico";

vi.mock("recharts", () => ({
  BarChart: ({ children, onClick, onMouseMove }: {
    children: ReactNode;
    onClick: (estado: unknown) => void;
    onMouseMove: () => void;
  }) => <div>
    <button onClick={() => onClick({ activeLabel: "10/26", activePayload: [
      { name: "Entradas", value: 1250.5, payload: { periodo: "10/2026" } },
      { name: "Saídas", value: 100, payload: { periodo: "10/2026" } },
    ] })} onMouseMove={onMouseMove}>Consultar barras</button>
    {children}
  </div>,
  Tooltip: ({ content }: { content: (props: object) => ReactNode }) => content({ active: false, payload: [] }),
}));
afterEach(cleanup);

describe("integração da consulta nas barras", () => {
  it("exibe todas as séries e o mês ao selecionar, e descarta a consulta quando os filtros mudam", () => {
    const { rerender } = render(<BarrasGrafico data={[{ valor: 1 }]} periodo="Ano" monetario>{null}</BarrasGrafico>);
    fireEvent.click(screen.getByRole("button", { name: "Consultar barras" }));
    expect(screen.getByRole("status")).toHaveTextContent("Entradas");
    expect(screen.getByRole("status")).toHaveTextContent("Saídas");
    expect(screen.getByRole("status")).toHaveTextContent("10/2026");
    expect(screen.getByRole("status").textContent?.replace(/\s/g, " ")).toContain("R$ 1.250,50");
    rerender(<BarrasGrafico data={[{ valor: 2 }]} periodo="Mês" monetario>{null}</BarrasGrafico>);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("não mantém a seleção fixada quando o usuário volta a mover o mouse", () => {
    render(<BarrasGrafico data={[]} periodo="Atual">{null}</BarrasGrafico>);
    const botao = screen.getByRole("button", { name: "Consultar barras" });
    fireEvent.click(botao);
    expect(screen.getByRole("status")).toBeInTheDocument();
    fireEvent.mouseMove(botao);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
