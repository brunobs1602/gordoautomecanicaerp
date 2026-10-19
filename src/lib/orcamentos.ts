import { exigir } from "./acesso";
import { getConfig } from "./config";
import { agoraISO, createCollection, moeda, novoId } from "./store";

export type Status = "rascunho" | "aguardando" | "aprovado" | "recusado" | "reaberto" | "cancelado" | "convertido";

export const STATUS_LABEL: Record<Status, string> = {
  rascunho: "Rascunho",
  aguardando: "Aguardando aprovação",
  aprovado: "Aprovado",
  recusado: "Recusado",
  reaberto: "Reaberto",
  cancelado: "Cancelado",
  convertido: "Convertido em OS",
};

/** Transições permitidas a partir de cada status. */
export const TRANSICOES: Record<Status, Status[]> = {
  rascunho: ["aguardando", "cancelado"],
  reaberto: ["aguardando", "cancelado"],
  aguardando: ["aprovado", "recusado", "cancelado"],
  recusado: ["reaberto"],
  aprovado: ["convertido", "cancelado"],
  cancelado: [],
  convertido: [],
};

export const podeEditar = (s: Status) => s === "rascunho" || s === "reaberto" || s === "aguardando";

export interface Item {
  id: string;
  tipo: "servico" | "produto";
  refId: string; // id do produto/serviço cadastrado ("" quando avulso)
  descricao: string;
  quantidade: number;
  valorUnit: number;
  desconto: number;
  acrescimo: number;
  observacao: string;
}

export interface Evento {
  id: string;
  data: string;
  usuario: string;
  acao: string;
  statusAnterior?: Status;
  statusNovo?: Status;
  detalhes: string[];
  observacao?: string;
}

export interface Dados {
  clienteId: string;
  veiculoId: string;
  validade: string;
  previsao: string;
  responsavelId: string;
  quilometragem: string;
  problema: string;
  diagnostico: string;
  obsInterna: string;
  obsCliente: string;
  condicoesPagamento: string;
  itens: Item[];
}

export interface Versao {
  data: string;
  usuario: string;
  dados: Dados;
}

export interface Orcamento extends Dados {
  id: string;
  numero: number;
  tipo: "orcamento" | "os";
  status: Status;
  criadoEm: string;
  atualizadoEm: string;
  historico: Evento[];
  versoes: Versao[];
}

export const subtotalItem = (i: Pick<Item, "quantidade" | "valorUnit" | "desconto" | "acrescimo">) =>
  Math.max(0, i.quantidade * i.valorUnit - i.desconto + i.acrescimo);

export function calcularTotais(itens: Item[]) {
  const bruto = (t: Item["tipo"]) => itens.filter((i) => i.tipo === t).reduce((s, i) => s + i.quantidade * i.valorUnit, 0);
  const servicos = bruto("servico");
  const produtos = bruto("produto");
  const descontos = itens.reduce((s, i) => s + i.desconto, 0);
  const acrescimos = itens.reduce((s, i) => s + i.acrescimo, 0);
  const total = itens.reduce((s, i) => s + subtotalItem(i), 0);
  return { servicos, produtos, descontos, acrescimos, total };
}

/** Permissão exigida para cada mudança de status. */
export function permissaoStatus(tipo: "orcamento" | "os", novo: Status): ["orcamentos" | "ordens", "aprovar" | "reabrir" | "criar" | "status"] {
  if (novo === "aprovado" || novo === "recusado") return ["orcamentos", "aprovar"];
  if (novo === "reaberto") return ["orcamentos", "reabrir"];
  if (novo === "convertido") return ["ordens", "criar"];
  return [tipo === "os" ? "ordens" : "orcamentos", "status"];
}

export const codigoDoc = (o: Pick<Orcamento, "numero" | "tipo">) =>
  `${o.tipo === "os" ? getConfig().orcamentos.prefixoOS || "OS" : getConfig().orcamentos.prefixoOrc || "ORC"}-${String(o.numero).padStart(5, "0")}`;

/** Lista as diferenças relevantes entre duas versões (para o histórico). */
export function diferencas(antes: Dados, depois: Dados): string[] {
  const out: string[] = [];
  const mapA = new Map(antes.itens.map((i) => [i.id, i]));
  const mapD = new Map(depois.itens.map((i) => [i.id, i]));
  for (const i of depois.itens) {
    const a = mapA.get(i.id);
    if (!a) out.push(`Incluído: ${i.descricao} (${i.quantidade} × ${moeda(i.valorUnit)})`);
    else if (subtotalItem(a) !== subtotalItem(i) || a.descricao !== i.descricao || a.observacao !== i.observacao)
      out.push(`Editado: ${i.descricao} (${moeda(subtotalItem(a))} → ${moeda(subtotalItem(i))})`);
  }
  for (const a of antes.itens) if (!mapD.has(a.id)) out.push(`Removido: ${a.descricao}`);
  const ta = calcularTotais(antes.itens).total;
  const td = calcularTotais(depois.itens).total;
  if (ta !== td) out.push(`Valor total: ${moeda(ta)} → ${moeda(td)}`);
  const campos: [keyof Dados, string][] = [
    ["clienteId", "Cliente"], ["veiculoId", "Veículo"], ["validade", "Validade"], ["previsao", "Previsão"],
    ["responsavelId", "Responsável"], ["problema", "Problema relatado"], ["diagnostico", "Diagnóstico"],
    ["obsCliente", "Observações para o cliente"], ["obsInterna", "Observações internas"],
    ["quilometragem", "Quilometragem"], ["condicoesPagamento", "Condições de pagamento"],
  ];
  for (const [k, label] of campos) if (antes[k] !== depois[k]) out.push(`${label} alterado`);
  return out;
}

