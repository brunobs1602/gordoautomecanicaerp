import { describe, expect, it } from "vitest";
import { TRANSICOES, calcularTotais, dadosVazios, diferencas, novoItem, podeEditar, subtotalItem } from "./orcamentos";
import { estoqueBaixo } from "./produtos";

describe("orçamentos", () => {
  it("calcula subtotal com desconto e acréscimo", () => {
    expect(subtotalItem({ quantidade: 2, valorUnit: 100, desconto: 10, acrescimo: 5 })).toBe(195);
  });
  it("calcula totais separando serviços e produtos", () => {
    const itens = [
      novoItem("servico", { quantidade: 1, valorUnit: 150, desconto: 20 }),
      novoItem("produto", { quantidade: 4, valorUnit: 30, acrescimo: 10 }),
    ];
    expect(calcularTotais(itens)).toEqual({ servicos: 150, produtos: 120, descontos: 20, acrescimos: 10, total: 260 });
  });
  it("recusado só pode ser reaberto e reaberto volta a permitir edição", () => {
    expect(TRANSICOES.recusado).toEqual(["reaberto"]);
    expect(podeEditar("reaberto")).toBe(true);
    expect(podeEditar("aprovado")).toBe(false);
  });
  it("somente aprovado pode ser convertido em OS", () => {
    const origens = Object.entries(TRANSICOES).filter(([, d]) => d.includes("convertido")).map(([s]) => s);
    expect(origens).toEqual(["aprovado"]);
  });
  it("registra inclusão e remoção de itens no histórico", () => {
    const a = dadosVazios();
    const item = novoItem("produto", { descricao: "Filtro de óleo", valorUnit: 40 });
    const b = { ...a, itens: [item] };
    expect(diferencas(a, b)[0]).toContain("Incluído: Filtro de óleo");
    expect(diferencas(b, a)[0]).toBe("Removido: Filtro de óleo");
  });
  it("aviso de estoque baixo", () => {
    expect(estoqueBaixo({ estoque: 1, estoqueMinimo: 3 })).toBe(true);
    expect(estoqueBaixo({ estoque: 3, estoqueMinimo: 3 })).toBe(false);
  });
});
