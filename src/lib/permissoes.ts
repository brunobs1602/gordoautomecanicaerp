import { createCollection } from "./store";

export type Acao = "ver" | "criar" | "editar" | "inativar" | "excluir" | "exportar" | "aprovar" | "reabrir" | "status" | "config";
export type Modulo =
  | "dashboard" | "clientes" | "veiculos" | "orcamentos" | "ordens" | "produtos" | "estoque"
  | "servicos" | "usuarios" | "perfis" | "configuracoes" | "relatorios";

export const ACOES: { key: Acao; label: string }[] = [
  { key: "ver", label: "Visualizar" },
  { key: "criar", label: "Criar" },
  { key: "editar", label: "Editar" },
  { key: "inativar", label: "Inativar" },
  { key: "excluir", label: "Excluir" },
  { key: "exportar", label: "Exportar/Imprimir" },
  { key: "aprovar", label: "Aprovar/Recusar" },
  { key: "reabrir", label: "Reabrir" },
  { key: "status", label: "Alterar status" },
  { key: "config", label: "Gerenciar config." },
];

const CRUD: Acao[] = ["ver", "criar", "editar", "inativar", "excluir"];
export const MODULOS: { key: Modulo; label: string; acoes: Acao[] }[] = [
  { key: "dashboard", label: "Dashboard", acoes: ["ver"] },
  { key: "clientes", label: "Clientes", acoes: [...CRUD, "exportar"] },
  { key: "veiculos", label: "Veículos", acoes: [...CRUD, "exportar"] },
  { key: "orcamentos", label: "Orçamentos", acoes: ["ver", "criar", "editar", "excluir", "exportar", "aprovar", "reabrir", "status"] },
  { key: "ordens", label: "Ordens de Serviço", acoes: ["ver", "criar", "editar", "exportar", "status"] },
  { key: "produtos", label: "Produtos", acoes: ["ver", "criar", "editar", "inativar", "excluir", "exportar"] },
  { key: "estoque", label: "Estoque", acoes: ["ver", "editar", "exportar"] },
  { key: "servicos", label: "Serviços", acoes: ["ver", "criar", "editar", "inativar", "exportar"] },
  { key: "usuarios", label: "Usuários", acoes: [...CRUD, "status"] },
  { key: "perfis", label: "Perfis de Acesso", acoes: CRUD },
  { key: "configuracoes", label: "Configurações", acoes: ["ver", "config"] },
  { key: "relatorios", label: "Relatórios", acoes: ["ver", "exportar"] },
];

export type Permissoes = Partial<Record<Modulo, Acao[]>>;
export interface Perfil {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  permissoes: Permissoes;
  criadoEm: string;
  atualizadoEm: string;
}

export const ADMIN_ID = "admin";
export const todasPermissoes = (): Permissoes => Object.fromEntries(MODULOS.map((m) => [m.key, [...m.acoes]]));

const INICIO = "2026-01-01T00:00:00.000Z";
const p = (id: string, nome: string, descricao: string, permissoes: Permissoes): Perfil => ({
  id, nome, descricao, ativo: true, permissoes, criadoEm: INICIO, atualizadoEm: INICIO,
});
export const PERFIS_PADRAO: Perfil[] = [
  p(ADMIN_ID, "Administrador", "Acesso total ao sistema.", todasPermissoes()),
  p("funcionario", "Funcionário", "Rotina da oficina, sem gestão de usuários.", {
    dashboard: ["ver"], clientes: ["ver", "criar", "editar"], veiculos: ["ver", "criar", "editar"],
    orcamentos: ["ver", "criar", "editar", "exportar", "aprovar", "reabrir", "status"],
    ordens: ["ver", "criar", "editar", "exportar", "status"], produtos: ["ver", "criar", "editar"],
    estoque: ["ver"], servicos: ["ver", "criar", "editar"],
  }),
  p("atendimento", "Atendimento", "Cadastra clientes, veículos e orçamentos.", {
    dashboard: ["ver"], clientes: ["ver", "criar", "editar"], veiculos: ["ver", "criar", "editar"],
    orcamentos: ["ver", "criar", "editar", "exportar"], ordens: ["ver"], produtos: ["ver"], servicos: ["ver"],
  }),
  p("mecanico", "Mecânico", "Consulta veículos e ordens de serviço.", {
    dashboard: ["ver"], veiculos: ["ver"], ordens: ["ver", "status"], produtos: ["ver"], estoque: ["ver"], servicos: ["ver"],
  }),
  p("financeiro", "Financeiro", "Consulta orçamentos e relatórios financeiros.", {
    dashboard: ["ver"], clientes: ["ver"], orcamentos: ["ver", "exportar"], ordens: ["ver", "exportar"], relatorios: ["ver", "exportar"],
  }),
];

/** Regra central: perfil inativo não concede nada; Administrador concede tudo. */
export function pode(perfil: Perfil | undefined | null, modulo: Modulo, acao: Acao = "ver") {
  if (!perfil || !perfil.ativo) return false;
  if (perfil.id === ADMIN_ID) return true;
  return perfil.permissoes[modulo]?.includes(acao) ?? false;
}

export function diffPermissoes(antes: Permissoes, depois: Permissoes): string[] {
  const out: string[] = [];
  for (const m of MODULOS) {
    const a = antes[m.key] ?? [];
    const d = depois[m.key] ?? [];
    const lab = (k: Acao) => ACOES.find((x) => x.key === k)?.label ?? k;
    const add = d.filter((x) => !a.includes(x)).map(lab);
    const rem = a.filter((x) => !d.includes(x)).map(lab);
    if (add.length) out.push(`${m.label}: adicionada(s) ${add.join(", ")}`);
    if (rem.length) out.push(`${m.label}: removida(s) ${rem.join(", ")}`);
  }
  return out;
}

const col = createCollection<Perfil>("perfis", {
  select: "id,nome,descricao,ativo,permissoes,criado_em,atualizado_em",
  paraLinha: (p) => ({ id: p.id, nome: p.nome, descricao: p.descricao, ativo: p.ativo, permissoes: p.permissoes }),
  deLinha: (l) => ({
    id: l.id, nome: String(l["nome"]), descricao: String(l["descricao"] ?? ""), ativo: Boolean(l["ativo"]),
    permissoes: (l["permissoes"] ?? {}) as Permissoes, criadoEm: String(l["criado_em"]), atualizadoEm: String(l["atualizado_em"]),
  }),
});
export const getPerfis = col.get;
export const salvarPerfis = col.save;
export const usePerfis = col.use;
