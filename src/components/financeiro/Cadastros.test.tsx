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

describe("categorias financeiras", () => {
  it("permite cadastrar receita e filtrar por natureza, inclusive sem resultados", async () => {
    render(<CadastrosFin tipo="categoria" />);
    expect(screen.getByText("Nenhum registro.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Adicionar" }));
    fireEvent.change(screen.getByLabelText("Nome *"), { target: { value: "Serviços de mão de obra" } });
    fireEvent.change(screen.getAllByLabelText("Tipo")[1]!, { target: { value: "receita" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Salvar" })).not.toBeInTheDocument());
    expect(estado.salvar).toHaveBeenCalledWith(expect.objectContaining({
      nome: "Serviços de mão de obra", tipo: "categoria", ativo: true, data: { natureza: "receita" },
    }));
    fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: "despesa" } });
    expect(screen.getByText("Nenhum registro.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: "receita" } });
    expect(screen.getByText("Serviços de mão de obra")).toBeInTheDocument();
  });

  it("edita, inativa e reativa mantendo o identificador e os dados da categoria antiga", async () => {
    estado.lista = [{ id: "categoria-antiga", tipo: "categoria", nome: "Aluguel", ativo: true, data: { natureza: "despesa", obs: "Preservar" } }];
    const { rerender } = render(<CadastrosFin tipo="categoria" />);
    fireEvent.click(screen.getByTitle("Editar"));
    fireEvent.change(screen.getByLabelText("Nome *"), { target: { value: "Aluguel da oficina" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Salvar" })).not.toBeInTheDocument());
    expect(screen.getByText("Aluguel da oficina")).toBeInTheDocument();
    fireEvent.click(screen.getByTitle("Inativar"));
    await waitFor(() => expect(estado.lista[0]?.ativo).toBe(false));
    rerender(<CadastrosFin tipo="categoria" />);
    fireEvent.click(screen.getByTitle("Ativar"));
    await waitFor(() => expect(estado.lista[0]?.ativo).toBe(true));
    expect(estado.lista).toEqual([{ id: "categoria-antiga", tipo: "categoria", nome: "Aluguel da oficina", ativo: true, data: { natureza: "despesa", obs: "Preservar" } }]);
  });

  it("mantém edição e ativação restritas à permissão de configuração financeira", () => {
    estado.configurar = false;
    estado.lista = [{ id: "categoria-antiga", tipo: "categoria", nome: "Aluguel", ativo: true, data: { natureza: "despesa" } }];
    render(<CadastrosFin tipo="categoria" />);
    expect(screen.getByRole("button", { name: "Adicionar" })).toBeInTheDocument();
    expect(screen.queryByTitle("Editar")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Inativar")).not.toBeInTheDocument();
    expect(estado.salvar).not.toHaveBeenCalled();
  });
});
