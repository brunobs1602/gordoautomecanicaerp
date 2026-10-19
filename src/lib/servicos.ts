import { exigir } from "./acesso";
import { z } from "zod";
import { agoraISO, createCollection, novoId } from "./store";
import { proximoCodigo } from "./moeda";

export interface Servico {
  id: string;
  nome: string;
  codigo: string;
  categoria: string;
  descricao: string;
  preco: number;
  tempoEstimado: string; // ex.: "1h30"
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}
export type ServicoInput = Omit<Servico, "id" | "criadoEm" | "atualizadoEm">;

export const servicoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do serviço.").max(120),
  codigo: z.string().trim().max(40),
  categoria: z.string().trim().max(60),
  descricao: z.string().trim().max(1000),
  preco: z.number({ invalid_type_error: "Valor inválido." }).min(0, "Não pode ser negativo."),
  tempoEstimado: z.string().trim().max(30),
  ativo: z.boolean(),
});

const col = createCollection<Servico>("servicos", {
  colunas: (s) => ({ ativo: s.ativo }),
  deLinha: (l) => ({ codigo: "", ...(l["data"] as object), id: l.id }) as Servico,
});
export const proximoCodigoServico = () => proximoCodigo("SERV", col.get().map((s) => s.codigo));
function checarCodigo(codigo: string, ignorar?: string) {
  const c = codigo.trim().toUpperCase();
  if (c && col.get().some((s) => s.id !== ignorar && (s.codigo ?? "").toUpperCase() === c)) throw new Error("Já existe um serviço com este código.");
}
export const getServicos = col.get;
export const useServicos = col.use;

export function criarServico(d: ServicoInput) {
  exigir("servicos", "criar");
  if (!d.codigo.trim()) d = { ...d, codigo: proximoCodigoServico() };
  checarCodigo(d.codigo);
  const s: Servico = { ...d, id: novoId(), criadoEm: agoraISO(), atualizadoEm: agoraISO() };
  col.save([...col.get(), s]);
  return s;
}
export function atualizarServico(id: string, d: ServicoInput) {
  exigir("servicos", "editar");
  if (!d.codigo.trim()) d = { ...d, codigo: col.get().find((s) => s.id === id)?.codigo || proximoCodigoServico() };
  checarCodigo(d.codigo, id);
  col.save(col.get().map((s) => (s.id === id ? { ...s, ...d, atualizadoEm: agoraISO() } : s)));
}
export function alterarStatusServico(id: string, ativo: boolean) {
  exigir("servicos", "inativar");
  col.save(col.get().map((s) => (s.id === id ? { ...s, ativo, atualizadoEm: agoraISO() } : s)));
}
export const servicoVazio = (): ServicoInput => ({ nome: "", codigo: proximoCodigoServico(), categoria: "", descricao: "", preco: 0, tempoEstimado: "", ativo: true });

/** Atualiza o nome da categoria nos serviços que a usam. */
export function renomearCategoriaServicos(antigo: string, novo: string) {
  const l = col.get();
  if (l.some((s) => s.categoria === antigo)) col.save(l.map((s) => (s.categoria === antigo ? { ...s, categoria: novo, atualizadoEm: agoraISO() } : s)));
}
