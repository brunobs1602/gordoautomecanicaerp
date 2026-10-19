import { beforeEach, describe, expect, it } from "vitest";
import { ADMIN_ID, PERFIS_PADRAO, pode, type Perfil } from "./permissoes";
import { permissaoStatus } from "./orcamentos";

const base: Perfil = { id: "x", nome: "Teste", descricao: "", ativo: true, permissoes: { clientes: ["ver"] }, criadoEm: "", atualizadoEm: "" };

describe("permissões", () => {
  it("perfil pode visualizar clientes sem poder editar", () => {
    expect(pode(base, "clientes", "ver")).toBe(true);
    expect(pode(base, "clientes", "editar")).toBe(false);
  });
  it("perfil inativo perde todas as permissões", () => {
    expect(pode({ ...base, ativo: false }, "clientes", "ver")).toBe(false);
  });
  it("Administrador tem acesso total", () => {
    const admin = PERFIS_PADRAO.find((p) => p.id === ADMIN_ID)!;
    expect(pode({ ...admin, permissoes: {} }, "usuarios", "excluir")).toBe(true);
  });
  it("Funcionário não gerencia usuários nem configurações", () => {
    const f = PERFIS_PADRAO.find((p) => p.id === "funcionario")!;
    expect(pode(f, "clientes", "ver")).toBe(true);
    expect(pode(f, "usuarios", "ver")).toBe(false);
    expect(pode(f, "configuracoes", "ver")).toBe(false);
  });
  it("aprovar/recusar e reabrir exigem permissões próprias", () => {
    expect(permissaoStatus("orcamento", "aprovado")).toEqual(["orcamentos", "aprovar"]);
    expect(permissaoStatus("orcamento", "recusado")).toEqual(["orcamentos", "aprovar"]);
    expect(permissaoStatus("orcamento", "reaberto")).toEqual(["orcamentos", "reabrir"]);
  });
});

describe("regras de usuários e perfis", () => {
  beforeEach(() => localStorage.clear());

  async function loginAdmin() {
    const auth = await import("./auth");
    const admin = await auth.createUser({ name: "Admin", email: "a@a.com", password: "123456", role: ADMIN_ID });
    await auth.login("a@a.com", "123456");
    return { auth, admin };
  }

  it("não permite inativar o último administrador ativo", async () => {
    const { auth, admin } = await loginAdmin();
    expect(() => auth.setUserActive(admin.id, false)).toThrow(/administrador ativo/);
  });
  it("não permite excluir o último administrador ativo", async () => {
    const { auth, admin } = await loginAdmin();
    expect(() => auth.deleteUser(admin.id)).toThrow(/último administrador/);
  });
  it("e-mail de usuário deve ser único", async () => {
    const { auth } = await loginAdmin();
    await expect(auth.createUser({ name: "B", email: "A@a.com", password: "123456", role: "funcionario" })).rejects.toThrow(/e-mail/);
  });
  it("excluir perfil com usuários exige transferência", async () => {
    const { auth } = await loginAdmin();
    const u = await auth.createUser({ name: "Mec", email: "m@a.com", password: "123456", role: "mecanico" });
    const { excluirPerfil } = await import("./perfis");
    expect(() => excluirPerfil("mecanico")).toThrow(/Transfira/);
    excluirPerfil("mecanico", "funcionario");
    expect(auth.getUsers().find((x) => x.id === u.id)?.role).toBe("funcionario");
  });
  it("funcionário não consegue criar cliente nem usuário por outro caminho", async () => {
    const { auth } = await loginAdmin();
    await auth.createUser({ name: "Mec", email: "m@a.com", password: "123456", role: "mecanico" });
    await auth.login("m@a.com", "123456");
    const { criarCliente, clienteVazio } = await import("./clientes");
    expect(() => criarCliente(clienteVazio())).toThrow(/permissão/);
    await expect(auth.createUser({ name: "X", email: "x@a.com", password: "123456", role: ADMIN_ID })).rejects.toThrow(/permissão/);
  });
  it("usuário inativo não faz login", async () => {
    const { auth } = await loginAdmin();
    const u = await auth.createUser({ name: "F", email: "f@a.com", password: "123456", role: "funcionario" });
    auth.setUserActive(u.id, false);
    await expect(auth.login("f@a.com", "123456")).rejects.toThrow(/desativado/);
  });
});
