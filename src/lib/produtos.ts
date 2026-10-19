import { exigir } from "./acesso";
import { z } from "zod";
import { agoraISO, createCollection, novoId } from "./store";

export interface Produto {
  id: string;
  nome: string;
  codigo: string;
  codigoBarras: string;
  categoria: string;
  marca: string;
  unidade: string;
  descricao: string;
  custo: number;
  preco: number;
  estoque: number;
  estoqueMinimo: number;
  localizacao: string;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}
export type ProdutoInput = Omit<Produto, "id" | "criadoEm" | "atualizadoEm">;

export const UNIDADES = ["UN", "PC", "JG", "KIT", "L", "ML", "KG", "M", "CX"];

const valor = z.number({ invalid_type_error: "Valor inválido." }).min(0, "Não pode ser negativo.");
export const produtoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do produto.").max(120),
  codigo: z.string().trim().max(40),
  codigoBarras: z.string().trim().max(20).refine((v) => !v || /^\d{8,14}$/.test(v), "Código de barras deve ter de 8 a 14 dígitos."),
  categoria: z.string().trim().max(60),
  marca: z.string().trim().max(60),
  unidade: z.string().min(1),
  descricao: z.string().trim().max(1000),
  custo: valor,
  preco: valor,
  estoque: valor,
  estoqueMinimo: valor,
  localizacao: z.string().trim().max(60),
  ativo: z.boolean(),
});

const col = createCollection<Produto>("gordo.produtos");
export const getProdutos = col.get;
export const useProdutos = col.use;

export const estoqueBaixo = (p: Pick<Produto, "estoque" | "estoqueMinimo">) => p.estoqueMinimo > 0 && p.estoque < p.estoqueMinimo;

function checarCodigo(list: Produto[], codigo: string, ignorar?: string) {
  const c = codigo.trim().toUpperCase();
  if (c && list.some((p) => p.id !== ignorar && p.codigo.toUpperCase() === c)) throw new Error("Já existe um produto com este código.");
}

export function criarProduto(d: ProdutoInput) {
  exigir("produtos", "criar");
  const list = col.get();
  checarCodigo(list, d.codigo);
  const p: Produto = { ...d, id: novoId(), criadoEm: agoraISO(), atualizadoEm: agoraISO() };
  col.save([...list, p]);
  return p;
}
export function atualizarProduto(id: string, d: ProdutoInput) {
  exigir("produtos", "editar");
  const list = col.get();
  checarCodigo(list, d.codigo, id);
  col.save(list.map((p) => (p.id === id ? { ...p, ...d, atualizadoEm: agoraISO() } : p)));
}
export function alterarStatusProduto(id: string, ativo: boolean) {
  exigir("produtos", "inativar");
  col.save(col.get().map((p) => (p.id === id ? { ...p, ativo, atualizadoEm: agoraISO() } : p)));
}

export const produtoVazio = (): ProdutoInput => ({
  nome: "", codigo: "", codigoBarras: "", categoria: "", marca: "", unidade: "UN", descricao: "",
  custo: 0, preco: 0, estoque: 0, estoqueMinimo: 0, localizacao: "", ativo: true,
});

// Futuro: baixa de estoque quando a ordem de serviço for aprovada/finalizada.
// export function baixarEstoque(itens: { produtoId: string; quantidade: number }[]) {}
