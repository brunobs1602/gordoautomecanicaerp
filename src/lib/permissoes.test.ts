import { describe, expect, it } from "vitest";
import { validarSenha } from "./config";
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

describe("regras de senha", () => {
  it("senha precisa ter o tamanho mínimo configurado (6)", () => {
    expect(validarSenha("12345")).toMatch(/6 caracteres/);
    expect(validarSenha("123456")).toBe("");
  });
});
