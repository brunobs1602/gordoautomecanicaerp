import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FinalizarOSModal } from "./FinalizarOS";
import { novoPagamento, totalAplicado, validarPagamentos } from "./PagamentoForm";
import { toast } from "sonner";

const estado = vi.hoisted(() => ({
  cadastros: [
    { id: "pix", tipo: "forma", nome: "Pix", ativo: true, data: { chave: "pix" } },
    { id: "dinheiro", tipo: "forma", nome: "Dinheiro", ativo: true, data: { chave: "dinheiro" } },
    { id: "inativo", tipo: "forma", nome: "Forma desativada", ativo: false, data: { chave: "outro" } },
  ],
  finalizar: vi.fn(),
}));
vi.mock("@/lib/financeiro", async (original) => ({
  ...await original<typeof import("@/lib/financeiro")>(),
  useCadastrosFin: () => estado.cadastros,
  finalizarOSFinanceiro: estado.finalizar,
}));
vi.mock("@/lib/acesso", () => ({ useAcesso: () => ({ isAdmin: true, pode: () => true }) }));
vi.mock("@/components/Modal", () => ({ Modal: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
  estado.finalizar.mockReset();
  estado.finalizar.mockResolvedValue({ total: 100, recebido: 100, pendente: 0 });
});
afterEach(cleanup);
const abrir = () => {
  const fechar = vi.fn();
  render(<FinalizarOSModal osId="os-1" codigo="OS-00001" total={100} onClose={fechar} />);
  return fechar;
};

describe("recebimento simples na OS", () => {
  it("exige confirmação explícita antes de registrar qualquer valor", () => {
    abrir();
    expect(screen.getByRole("button", { name: "Confirmar e finalizar OS" })).toBeDisabled();
    expect(estado.finalizar).not.toHaveBeenCalled();
  });
  it("lista apenas formas ativas e registra Pix sem conta, chave ou maquininha", async () => {
    const fechar = abrir();
    fireEvent.change(screen.getByLabelText("O cliente já pagou?"), { target: { value: "pago" } });
    expect(screen.queryByRole("option", { name: "Forma desativada" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Forma de pagamento")).toHaveValue("pix");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar e finalizar OS" }));
    await waitFor(() => expect(estado.finalizar).toHaveBeenCalledTimes(1));
    expect(estado.finalizar.mock.calls[0]?.slice(0, 2)).toEqual(["os-1", [expect.objectContaining({ forma_id: "pix", conta_id: "", valor: 100 })]]);
    await waitFor(() => expect(fechar).toHaveBeenCalledTimes(1));
  });
  it("pagamento posterior envia lista vazia: cria saldo aberto, não recebimento", async () => {
    estado.finalizar.mockResolvedValue({ total: 100, recebido: 0, pendente: 100 });
    abrir();
    fireEvent.change(screen.getByLabelText("O cliente já pagou?"), { target: { value: "depois" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar e finalizar OS" }));
    await waitFor(() => expect(estado.finalizar).toHaveBeenCalledTimes(1));
    expect(estado.finalizar.mock.calls[0]?.[1]).toEqual([]);
    expect(estado.finalizar.mock.calls[0]?.[3]).toBe(1);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("Nenhuma entrada registrada no caixa")));
  });
  it("pagamento parcial envia somente o recebido e preserva o saldo", async () => {
    estado.finalizar.mockResolvedValue({ total: 100, recebido: 40, pendente: 60 });
    abrir();
    fireEvent.change(screen.getByLabelText("O cliente já pagou?"), { target: { value: "pago" } });
    fireEvent.change(screen.getByRole("textbox", { name: /Valor/ }), { target: { value: "40,00" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar e finalizar OS" }));
    await waitFor(() => expect(estado.finalizar).toHaveBeenCalledTimes(1));
    expect(estado.finalizar.mock.calls[0]?.[1]).toEqual([expect.objectContaining({ valor: 40 })]);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("60,00")));
  });
  it("permite dividir o pagamento em duas formas sem aumentar o total", async () => {
    abrir();
    fireEvent.change(screen.getByLabelText("O cliente já pagou?"), { target: { value: "pago" } });
    fireEvent.change(screen.getByRole("textbox", { name: /Valor/ }), { target: { value: "40,00" } });
    fireEvent.click(screen.getByRole("button", { name: "Outra forma de pagamento" }));
    fireEvent.change(screen.getAllByLabelText("Forma de pagamento")[1]!, { target: { value: "dinheiro" } });
    fireEvent.change(screen.getAllByRole("textbox", { name: /Valor/ })[1]!, { target: { value: "60,00" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar e finalizar OS" }));
    await waitFor(() => expect(estado.finalizar).toHaveBeenCalledTimes(1));
    expect(estado.finalizar.mock.calls[0]?.[1]).toEqual([
      expect.objectContaining({ forma_id: "pix", valor: 40 }),
      expect.objectContaining({ forma_id: "dinheiro", valor: 60 }),
    ]);
  });
  it("cliques repetidos não enviam duas confirmações", async () => {
    estado.finalizar.mockReturnValue(new Promise(() => {}));
    abrir();
    fireEvent.change(screen.getByLabelText("O cliente já pagou?"), { target: { value: "pago" } });
    const confirmar = screen.getByRole("button", { name: "Confirmar e finalizar OS" });
    fireEvent.click(confirmar);
    fireEvent.click(confirmar);
    await waitFor(() => expect(estado.finalizar).toHaveBeenCalledTimes(1));
  });
  it("falha no registro mantém a tela aberta para correção", async () => {
    estado.finalizar.mockRejectedValue(new Error("Esta OS já possui contas a receber."));
    const fechar = abrir();
    fireEvent.change(screen.getByLabelText("O cliente já pagou?"), { target: { value: "pago" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar e finalizar OS" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Confirmar e finalizar OS" })).toBeEnabled());
    expect(fechar).not.toHaveBeenCalled();
  });
  it("aceita conta automática, mas bloqueia valores inválidos", () => {
    const p = novoPagamento(estado.cadastros as Parameters<typeof novoPagamento>[0], 100);
    expect(validarPagamentos([p])).toBe("");
    expect(validarPagamentos([{ ...p, valor: NaN }])).not.toBe("");
    expect(validarPagamentos([{ ...p, valor: 0 }])).not.toBe("");
    expect(validarPagamentos([{ ...p, desconto: -1 }])).not.toBe("");
    expect(totalAplicado([{ ...p, valor: 33.33 }, { ...p, valor: 66.67 }])).toBe(100);
  });
});
