import { describe, expect, it } from "vitest";
import { mascaraMoeda, moedaParaNumero, proximoCodigo } from "./moeda";

describe("valores em reais", () => {
  it("formata milhares com ponto e decimais com vírgula", () => {
    expect(mascaraMoeda("1250,50")).toBe("1.250,50");
  });
  it("aceita valor sem casas decimais", () => {
    expect(mascaraMoeda("1250")).toBe("1.250");
    expect(moedaParaNumero("1.250")).toBe(1250);
  });
  it("ponto digitado como decimal vira vírgula", () => {
    expect(mascaraMoeda("12.5")).toBe("12,5");
  });
  it("limita a duas casas e ignora letras", () => {
    expect(mascaraMoeda("9,999a")).toBe("9,99");
  });
  it("salva como número correto", () => {
    expect(moedaParaNumero("1.250,50")).toBe(1250.5);
  });
});

describe("códigos automáticos", () => {
  it("gera PROD-000001 quando não há códigos", () => {
    expect(proximoCodigo("PROD", [])).toBe("PROD-000001");
  });
  it("continua após o maior código existente", () => {
    expect(proximoCodigo("SERV", ["SERV-000007", "XYZ", "SERV-000002"])).toBe("SERV-000008");
  });
});
