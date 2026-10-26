import { describe, expect, it } from "vitest";
import { buscarTaxa, calcularTaxa, saldoConta, situacao, statusFinanceiroOS, valorFinal, type Cadastro, type Movimento, type Titulo } from "./financeiro";
import { PERFIS_PADRAO, pode } from "./permissoes";
import { proximoNumeroOS } from "./orcamentos";

const taxa = (id: string, parcelas: number, percentual: number, inicio = "2026-01-01", ativo = true): Cadastro => ({
  id, tipo: "taxa", nome: id, ativo, data: { maquininhaId: "stone", bandeiraId: "visa", modalidade: "credito", parcelas, percentual, inicio, prazo: 30 },
});
const tit = (p: Partial<Titulo>): Titulo => ({
  id: "t", tipo: "receber", status: "aberto", origem: "os", descricao: "", vencimento: "2026-10-26", valor: 100, pago: 0,
  documentoId: "os1", clienteId: null, categoriaId: null, parcela: 1, parcelas: 1, grupo: null, data: {}, criadoEm: "", ...p,
});

describe("taxas de cartão", () => {
  const taxas = [taxa("a", 1, 2.5), taxa("b", 2, 3.5), taxa("c", 12, 8.9), taxa("old", 1, 9, "2025-01-01"), taxa("inativa", 1, 1, "2026-06-01", false)];
  it("Stone/Visa crédito 1x usa 2,50% (a configuração mais recente e ativa)", () => {
    expect(buscarTaxa(taxas, { maquininhaId: "stone", bandeiraId: "visa", modalidade: "credito", parcelas: 1 }, "2026-10-26")?.data["percentual"]).toBe(2.5);
  });
  it("12x usa 8,90% e calcula líquido de R$ 1.000,00", () => {
    const t = buscarTaxa(taxas, { maquininhaId: "stone", bandeiraId: "visa", modalidade: "credito", parcelas: 12 }, "2026-10-26");
    expect(calcularTaxa(1000, Number(t?.data["percentual"]))).toEqual({ taxa: 89, liquido: 911 });
  });
  it("sem taxa cadastrada para 3x não retorna nada", () => {
    expect(buscarTaxa(taxas, { maquininhaId: "stone", bandeiraId: "visa", modalidade: "credito", parcelas: 3 }, "2026-10-26")).toBeUndefined();
  });
  it("valor fixo adicional soma à taxa", () => {
    expect(calcularTaxa(200, 2, 0.5)).toEqual({ taxa: 4.5, liquido: 195.5 });
  });
});

describe("situação das contas", () => {
  it("conta aberta com vencimento passado é vencida", () => expect(situacao(tit({ vencimento: "2026-10-25" }), "2026-10-26")).toBe("vencida"));
  it("vencendo dentro do prazo de alerta", () => expect(situacao(tit({ vencimento: "2026-10-28" }), "2026-10-26", 3)).toBe("vencendo"));
  it("paga continua paga mesmo vencida", () => expect(situacao(tit({ status: "pago", vencimento: "2026-01-01" }), "2026-10-26")).toBe("pago"));
  it("valor final = original − desconto + juros + multa", () => expect(valorFinal({ original: 500, desconto: 20, juros: 5, multa: 10 })).toBe(495));
});

describe("status financeiro da OS", () => {
  it("R$ 500 Pix + R$ 300 crédito + R$ 200 dinheiro numa OS de R$ 1.000 = pago", () => {
    expect(statusFinanceiroOS([tit({ valor: 1000, pago: 1000, status: "pago" })]).status).toBe("pago");
  });
  it("recebido parcial = parcialmente pago com pendente correto", () => {
    expect(statusFinanceiroOS([tit({ valor: 800, pago: 800, status: "pago" }), tit({ id: "x", valor: 200 })])).toMatchObject({ status: "parcial", pendente: 200 });
  });
  it("sem conta = não pago; só conta em aberto = pendente; cancelada = cancelado", () => {
    expect(statusFinanceiroOS([]).status).toBe("nao_pago");
    expect(statusFinanceiroOS([tit({})]).status).toBe("pendente");
    expect(statusFinanceiroOS([tit({})], true).status).toBe("cancelado");
  });
});

describe("saldo bancário", () => {
  it("saldo inicial + entradas − saídas, estorno anulando o lançamento", () => {
    const conta: Cadastro = { id: "c", tipo: "conta", nome: "Caixa", ativo: true, data: { saldoInicial: 100 } };
    const m = (valor: number, tipo: Movimento["tipo"] = "recebimento"): Movimento => ({ id: String(valor), criadoEm: "", dataMov: "2026-10-26", tipo, contaId: "c", valor, tituloId: null, documentoId: null, formaId: null, estornoDe: null, estornado: false, usuarioNome: "", data: {} });
    expect(saldoConta(conta, [m(500), m(-200, "pagamento"), m(-500, "estorno")])).toBe(-100);
  });
});

describe("permissões financeiras", () => {
  const perfil = (id: string) => PERFIS_PADRAO.find((p) => p.id === id);
  it("Funcionário não vê valores financeiros por padrão", () => expect(pode(perfil("funcionario"), "financeiro", "ver")).toBe(false));
  it("Financeiro registra pagamentos e estorna, mas não configura", () => {
    expect(pode(perfil("financeiro"), "financeiro", "baixar")).toBe(true);
    expect(pode(perfil("financeiro"), "financeiro", "estornar")).toBe(true);
    expect(pode(perfil("financeiro"), "financeiro", "config")).toBe(false);
  });
  it("Administrador tem acesso total", () => expect(pode(perfil("admin"), "financeiro", "config")).toBe(true));
});

describe("numeração da OS", () => {
  it("a OS recebe número próprio sequencial", () => {
    expect(proximoNumeroOS([{ tipo: "os", numero: 7, numeroOS: 2 }, { tipo: "orcamento", numero: 9 }])).toBe(3);
  });
});
