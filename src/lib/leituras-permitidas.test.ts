import { describe, expect, it } from "vitest";
import { PERFIS_PADRAO } from "./permissoes";
import { podeLerColecao } from "./leituras-permitidas";

describe("dependências das permissões existentes", () => {
  it("mecânico lê clientes das OS sem consultar usuários ou histórico", () => {
    const p = PERFIS_PADRAO.find((x) => x.id === "mecanico");
    expect(podeLerColecao(p, "clientes")).toBe(true);
    expect(podeLerColecao(p, "profiles")).toBe(false);
    expect(podeLerColecao(p, "auditoria")).toBe(false);
  });
  it("administrador mantém todas as coleções", () => {
    const p = PERFIS_PADRAO.find((x) => x.id === "admin");
    for (const nome of ["clientes", "veiculos", "produtos", "servicos", "orcamentos", "profiles", "auditoria"])
      expect(podeLerColecao(p, nome)).toBe(true);
  });
  it("perfil inativo não consulta dados operacionais", () => {
    const p = PERFIS_PADRAO.find((x) => x.id === "admin");
    if (!p) throw new Error("Perfil não encontrado");
    expect(podeLerColecao({ ...p, ativo: false }, "clientes")).toBe(false);
  });
});