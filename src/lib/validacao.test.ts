import { describe, expect, it } from "vitest";
import { validarCEP, validarCNPJ, validarCPF, validarTelefone } from "./validacao";
import { documentoDuplicado, type Cliente } from "./clientes";

describe("validações de cliente", () => {
  it("aceita CPF válido e rejeita inválido", () => {
    expect(validarCPF("529.982.247-25")).toBe(true);
    expect(validarCPF("529.982.247-24")).toBe(false);
    expect(validarCPF("111.111.111-11")).toBe(false);
  });
  it("aceita CNPJ válido e rejeita inválido", () => {
    expect(validarCNPJ("11.222.333/0001-81")).toBe(true);
    expect(validarCNPJ("11.222.333/0001-80")).toBe(false);
  });
  it("valida telefone e CEP", () => {
    expect(validarTelefone("(16) 98173-0566")).toBe(true);
    expect(validarTelefone("9817")).toBe(false);
    expect(validarCEP("14000-000")).toBe(true);
    expect(validarCEP("1400")).toBe(false);
  });
  it("detecta CPF/CNPJ duplicado", () => {
    const list = [{ id: "a", documento: "52998224725" }] as Cliente[];
    expect(documentoDuplicado(list, "529.982.247-25")).toBe(true);
    expect(documentoDuplicado(list, "529.982.247-25", "a")).toBe(false);
  });
});
