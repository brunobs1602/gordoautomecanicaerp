import { exigir } from "./acesso";
import { z } from "zod";
import { agoraISO, createCollection, novoId } from "./store";

export interface Servico {
  id: string;
  nome: string;
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
  categoria: z.string().trim().max(60),
  descricao: z.string().trim().max(1000),
  preco: z.number({ invalid_type_error: "Valor inválido." }).min(0, "Não pode ser negativo."),
  tempoEstimado: z.string().trim().max(30),
  ativo: z.boolean(),
});

const col = createCollection<Servico>("gordo.servicos");
export const getServicos = col.get;
export const useServicos = col.use;

export function criarServico(d: ServicoInput) {
  exigir("servicos", "criar");
  const s: Servico = { ...d, id: novoId(), criadoEm: agoraISO(), atualizadoEm: agoraISO() };
  col.save([...col.get(), s]);
  return s;
}
export function atualizarServico(id: string, d: ServicoInput) {
  exigir("servicos", "editar");
  col.save(col.get().map((s) => (s.id === id ? { ...s, ...d, atualizadoEm: agoraISO() } : s)));
}
export function alterarStatusServico(id: string, ativo: boolean) {
  exigir("servicos", "inativar");
  col.save(col.get().map((s) => (s.id === id ? { ...s, ativo, atualizadoEm: agoraISO() } : s)));
}
export const servicoVazio = (): ServicoInput => ({ nome: "", categoria: "", descricao: "", preco: 0, tempoEstimado: "", ativo: true });
