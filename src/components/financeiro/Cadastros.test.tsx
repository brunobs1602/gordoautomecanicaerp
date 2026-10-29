import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Cadastro } from "@/lib/financeiro";
import { CadastrosFin } from "./Cadastros";

const estado = vi.hoisted(() => ({ lista: [] as Cadastro[], salvar: vi.fn(), configurar: true }));
vi.mock("@/lib/financeiro", async (original) => ({
  ...await original<typeof import("@/lib/financeiro")>(),
  useCadastrosFin: () => estado.lista,
  salvarCadastro: estado.salvar,
}));
vi.mock("@/lib/acesso", () => ({ useAcesso: () => ({ pode: (_m: string, a?: string) => a === "config" ? estado.configurar : true }) }));
vi.mock("@/components/Modal", () => ({ Modal: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  estado.lista = [];
  estado.configurar = true;
  estado.salvar.mockReset();
  estado.salvar.mockImplementation(async (c: Omit<Cadastro, "id"> & { id?: string }) => {
    const registro = { ...c, id: c.id || "forma-1" };
    estado.lista = [...estado.lista.filter((x) => x.id !== registro.id), registro];
  });
});
afterEach(cleanup);

describe("cadastro simples de formas de pagamento", () => {
  it("cria e edita uma forma personalizada sem exigir conta ou maquininha", async () => {
    render(<CadastrosFin tipo="forma" />);
    fireEvent.click(screen.getByRole("button", { name: "Adicionar" }));
    fireEvent.change(screen.getByLabelText("Nome *"), { target: { value: "Pix da oficina" } });
    fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: "pix" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Salvar" })).not.toBeInTheDocument());
    expect(estado.salvar).toHaveBeenCalledWith(expect.objectContaining({
      nome: "Pix da oficina", tipo: "forma", ativo: true, data: expect.objectContaining({ chave: "pix" }),
    }));
    expect(estado.lista[0]?.data["contaPadrao"]).toBeUndefined();
    fireEvent.click(screen.getByTitle("Editar"));
    fireEvent.change(screen.getByLabelText("Nome *"), { target: { value: "Pix principal" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(screen.getByText("Pix principal")).toBeInTheDocument());
    expect(estado.lista).toHaveLength(1);
    expect(estado.lista[0]?.id).toBe("forma-1");
  });

  it("inativa e reativa sem apagar o registro ou as configurações existentes", async () => {
    estado.lista = [{ id: "antiga", tipo: "forma", nome: "Dinheiro", ativo: true, data: { chave: "dinheiro", obs: "Preservar" } }];
    const { rerender } = render(<CadastrosFin tipo="forma" />);
    fireEvent.click(screen.getByTitle("Inativar"));
    await waitFor(() => expect(estado.lista[0]?.ativo).toBe(false));
    rerender(<CadastrosFin tipo="forma" />);
    expect(screen.getByText("Inativo")).toBeInTheDocument();
    fireEvent.click(screen.getByTitle("Ativar"));
    await waitFor(() => expect(estado.lista[0]?.ativo).toBe(true));
    expect(estado.lista).toHaveLength(1);
    expect(estado.lista[0]).toMatchObject({ id: "antiga", data: { chave: "dinheiro", obs: "Preservar" } });
  });

  it("mantém as ações de configuração ocultas para quem não tem permissão", () => {
    estado.configurar = false;
    estado.lista = [{ id: "antiga", tipo: "forma", nome: "Dinheiro", ativo: true, data: { chave: "dinheiro" } }];
    render(<CadastrosFin tipo="forma" />);
    expect(screen.queryByRole("button", { name: "Adicionar" })).not.toBeInTheDocument();
    expect(screen.queryByTitle("Editar")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Inativar")).not.toBeInTheDocument();
    expect(estado.salvar).not.toHaveBeenCalled();
  });
});
