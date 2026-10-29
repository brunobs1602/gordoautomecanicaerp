import { exigir } from "./acesso";
import { getConfig } from "./config";
import { createCollection } from "./store";
import { uuid } from "./uuid";
import { z } from "zod";

// Um cliente pode ter vários veículos; cada veículo tem um único proprietário principal (clienteId).
// Próximo módulo (Ordens de Serviço) deve referenciar veículos por `id`.
export interface Veiculo {
  id: string;
  clienteId: string;
  placa: string; // normalizada: maiúsculas, sem hífen
  renavam: string;
  chassi: string;
  marca: string;
  modelo: string;
  versao: string;
  anoFabricacao: string;
  anoModelo: string;
  cor: string;
  tipo: string;
  categoria: string;
  combustivel: string;
  quilometragem: string;
  portas: string;
  cambio: string;
  observacoes: string;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}
export type VeiculoInput = Omit<Veiculo, "id" | "criadoEm" | "atualizadoEm">;

export const TIPOS = ["Carro", "Moto", "Caminhão", "Van", "Utilitário", "Outro"];
export const CATEGORIAS = ["Particular", "Empresa", "Táxi", "Aplicativo", "Outro"];
export const COMBUSTIVEIS = ["Gasolina", "Etanol", "Flex", "Diesel", "Elétrico", "Híbrido", "Outro"];
export const CAMBIOS = ["Manual", "Automático", "Automatizado"];

export const normalizarPlaca = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
export const formatarPlaca = (v: string) => {
  const p = normalizarPlaca(v);
  return /^[A-Z]{3}\d{4}$/.test(p) ? `${p.slice(0, 3)}-${p.slice(3)}` : p;
};
/** Aceita padrão antigo (ABC1234 / ABC-1234) e Mercosul (ABC1D23). */
export const validarPlaca = (v: string) => /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(normalizarPlaca(v));
export const normalizarChassi = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 17);

export function validarAno(v: string, maxExtra = 1) {
  if (!/^\d{4}$/.test(v)) return false;
  const n = Number(v);
  return n >= 1900 && n <= new Date().getFullYear() + maxExtra;
}

export function regrasVeiculo() {
  const c = getConfig().cadastros;
  return { placa: c.exigirPlaca !== false, km: c.exigirKm === true };
}

export const veiculoSchema = z
  .object({
    clienteId: z.string().min(1, "Selecione o cliente proprietário."),
    placa: z.string().refine((v) => !v || validarPlaca(v), "Placa inválida. Use ABC-1234 ou ABC1D23."),
    renavam: z.string().refine((v) => !v || /^\d{9,11}$/.test(v), "Renavam deve ter de 9 a 11 dígitos."),
    chassi: z.string().refine((v) => !v || v.length === 17, "Chassi deve ter 17 caracteres."),
    marca: z.string().trim().max(60),
    modelo: z.string().trim().max(80),
    versao: z.string().trim().max(80),
    anoFabricacao: z.string().refine((v) => !v || validarAno(v, 0), "Ano de fabricação inválido."),
    anoModelo: z.string().refine((v) => !v || validarAno(v, 1), "Ano do modelo inválido."),
    cor: z.string().trim().max(40),
    tipo: z.string(),
    categoria: z.string(),
    combustivel: z.string(),
    quilometragem: z.string().refine((v) => !v || (/^\d+$/.test(v) && Number(v) >= 0), "Quilometragem não pode ser negativa."),
    portas: z.string().refine((v) => !v || /^\d{1,2}$/.test(v), "Número de portas inválido."),
    cambio: z.string(),
    observacoes: z.string().trim().max(2000, "Máximo de 2000 caracteres."),
    ativo: z.boolean(),
  })
  .superRefine((d, ctx) => {
    const r = regrasVeiculo();
    if (r.placa && !d.placa) ctx.addIssue({ code: "custom", path: ["placa"], message: "A placa é obrigatória." });
    if (r.km && !d.quilometragem) ctx.addIssue({ code: "custom", path: ["quilometragem"], message: "A quilometragem é obrigatória." });
    if (d.anoFabricacao && d.anoModelo && Number(d.anoModelo) < Number(d.anoFabricacao))
      ctx.addIssue({ code: "custom", path: ["anoModelo"], message: "Ano do modelo não pode ser menor que o de fabricação." });
    if (d.anoFabricacao && d.anoModelo && Number(d.anoModelo) > Number(d.anoFabricacao) + 1)
      ctx.addIssue({ code: "custom", path: ["anoModelo"], message: "Ano do modelo deve ser no máximo 1 ano após a fabricação." });
  });

