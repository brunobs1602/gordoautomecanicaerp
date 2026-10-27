import { describe, expect, it } from "vitest";
import { dimensoesReduzidas, itensParaConversao, totaisSelecao } from "./portal";
import { aprovadoPeloCliente } from "./orcamentos";

const itens = [{ id: "a", subtotal: 100 }, { id: "b", subtotal: 50.5 }, { id: "c", subtotal: 20 }];

describe("portal do cliente", () => {
  it("soma apenas os itens selecionados", () => {
    expect(totaisSelecao(itens, new Set(["a", "c"]))).toEqual({ aprovado: 120, recusado: 50.5 });
  });
  it("nenhum item selecionado = tudo recusado", () => {
    expect(totaisSelecao(itens, new Set())).toEqual({ aprovado: 0, recusado: 170.5 });
  });
  it("conversão em OS leva só os itens aprovados", () => {
    const r = { itens: [{ id: "a", aprovado: true }, { id: "b", aprovado: false }, { id: "c", aprovado: true }] };
    expect(itensParaConversao(itens, r).map((i) => i.id)).toEqual(["a", "c"]);
  });
  it("sem resposta do cliente a conversão mantém todos os itens", () => {
    expect(itensParaConversao(itens, null)).toHaveLength(3);
  });
  it("só usa a resposta do link quando a aprovação veio do cliente", () => {
    const ev = (usuario: string) => ({ id: "1", data: "", usuario, acao: "", detalhes: [], statusNovo: "aprovado" as const });
    expect(aprovadoPeloCliente({ historico: [ev("Cliente (link)")] })).toBe(true);
    expect(aprovadoPeloCliente({ historico: [ev("Cliente (link)"), ev("Maria")] })).toBe(false);
  });
  it("reduz fotos grandes para no máximo 1600 px mantendo a proporção", () => {
    expect(dimensoesReduzidas(4000, 3000)).toEqual({ w: 1600, h: 1200 });
    expect(dimensoesReduzidas(800, 600)).toEqual({ w: 800, h: 600 });
  });
});
