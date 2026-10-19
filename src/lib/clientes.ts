import { exigir } from "./acesso";
import { createCollection } from "./store";
import { z } from "zod";
import { soDigitos, validarCEP, validarCNPJ, validarCPF, validarTelefone } from "./validacao";

export type TipoPessoa = "PF" | "PJ";

export interface Cliente {
  id: string;
  tipo: TipoPessoa;
  nome: string;
  nomeFantasia: string;
  documento: string; // CPF/CNPJ (somente dígitos)
  rgIe: string;
  dataNascimento: string;
  email: string;
  telefone: string;
  telefone2: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  pais: string;
  observacoes: string;
  origem: string;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export type ClienteInput = Omit<Cliente, "id" | "criadoEm" | "atualizadoEm">;

export const ORIGENS = ["Indicação", "Instagram", "WhatsApp", "Google", "Passou na frente", "Outro"];
export const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");

const opcional = z.string().trim().max(200);

export const clienteSchema = z
  .object({
    tipo: z.enum(["PF", "PJ"]),
    nome: z.string().trim().min(2, "Informe o nome ou razão social.").max(150, "Máximo de 150 caracteres."),
    nomeFantasia: opcional,
    documento: z.string().trim().min(1, "Informe o CPF ou CNPJ."),
    rgIe: z.string().trim().max(30),
    dataNascimento: z.string(),
    email: z.string().trim().max(255).refine((v) => !v || z.string().email().safeParse(v).success, "E-mail inválido."),
    telefone: z.string().refine((v) => !v || validarTelefone(v), "Telefone inválido. Use DDD + número."),
    telefone2: z.string().refine((v) => !v || validarTelefone(v), "Telefone inválido. Use DDD + número."),
    cep: z.string().refine((v) => !v || validarCEP(v), "CEP inválido. Deve ter 8 dígitos."),
    logradouro: opcional,
    numero: z.string().trim().max(20),
    complemento: opcional,
    bairro: opcional,
    cidade: opcional,
    estado: z.string().max(2),
    pais: z.string().trim().max(60),
    observacoes: z.string().trim().max(2000, "Máximo de 2000 caracteres."),
    origem: z.string().max(60),
    ativo: z.boolean(),
  })
  .superRefine((d, ctx) => {
    if (!d.documento) return;
    const ok = d.tipo === "PF" ? validarCPF(d.documento) : validarCNPJ(d.documento);
    if (!ok) ctx.addIssue({ code: "custom", path: ["documento"], message: d.tipo === "PF" ? "CPF inválido." : "CNPJ inválido." });
  });

const col = createCollection<Cliente>("clientes", { colunas: (c) => ({ documento: c.documento, ativo: c.ativo }) });
export const getClientes = col.get;
const salvar = col.save;

export function documentoDuplicado(list: Cliente[], documento: string, ignorarId?: string) {
  const d = soDigitos(documento);
  return list.some((c) => c.documento === d && c.id !== ignorarId);
}

function normalizar(input: ClienteInput): ClienteInput {
  return {
    ...input,
    documento: soDigitos(input.documento),
    email: input.email.trim().toLowerCase(),
    pais: input.pais || "Brasil",
  };
}

export function criarCliente(input: ClienteInput) {
  exigir("clientes", "criar");
  const list = getClientes();
  if (documentoDuplicado(list, input.documento)) throw new Error("Já existe um cliente com este CPF/CNPJ.");
  const agora = new Date().toISOString();
  const c: Cliente = { ...normalizar(input), id: crypto.randomUUID(), criadoEm: agora, atualizadoEm: agora };
  salvar([...list, c]);
  return c;
}

export function atualizarCliente(id: string, input: ClienteInput) {
  exigir("clientes", "editar");
  const list = getClientes();
  if (documentoDuplicado(list, input.documento, id)) throw new Error("Já existe um cliente com este CPF/CNPJ.");
  salvar(list.map((c) => (c.id === id ? { ...c, ...normalizar(input), atualizadoEm: new Date().toISOString() } : c)));
}

export function alterarStatusCliente(id: string, ativo: boolean) {
  exigir("clientes", "inativar");
  salvar(getClientes().map((c) => (c.id === id ? { ...c, ativo, atualizadoEm: new Date().toISOString() } : c)));
}

export function excluirCliente(id: string) {
  exigir("clientes", "excluir");
  salvar(getClientes().filter((c) => c.id !== id));
}

export const useClientes = col.use;

export function clienteVazio(): ClienteInput {
  return {
    tipo: "PF", nome: "", nomeFantasia: "", documento: "", rgIe: "", dataNascimento: "", email: "",
    telefone: "", telefone2: "", cep: "", logradouro: "", numero: "", complemento: "", bairro: "",
    cidade: "", estado: "", pais: "Brasil", observacoes: "", origem: "", ativo: true,
  };
}