// O vínculo e o status vêm das colunas da tabela (fonte confiável); campos ausentes viram vazio.
const col = createCollection<Veiculo>("veiculos", {
  colunas: (v) => ({ cliente_id: v.clienteId, placa: v.placa, ativo: v.ativo }),
  deLinha: (l) => {
    const d = (l["data"] ?? {}) as Partial<Veiculo>;
    const base = { ...veiculoVazio(), ...Object.fromEntries(Object.entries(d).filter(([, v]) => v != null)) } as VeiculoInput;
    return {
      ...base,
      id: l.id,
      clienteId: String(l["cliente_id"] ?? base.clienteId ?? ""),
      placa: String(l["placa"] ?? base.placa ?? ""),
      ativo: typeof l["ativo"] === "boolean" ? (l["ativo"] as boolean) : base.ativo !== false,
      criadoEm: d.criadoEm || String(l["criado_em"] ?? ""),
      atualizadoEm: d.atualizadoEm || String(l["atualizado_em"] ?? ""),
    };
  },
  select: "id,data,cliente_id,placa,ativo,criado_em,atualizado_em",
});
export const getVeiculos = col.get;
const salvar = col.save;

export function verificarDuplicidade(list: Veiculo[], d: { placa: string; chassi: string }, ignorarId?: string) {
  const placa = normalizarPlaca(d.placa);
  const chassi = normalizarChassi(d.chassi);
  if (placa && list.some((v) => v.id !== ignorarId && v.placa === placa)) return "Já existe um veículo com esta placa.";
  if (chassi && list.some((v) => v.id !== ignorarId && v.chassi === chassi)) return "Já existe um veículo com este chassi.";
  return null;
}

function normalizar(d: VeiculoInput): VeiculoInput {
  return { ...d, placa: normalizarPlaca(d.placa), chassi: normalizarChassi(d.chassi) };
}

export function criarVeiculo(d: VeiculoInput, clienteExiste: (id: string) => boolean) {
  exigir("veiculos", "criar");
  if (!clienteExiste(d.clienteId)) throw new Error("Cliente proprietário não encontrado.");
  const list = getVeiculos();
  const dup = verificarDuplicidade(list, d);
  if (dup) throw new Error(dup);
  const agora = new Date().toISOString();
  const v: Veiculo = { ...normalizar(d), id: uuid(), criadoEm: agora, atualizadoEm: agora };
  salvar([...list, v]);
  return v;
}

export function atualizarVeiculo(id: string, d: VeiculoInput, clienteExiste: (id: string) => boolean) {
  exigir("veiculos", "editar");
  if (!clienteExiste(d.clienteId)) throw new Error("Cliente proprietário não encontrado.");
  const list = getVeiculos();
  const dup = verificarDuplicidade(list, d, id);
  if (dup) throw new Error(dup);
  salvar(list.map((v) => (v.id === id ? { ...v, ...normalizar(d), atualizadoEm: new Date().toISOString() } : v)));
}

export function alterarProprietario(id: string, clienteId: string, clienteExiste: (id: string) => boolean) {
  exigir("veiculos", "editar");
  if (!clienteExiste(clienteId)) throw new Error("Cliente proprietário não encontrado.");
  salvar(getVeiculos().map((v) => (v.id === id ? { ...v, clienteId, atualizadoEm: new Date().toISOString() } : v)));
}

export function alterarStatusVeiculo(id: string, ativo: boolean) {
  exigir("veiculos", "inativar");
  salvar(getVeiculos().map((v) => (v.id === id ? { ...v, ativo, atualizadoEm: new Date().toISOString() } : v)));
}

export function getVeiculosDoCliente(clienteId: string): Veiculo[] {
  return getVeiculos().filter((v) => v.clienteId === clienteId);
}

export const useVeiculos = col.use;

export function veiculoVazio(clienteId = ""): VeiculoInput {
  return {
    clienteId, placa: "", renavam: "", chassi: "", marca: "", modelo: "", versao: "", anoFabricacao: "",
    anoModelo: "", cor: "", tipo: "Carro", categoria: "Particular", combustivel: "Flex", quilometragem: "",
    portas: "", cambio: "Manual", observacoes: "", ativo: true,
  };
}

export function renomearMarcaVeiculos(antigo: string, novo: string) {
  const l = getVeiculos();
  if (l.some((v) => v.marca === antigo)) salvar(l.map((v) => (v.marca === antigo ? { ...v, marca: novo, atualizadoEm: new Date().toISOString() } : v)));
}
