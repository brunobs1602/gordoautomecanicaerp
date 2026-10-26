import { supabase } from "@/integrations/supabase/client";
import { exigir } from "./acesso";
import { getConfig } from "./config";
import { atualizarDoBanco, createCollection, mensagemErro } from "./store";

// ---------------- Tipos ----------------
export type TipoCadastro = "conta" | "forma" | "maquininha" | "bandeira" | "taxa" | "pix" | "categoria" | "centro";
export interface Cadastro {
  id: string;
  tipo: TipoCadastro;
  nome: string;
  ativo: boolean;
  data: Record<string, unknown>;
}
export type StatusTitulo = "aberto" | "parcial" | "pago" | "cancelado";
export type SituacaoTitulo = StatusTitulo | "vencida" | "vencendo";
export interface Titulo {
  id: string;
  tipo: "pagar" | "receber";
  status: StatusTitulo;
  origem: string;
  descricao: string;
  vencimento: string;
  valor: number;
  pago: number;
  documentoId: string | null;
  clienteId: string | null;
  categoriaId: string | null;
  parcela: number;
  parcelas: number;
  grupo: string | null;
  data: Record<string, unknown>;
  criadoEm: string;
}
export interface Movimento {
  id: string;
  criadoEm: string;
  dataMov: string;
  tipo: "pagamento" | "recebimento" | "transferencia" | "ajuste" | "estorno";
  contaId: string;
  valor: number;
  tituloId: string | null;
  documentoId: string | null;
  formaId: string | null;
  estornoDe: string | null;
  estornado: boolean;
  usuarioNome: string;
  data: Record<string, unknown>;
}
export interface HistFin {
  id: string;
  data: string;
  usuarioNome: string;
  tipo: string;
  valor: number | null;
  contaId: string | null;
  formaId: string | null;
  tituloId: string | null;
  documentoId: string | null;
  observacao: string;
  statusAnterior: string | null;
  statusNovo: string | null;
}

/** Um pagamento dentro de uma baixa (permite várias formas na mesma conta/OS). */
export interface Pagamento {
  conta_id: string;
  forma_id: string;
  valor: number;
  juros?: number;
  multa?: number;
  desconto?: number;
  taxa?: number;
  bruto?: number;
  liquido?: number;
  maquininha_id?: string;
  bandeira_id?: string;
  modalidade?: "debito" | "credito";
  parcelas?: number;
  pix_id?: string;
  nsu?: string;
  previsto?: string;
  obs?: string;
  comprovante?: string;
  taxa_manual?: boolean;
}

export const STATUS_TITULO: Record<SituacaoTitulo, string> = {
  aberto: "Em aberto", parcial: "Parcialmente paga", pago: "Paga", cancelado: "Cancelada", vencida: "Vencida", vencendo: "Vencendo",
};
export const STATUS_RECEBER: Record<SituacaoTitulo, string> = {
  aberto: "Aguardando pagamento", parcial: "Parcialmente recebida", pago: "Recebida", cancelado: "Cancelada", vencida: "Vencida", vencendo: "Vencendo",
};
export const TIPO_CONTA: Record<string, string> = { corrente: "Conta corrente", poupanca: "Poupança", caixa: "Caixa interno", carteira: "Carteira" };
export const ADQUIRENTES = ["Stone", "Cielo", "Rede", "Getnet", "PagSeguro", "Mercado Pago", "SafraPay", "SumUp", "Ton", "InfinitePay", "Outra"];

// ---------------- Regras puras (testadas) ----------------
export const hojeISO = (d = new Date()) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return z.toISOString().slice(0, 10);
};
export const somarDias = (iso: string, dias: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return hojeISO(d);
};
export const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Situação exibida: contas abertas viram "vencida" ou "vencendo" pela data. */
export function situacao(t: Pick<Titulo, "status" | "vencimento">, hoje = hojeISO(), diasAlerta = 3): SituacaoTitulo {
  if (t.status === "pago" || t.status === "cancelado") return t.status;
  if (t.vencimento < hoje) return "vencida";
  if (t.vencimento <= somarDias(hoje, diasAlerta)) return t.status === "parcial" ? "parcial" : "vencendo";
  return t.status;
}
export const saldoTitulo = (t: Pick<Titulo, "valor" | "pago" | "status">) => (t.status === "cancelado" ? 0 : r2(Math.max(0, t.valor - t.pago)));

