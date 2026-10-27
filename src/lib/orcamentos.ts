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

export type StatusOS = "aberta" | "avaliacao" | "aguardando_aprovacao" | "aprovada" | "execucao" | "aguardando_peca" | "aguardando_pagamento" | "finalizada" | "entregue" | "cancelada";
export const STATUS_OS: Record<StatusOS, string> = {
  aberta: "Aberta", avaliacao: "Em avaliação", aguardando_aprovacao: "Aguardando aprovação", aprovada: "Aprovada",
  execucao: "Em execução", aguardando_peca: "Aguardando peça", aguardando_pagamento: "Aguardando pagamento",
  finalizada: "Finalizada", entregue: "Entregue", cancelada: "Cancelada",
};

export interface Orcamento extends Dados {
  id: string;
  /** Número próprio da OS (atribuído na conversão). */
  numeroOS?: number;
  statusOS?: StatusOS;
  concluidaEm?: string;
  numero: number;
  tipo: "orcamento" | "os";
  status: Status;
  criadoEm: string;
  atualizadoEm: string;
  historico: Evento[];
  versoes: Versao[];
  /** Fotos dos problemas (arquivos no armazenamento privado). */
  imagens?: ImagemOrc[];
}

export interface ImagemOrc { caminho: string; nome: string; tamanho: number; criadoEm: string; usuario: string }

/** A aprovação atual veio do cliente pelo link? (último evento que levou a "aprovado"). */
export function aprovadoPeloCliente(o: Pick<Orcamento, "historico">) {
  const ult = [...o.historico].reverse().find((h) => h.statusNovo === "aprovado");
  return ult?.usuario === "Cliente (link)";
}

export function definirImagens(id: string, imagens: ImagemOrc[], usuario: string, acao: string) {
  exigir("orcamentos", "editar");
  const list = col.get();
  const o = list.find((x) => x.id === id);
  if (!o) throw new Error("Orçamento não encontrado.");
  const novo: Orcamento = { ...o, imagens, atualizadoEm: agoraISO(), historico: [...o.historico, evento(usuario, acao)] };
  col.save(list.map((x) => (x.id === id ? novo : x)));
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

export const codigoDoc = (o: Pick<Orcamento, "numero" | "tipo"> & { numeroOS?: number | undefined }) =>
  o.tipo === "os"
    ? `${getConfig().orcamentos.prefixoOS || "OS"}-${String(o.numeroOS ?? o.numero).padStart(5, "0")}`
    : codigoOrcamento(o);
/** Número do orçamento de origem (mantido após a conversão). */
export const codigoOrcamento = (o: Pick<Orcamento, "numero">) => `${getConfig().orcamentos.prefixoOrc || "ORC"}-${String(o.numero).padStart(5, "0")}`;
export const statusOSDe = (o: Pick<Orcamento, "statusOS">): StatusOS => o.statusOS ?? "aberta";
export function proximoNumeroOS(list: Pick<Orcamento, "numeroOS" | "numero" | "tipo">[]) {
  return list.filter((o) => o.tipo === "os").reduce((m, o) => Math.max(m, o.numeroOS ?? 0), 0) + 1;
}

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

export function alterarStatus(id: string, novo: Status, usuario: string, observacao = "", itensAprovados?: string[]) {
  const list = col.get();
  const o = list.find((x) => x.id === id);
  if (!o) throw new Error("Orçamento não encontrado.");
  exigir(...permissaoStatus(o.tipo, novo));
  if (novo === "reaberto" && getConfig().orcamentos.reabrirRecusado === false) throw new Error("A reabertura de orçamentos recusados está desativada nas configurações.");
  if (!TRANSICOES[o.status].includes(novo)) throw new Error(`Não é possível mudar de "${STATUS_LABEL[o.status]}" para "${STATUS_LABEL[novo]}".`);
  const acao = novo === "reaberto" ? "Orçamento reaberto" : novo === "convertido" ? "Convertido em ordem de serviço" : "Status alterado";
  const manter = novo === "convertido" && itensAprovados ? new Set(itensAprovados) : null;
  const removidos = manter ? o.itens.filter((i) => !manter.has(i.id)) : [];
  const atualizado: Orcamento = {
    ...o,
    ...(manter ? { itens: o.itens.filter((i) => manter.has(i.id)) } : {}),
    status: novo,
    tipo: novo === "convertido" ? "os" : o.tipo,
    ...(novo === "convertido" && !o.numeroOS ? { numeroOS: proximoNumeroOS(list), statusOS: "aberta" as StatusOS } : {}),
    atualizadoEm: agoraISO(),
    historico: [...o.historico, evento(usuario, acao, {
      statusAnterior: o.status, statusNovo: novo, observacao,
      detalhes: removidos.map((i) => `Não incluído (recusado pelo cliente): ${i.descricao}`),
    })],
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

/** Status de acompanhamento da OS (separado do status do orçamento de origem). */
export function alterarStatusOS(id: string, novo: StatusOS, usuario: string, observacao = "") {
  const list = col.get();
  const o = list.find((x) => x.id === id);
  if (!o || o.tipo !== "os") throw new Error("Ordem de serviço não encontrada.");
  exigir("ordens", "status");
  const atual = statusOSDe(o);
  if (atual === novo) return o;
  if (atual === "cancelada" || atual === "entregue") throw new Error(`A OS está "${STATUS_OS[atual]}" e não pode mudar de status.`);
  const atualizado: Orcamento = {
    ...o,
    statusOS: novo,
    ...(novo === "finalizada" ? { concluidaEm: agoraISO() } : {}),
    atualizadoEm: agoraISO(),
    historico: [...o.historico, evento(usuario, novo === "finalizada" ? "Ordem de serviço finalizada" : "Status da OS alterado", {
      detalhes: [`${STATUS_OS[atual]} → ${STATUS_OS[novo]}`], observacao,
    })],
  };
  col.save(list.map((x) => (x.id === id ? atualizado : x)));
  return atualizado;
}