const col = createCollection<Orcamento>("orcamentos", {
  colunas: (o) => ({ numero: o.numero, tipo: o.tipo, status: o.status, cliente_id: o.clienteId || null, veiculo_id: o.veiculoId || null }),
});
export const getOrcamentos = col.get;
export const useOrcamentos = col.use;

const evento = (usuario: string, acao: string, extra: Partial<Evento> = {}): Evento => ({
  id: novoId(), data: agoraISO(), usuario, acao, detalhes: [], ...extra,
});

function proximoNumero(list: Orcamento[]) {
  const inicial = Number(getConfig().orcamentos.numeracaoInicial) || 1;
  return Math.max(list.reduce((m, o) => Math.max(m, o.numero), 0) + 1, inicial);
}

export function criarOrcamento(d: Dados, usuario: string, origem?: string) {
  exigir("orcamentos", "criar");
  const list = col.get();
  const o: Orcamento = {
    ...d,
    id: novoId(),
    numero: proximoNumero(list),
    tipo: "orcamento",
    status: "rascunho",
    criadoEm: agoraISO(),
    atualizadoEm: agoraISO(),
    historico: [evento(usuario, origem ?? "Orçamento criado", { statusNovo: "rascunho", detalhes: [`Valor total: ${moeda(calcularTotais(d.itens).total)}`] })],
    versoes: [],
  };
  col.save([...list, o]);
  return o;
}

function dadosDe(o: Orcamento): Dados {
  const { clienteId, veiculoId, validade, previsao, responsavelId, quilometragem, problema, diagnostico, obsInterna, obsCliente, condicoesPagamento, itens } = o;
  return { clienteId, veiculoId, validade, previsao, responsavelId, quilometragem, problema, diagnostico, obsInterna, obsCliente, condicoesPagamento, itens };
}

export function atualizarOrcamento(id: string, d: Dados, usuario: string) {
  const list = col.get();
  const o = list.find((x) => x.id === id);
  if (!o) throw new Error("Orçamento não encontrado.");
  exigir(o.tipo === "os" ? "ordens" : "orcamentos", "editar");
  if (!podeEditar(o.status)) throw new Error("Este orçamento não pode mais ser editado.");
  const antes = dadosDe(o);
  const det = diferencas(antes, d);
  if (det.length === 0) return;
  const novo: Orcamento = {
    ...o, ...d,
    atualizadoEm: agoraISO(),
    versoes: [...o.versoes, { data: agoraISO(), usuario, dados: antes }],
    historico: [...o.historico, evento(usuario, "Orçamento editado", { detalhes: det })],
  };
  col.save(list.map((x) => (x.id === id ? novo : x)));
}

export function alterarStatus(id: string, novo: Status, usuario: string, observacao = "") {
  const list = col.get();
  const o = list.find((x) => x.id === id);
  if (!o) throw new Error("Orçamento não encontrado.");
  exigir(...permissaoStatus(o.tipo, novo));
  if (novo === "reaberto" && getConfig().orcamentos.reabrirRecusado === false) throw new Error("A reabertura de orçamentos recusados está desativada nas configurações.");
  if (!TRANSICOES[o.status].includes(novo)) throw new Error(`Não é possível mudar de "${STATUS_LABEL[o.status]}" para "${STATUS_LABEL[novo]}".`);
  const acao = novo === "reaberto" ? "Orçamento reaberto" : novo === "convertido" ? "Convertido em ordem de serviço" : "Status alterado";
  const atualizado: Orcamento = {
    ...o,
    status: novo,
    tipo: novo === "convertido" ? "os" : o.tipo,
    atualizadoEm: agoraISO(),
    historico: [...o.historico, evento(usuario, acao, { statusAnterior: o.status, statusNovo: novo, observacao })],
  };
  col.save(list.map((x) => (x.id === id ? atualizado : x)));
  return atualizado;
}

export function duplicarOrcamento(id: string, usuario: string) {
  const o = col.get().find((x) => x.id === id);
  if (!o) throw new Error("Orçamento não encontrado.");
  const itens = o.itens.map((i) => ({ ...i, id: novoId() }));
  return criarOrcamento({ ...dadosDe(o), itens }, usuario, `Duplicado de ${codigoDoc(o)}`);
}

/** Novo orçamento já vem com validade e textos padrão definidos em Configurações. */
export const dadosVazios = (responsavelId = ""): Dados => {
  const cfg = getConfig();
  const dias = Number(cfg.orcamentos.validadeDias || cfg.documentos.validadeDias) || 0;
  const validade = dias > 0 ? new Date(Date.now() + dias * 86_400_000).toISOString().slice(0, 10) : "";
  return {
    clienteId: "", veiculoId: "", validade, previsao: "", responsavelId, quilometragem: "", problema: "", diagnostico: "",
    obsInterna: String(cfg.orcamentos.obsInterna || ""),
    obsCliente: String(cfg.orcamentos.obsCliente || cfg.documentos.obsCliente || ""),
    condicoesPagamento: String(cfg.documentos.pagamento || cfg.financeiro.condicoes || ""),
    itens: [],
  };
};

export const novoItem = (tipo: Item["tipo"], p: Partial<Item> = {}): Item => ({
  id: novoId(), tipo, refId: "", descricao: "", quantidade: 1, valorUnit: 0, desconto: 0, acrescimo: 0, observacao: "", ...p,
});