/** Valor final da conta: original − desconto + juros + multa (+ acréscimo). */
export const valorFinal = (d: { original: number; desconto?: number; juros?: number; multa?: number; acrescimo?: number }) =>
  r2(Math.max(0, d.original - (d.desconto ?? 0) + (d.juros ?? 0) + (d.multa ?? 0) + (d.acrescimo ?? 0)));

/** Taxa vigente para maquininha + bandeira + modalidade + parcelas (a mais recente já iniciada). */
export function buscarTaxa(taxas: Cadastro[], q: { maquininhaId: string; bandeiraId: string; modalidade: string; parcelas: number }, hoje = hojeISO()) {
  return taxas
    .filter((t) => t.ativo && t.data["maquininhaId"] === q.maquininhaId && t.data["bandeiraId"] === q.bandeiraId &&
      t.data["modalidade"] === q.modalidade && Number(t.data["parcelas"] || 1) === (q.modalidade === "debito" ? 1 : q.parcelas) &&
      String(t.data["inicio"] || "") <= hoje)
    .sort((a, b) => String(b.data["inicio"] || "").localeCompare(String(a.data["inicio"] || "")))[0];
}
export function calcularTaxa(bruto: number, percentual: number, fixo = 0) {
  const taxa = r2(bruto * (percentual / 100) + fixo);
  return { taxa, liquido: r2(bruto - taxa) };
}

/** Saldo atual = saldo inicial + todas as movimentações (estornos já entram como lançamento contrário). */
export function saldoConta(conta: Cadastro, movs: Movimento[], ate?: string) {
  const ini = Number(conta.data["saldoInicial"] || 0);
  return r2(movs.filter((m) => m.contaId === conta.id && (!ate || m.dataMov <= ate)).reduce((s, m) => s + m.valor, ini));
}

export type StatusFinOS = "nao_pago" | "parcial" | "pago" | "pendente" | "cancelado";
export const STATUS_FIN_OS: Record<StatusFinOS, string> = {
  nao_pago: "Não pago", parcial: "Parcialmente pago", pago: "Pago", pendente: "Pagamento pendente", cancelado: "Cancelado",
};
/** Status financeiro da OS a partir das contas a receber vinculadas. */
export function statusFinanceiroOS(titulos: Titulo[], osCancelada = false) {
  const ativos = titulos.filter((t) => t.status !== "cancelado");
  const total = r2(ativos.reduce((s, t) => s + t.valor, 0));
  const recebido = r2(ativos.reduce((s, t) => s + t.pago, 0));
  const pendente = r2(Math.max(0, total - recebido));
  let status: StatusFinOS;
  if (osCancelada) status = "cancelado";
  else if (!ativos.length) status = "nao_pago";
  else if (pendente <= 0.009) status = "pago";
  else if (recebido > 0) status = "parcial";
  else status = "pendente";
  return { status, total, recebido, pendente };
}

// ---------------- Coleções ----------------
const num = (v: unknown) => Number(v ?? 0);
const obj = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

