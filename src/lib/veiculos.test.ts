import { describe, expect, it } from "vitest";
import { validarPlaca, verificarDuplicidade, veiculoSchema, veiculoVazio, type Veiculo } from "./veiculos";

describe("regras de veículos", () => {
  it("aceita placa antiga e Mercosul", () => {
    expect(validarPlaca("ABC-1234")).toBe(true);
    expect(validarPlaca("abc1d23")).toBe(true);
    expect(validarPlaca("AB12345")).toBe(false);
  });
  it("impede placa e chassi duplicados", () => {
    const list = [{ id: "1", placa: "ABC1234", chassi: "9BWZZZ377VT004251" }] as Veiculo[];
    expect(verificarDuplicidade(list, { placa: "abc-1234", chassi: "" })).toBe("Já existe um veículo com esta placa.");
    expect(verificarDuplicidade(list, { placa: "XYZ1A23", chassi: "9BWZZZ377VT004251" })).toBe("Já existe um veículo com este chassi.");
    expect(verificarDuplicidade(list, { placa: "ABC1234", chassi: "" }, "1")).toBeNull();
  });
  it("exige cliente e rejeita quilometragem negativa", () => {
    const r = veiculoSchema.safeParse({ ...veiculoVazio(), placa: "ABC1234", quilometragem: "-5" });
    expect(r.success).toBe(false);
    const paths = r.success ? [] : r.error.issues.map((i) => i.path[0]);
    expect(paths).toContain("clienteId");
    expect(paths).toContain("quilometragem");
  });
});
