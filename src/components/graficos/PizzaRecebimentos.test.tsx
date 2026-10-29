import { cloneElement, type ReactElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PizzaRecebimentos } from "./PizzaRecebimentos";

// Apenas o medidor de tamanho é substituído: setores e eventos são do Recharts.
vi.mock("recharts", async (original) => ({
  ...await original<typeof import("recharts")>(),
  ResponsiveContainer: ({ children }: { children: ReactElement<{ width?: number; height?: number }> }) =>
    cloneElement(children, { width: 400, height: 160 }),
}));
afterEach(cleanup);

const dados = [{ nome: "Pix", valor: 1250.5 }, { nome: "Dinheiro", valor: 749.5 }];

describe("recebimentos por forma de pagamento", () => {
  it("abre valores ao passar o mouse sobre uma fatia e fecha ao sair", () => {
    const { container } = render(<PizzaRecebimentos dados={dados} periodo="10/2026" />);
    const fatia = container.querySelector(".recharts-pie-sector")!;
    expect(fatia).not.toBeNull();
    fireEvent.mouseEnter(fatia);
    expect(screen.getByRole("status")).toHaveTextContent("Pix");
    expect(screen.getByRole("status")).toHaveTextContent("62,53%");
    fireEvent.mouseLeave(fatia);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("fixa a consulta ao selecionar a fatia, inclusive após retirar o ponteiro", () => {
    const { container } = render(<PizzaRecebimentos dados={dados} periodo="10/2026" />);
    const fatia = container.querySelector(".recharts-pie-sector")!;
    fireEvent.click(fatia);
    fireEvent.mouseLeave(fatia);
    expect(screen.getByRole("status")).toHaveTextContent("Pix");
    expect(screen.getByRole("status").textContent?.replace(/\s/g, " ")).toContain("R$ 1.250,50");
    fireEvent.click(fatia);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("oferece consulta por botão, toque e foco sem depender de fatias pequenas", () => {
    render(<PizzaRecebimentos dados={dados} periodo="10/2026" />);
    const botao = screen.getByRole("button", { name: /Dinheiro/ });
    fireEvent.focus(botao);
    expect(screen.getByRole("status")).toHaveTextContent("37,48%");
    fireEvent.blur(botao);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    fireEvent.click(botao);
    expect(botao).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Dinheiro");
  });

  it("não exibe valores inválidos sem registros", () => {
    render(<PizzaRecebimentos dados={[]} periodo="Todo o período" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