const cad = createCollection<Cadastro>("fin_cadastros", {
  select: "id,tipo,nome,ativo,data",
  paraLinha: (c) => ({ id: c.id, tipo: c.tipo, nome: c.nome, ativo: c.ativo, data: c.data }),
  deLinha: (l) => ({ id: l.id, tipo: l["tipo"] as TipoCadastro, nome: String(l["nome"] ?? ""), ativo: Boolean(l["ativo"]), data: obj(l["data"]) }),
});
const tit = createCollection<Titulo>("fin_titulos", {
  select: "id,tipo,status,origem,descricao,vencimento,valor,pago,documento_id,cliente_id,categoria_id,parcela,parcelas,grupo,data,criado_em",
  deLinha: (l) => ({
    id: l.id, tipo: l["tipo"] as Titulo["tipo"], status: l["status"] as StatusTitulo, origem: String(l["origem"]), descricao: String(l["descricao"] ?? ""),
    vencimento: String(l["vencimento"]), valor: num(l["valor"]), pago: num(l["pago"]), documentoId: (l["documento_id"] as string) ?? null,
    clienteId: (l["cliente_id"] as string) ?? null, categoriaId: (l["categoria_id"] as string) ?? null, parcela: num(l["parcela"]) || 1,
    parcelas: num(l["parcelas"]) || 1, grupo: (l["grupo"] as string) ?? null, data: obj(l["data"]), criadoEm: String(l["criado_em"]),
  }),
});
const mov = createCollection<Movimento>("fin_movimentos", {
  select: "id,criado_em,data_mov,tipo,conta_id,valor,titulo_id,documento_id,forma_id,estorno_de,estornado,usuario_nome,data",
  deLinha: (l) => ({
    id: l.id, criadoEm: String(l["criado_em"]), dataMov: String(l["data_mov"]), tipo: l["tipo"] as Movimento["tipo"], contaId: String(l["conta_id"]),
    valor: num(l["valor"]), tituloId: (l["titulo_id"] as string) ?? null, documentoId: (l["documento_id"] as string) ?? null,
    formaId: (l["forma_id"] as string) ?? null, estornoDe: (l["estorno_de"] as string) ?? null, estornado: Boolean(l["estornado"]),
    usuarioNome: String(l["usuario_nome"] ?? ""), data: obj(l["data"]),
  }),
});
const hist = createCollection<HistFin>("fin_historico", {
  sobDemanda: true,
  select: "id,data,usuario_nome,tipo,valor,conta_id,forma_id,titulo_id,documento_id,observacao,status_anterior,status_novo",
  deLinha: (l) => ({
    id: l.id, data: String(l["data"]), usuarioNome: String(l["usuario_nome"] ?? ""), tipo: String(l["tipo"]),
    valor: l["valor"] == null ? null : num(l["valor"]), contaId: (l["conta_id"] as string) ?? null, formaId: (l["forma_id"] as string) ?? null,
    tituloId: (l["titulo_id"] as string) ?? null, documentoId: (l["documento_id"] as string) ?? null, observacao: String(l["observacao"] ?? ""),
    statusAnterior: (l["status_anterior"] as string) ?? null, statusNovo: (l["status_novo"] as string) ?? null,
  }),
});

export const useCadastrosFin = cad.use;
export const getCadastrosFin = cad.get;
export const useTitulos = tit.use;
export const getTitulos = tit.get;
export const useMovimentos = mov.use;
export const useHistoricoFin = hist.use;
export const garantirHistoricoFin = hist.garantir;
export const useCadastrosTipo = (tipo: TipoCadastro) => cad.use().filter((c) => c.tipo === tipo);

const FIN = ["fin_titulos", "fin_movimentos", "fin_cadastros", "fin_historico"] as const;
async function rodar<T>(fn: () => PromiseLike<{ data: T; error: unknown }>, colecoes: readonly string[] = FIN): Promise<T> {
  const { data, error } = await fn();
  if (error) throw new Error(mensagemErro(error, "Não foi possível concluir a operação financeira."));
  await atualizarDoBanco(colecoes).catch(() => undefined);
  return data;
}
const rpc = (nome: string, args: Record<string, unknown>) =>
  (supabase.rpc as unknown as (n: string, a: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>)(nome, args);

// ---------------- Ações ----------------
export async function salvarCadastro(c: Omit<Cadastro, "id"> & { id?: string | undefined }) {
  if (!["categoria", "centro"].includes(c.tipo) || c.id) exigir("financeiro", "config");
  else exigir("financeiro", "criar");
  if (!c.nome.trim()) throw new Error("Informe o nome.");
  const linha = { tipo: c.tipo, nome: c.nome.trim(), ativo: c.ativo, data: c.data as never };
  return rodar(() => (c.id ? supabase.from("fin_cadastros").update(linha).eq("id", c.id) : supabase.from("fin_cadastros").insert(linha)), ["fin_cadastros"]);
}

export interface NovoTitulo {
  tipo: "pagar" | "receber";
  descricao: string;
  vencimento: string;
  valor: number;
  clienteId?: string | null;
  documentoId?: string | null;
  categoriaId?: string | null;
  data: Record<string, unknown>;
}
export async function criarTitulo(t: NovoTitulo) {
  exigir("financeiro", "criar");
  if (!t.descricao.trim()) throw new Error("Informe a descrição.");
  if (!t.vencimento) throw new Error("Informe o vencimento.");
  if (t.valor <= 0) throw new Error("O valor final deve ser maior que zero.");
  const dup = getTitulos().find((x) => x.tipo === t.tipo && x.status !== "cancelado" && x.descricao.trim().toLowerCase() === t.descricao.trim().toLowerCase() &&
    x.vencimento === t.vencimento && Math.abs(x.valor - t.valor) < 0.01);
  if (dup && !t.data["confirmarDuplicada"]) throw new Error("DUPLICADA");
  const { confirmarDuplicada: _ignorar, ...data } = t.data;
  return rodar(() => supabase.from("fin_titulos").insert({
    tipo: t.tipo, descricao: t.descricao.trim(), vencimento: t.vencimento, valor: r2(t.valor), cliente_id: t.clienteId || null,
    documento_id: t.documentoId || null, categoria_id: t.categoriaId || null, data: data as never,
  }));
}
export async function editarTitulo(id: string, t: Partial<NovoTitulo>) {
  exigir("financeiro", "editar");
  const linha: Record<string, unknown> = {};
  if (t.descricao !== undefined) linha["descricao"] = t.descricao.trim();
  if (t.vencimento !== undefined) linha["vencimento"] = t.vencimento;
  if (t.valor !== undefined) linha["valor"] = r2(t.valor);
  if (t.categoriaId !== undefined) linha["categoria_id"] = t.categoriaId || null;
  if (t.clienteId !== undefined) linha["cliente_id"] = t.clienteId || null;
  if (t.data !== undefined) linha["data"] = t.data;
  return rodar(() => supabase.from("fin_titulos").update(linha as never).eq("id", id));
}
export async function baixarTitulo(id: string, pagamentos: Pagamento[], data: string, excesso = false) {
  exigir("financeiro", "baixar");
  return rodar(() => rpc("fin_baixar", { _titulo: id, _pagamentos: pagamentos, _data: data, _excesso: excesso }));
}
export async function estornarMovimento(id: string, motivo: string) {
  exigir("financeiro", "estornar");
  return rodar(() => rpc("fin_estornar", { _mov: id, _motivo: motivo }));
}
export async function cancelarTitulo(id: string, motivo: string) {
  exigir("financeiro", "cancelar");
  return rodar(() => rpc("fin_cancelar_titulo", { _id: id, _motivo: motivo }));
}
export async function parcelarTitulo(id: string, parcelas: number, primeiro: string) {
  exigir("financeiro", "editar");
  return rodar(() => rpc("fin_parcelar", { _id: id, _parcelas: parcelas, _primeiro: primeiro }));
}
export async function transferir(de: string, para: string, valor: number, data: string, obs: string) {
  exigir("financeiro", "editar");
  return rodar(() => rpc("fin_transferir", { _de: de, _para: para, _valor: valor, _data: data, _obs: obs }));
}
export async function ajustarSaldo(conta: string, valor: number, data: string, motivo: string) {
  exigir("financeiro", "config");
  return rodar(() => rpc("fin_ajustar", { _conta: conta, _valor: valor, _data: data, _motivo: motivo }));
}
export async function finalizarOSFinanceiro(orcId: string, pagamentos: Pagamento[], data: string, parcelas: number, vencimento: string, excesso = false) {
  exigir("financeiro", "baixar");
  return rodar(() => rpc("fin_finalizar_os", {
    _orc: orcId, _pagamentos: pagamentos, _data: data, _parcelas: parcelas, _vencimento: vencimento || null, _excesso: excesso,
  })) as Promise<{ total: number; recebido: number; pendente: number }>;
}

// ---------------- Comprovantes ----------------
const TIPOS_ARQ = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
export async function enviarComprovante(file: File): Promise<string> {
  if (!TIPOS_ARQ.includes(file.type)) throw new Error("Use PDF, PNG, JPG ou WEBP.");
  if (file.size > 5_000_000) throw new Error("Arquivo muito grande. Use até 5 MB.");
  const ext = (file.name.split(".").pop() || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
  const caminho = `comprovantes/${hojeISO().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("financeiro").upload(caminho, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(/row-level|permission/i.test(error.message) ? "Você não tem permissão para enviar comprovantes." : "Falha no envio do comprovante.");
  return caminho;
}
export async function abrirComprovante(caminho: string) {
  const { data, error } = await supabase.storage.from("financeiro").createSignedUrl(caminho, 300);
  if (error || !data) throw new Error("Não foi possível abrir o comprovante.");
  window.open(data.signedUrl, "_blank", "noopener");
}

export const diasAlerta = () => Number(getConfig().financeiro["diasVencendo"] ?? 3) || 3;
