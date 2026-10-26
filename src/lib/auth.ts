import { supabase } from "@/integrations/supabase/client";
import { ADMIN_ID, carregarPerfis, getPerfis } from "./permissoes";
import { getConfig, validarSenha } from "./config";
import { registrar } from "./auditoria";
import { createCollection, enfileirar, limparColecoes, carregarColecoes, configurarLeituras, aguardarGravacoes, mensagemErro } from "./store";
import { lerComRecuperacao } from "./leitura";
import { podeLerColecao } from "./leituras-permitidas";
import { definirSessao, getSessao, useSessao, type User } from "./sessao";
import { criarUsuario, excluirUsuario, redefinirSenha, salvarUsuario } from "./usuarios.functions";

export type { User } from "./sessao";
export type Role = string;

// Lista de usuários: dados do perfil + vínculo com o perfil de acesso.
const col = createCollection<User>("profiles", {
  select: "id,nome,email,telefone,ativo,ultimo_acesso,criado_em,user_perfis(perfil_id)",
  deLinha: (l) => ({
    id: l.id, name: String(l["nome"]), email: String(l["email"]), phone: String(l["telefone"] ?? ""),
    active: Boolean(l["ativo"]), createdAt: String(l["criado_em"]),
    lastLogin: l["ultimo_acesso"] ? String(l["ultimo_acesso"]) : undefined,
    role: String((l["user_perfis"] as { perfil_id: string } | null)?.perfil_id ?? ""),
  }),
});
export const getUsers = col.get;
export const useUsers = col.use;

export const isAdminRole = (role: Role) => role === ADMIN_ID;
export const perfilNome = (role: Role) => getPerfis().find((p) => p.id === role)?.nome ?? "Sem perfil";

/** Tenta algumas vezes antes de desistir (a conexão pode oscilar ao abrir o sistema). */
let inicial: Promise<boolean> | null = null;
export function precisaConfiguracaoInicial() {
  if (inicial) return inicial;
  const tarefa = lerComRecuperacao(async (signal) => {
    const { data, error } = await supabase.rpc("precisa_configuracao_inicial").abortSignal(signal);
    if (error) throw error;
    return Boolean(data);
  }).catch(() => { throw new Error("Falha de conexão. Verifique a internet e tente novamente."); });
  inicial = tarefa;
  // O resultado só é reaproveitado durante a inicialização, não entre sessões.
  void tarefa.finally(() => setTimeout(() => { if (inicial === tarefa) inicial = null; }, 5_000)).catch(() => undefined);
  return tarefa;
}

const ATIVIDADE = "gordo.atividade";
export function registrarAtividade() {
  localStorage.setItem(ATIVIDADE, String(Date.now()));
}
export function sessaoExpirada() {
  const min = Number(getConfig().seguranca.sessaoMinutos) || 0;
  if (!min) return false;
  const at = Number(localStorage.getItem(ATIVIDADE) || Date.now());
  return Date.now() - at > min * 60_000;
}

let carregado: Promise<User | null> | null = null;
let epocaSessao = 0;
/** Lê a sessão e carrega todos os dados permitidos ao usuário. */
export function carregarSistema(): Promise<User | null> {
  if (carregado) return carregado;
  const epoca = epocaSessao;
  const tarefa = (async () => {
    // Sessão local primeiro (sem rede); a validação no servidor, o perfil do usuário, os perfis de acesso
    // e as tabelas liberadas a todos rodam em paralelo — uma ida ao servidor a menos na abertura.
    const { data: local } = await supabase.auth.getSession();
    const uid = local.session?.user.id;
    if (!uid) return null;
    const COMUNS = ["configuracoes", "categorias", "marcas"];
    configurarLeituras((n) => COMUNS.includes(n));
    const comuns = carregarColecoes(COMUNS).catch(() => undefined);
    const [user, p] = await Promise.all([
      lerComRecuperacao(async () => {
        const { data, error } = await supabase.auth.getUser();
        if (error && !/session missing/i.test(error.message)) throw error;
        return data.user;
      }),
      lerComRecuperacao(async (signal) => {
        const { data, error } = await supabase.from("profiles").select("id,nome,email,telefone,ativo,ultimo_acesso,criado_em,user_perfis(perfil_id)").eq("id", uid).abortSignal(signal).maybeSingle();
        if (error) throw error;
        return data;
      }),
      carregarPerfis(),
    ]);
    if (!user || user.id !== uid) return null;
    await comuns;
    if (epoca !== epocaSessao) return null;
    if (!p || !p.ativo) {
      await supabase.auth.signOut();
      return null;
    }
    const sessao: User = {
      id: p.id, name: p.nome, email: p.email, phone: p.telefone, active: p.ativo, createdAt: p.criado_em,
      lastLogin: p.ultimo_acesso ?? undefined, role: (p.user_perfis as { perfil_id: string } | null)?.perfil_id ?? "",
    };
    // Permissões já resolvidas acima; agora as consultas dependentes.
    if (epoca !== epocaSessao) return null;
    configurarLeituras((nome) => podeLerColecao(getPerfis().find((x) => x.id === (col.get().find((u) => u.id === sessao.id)?.role ?? sessao.role)), nome));
    col.definir([sessao]);
    await carregarColecoes(["profiles", "clientes", "veiculos", "produtos", "servicos", "orcamentos", "fin_cadastros", "fin_titulos", "fin_movimentos"]);
    if (epoca !== epocaSessao) return null;
    definirSessao(sessao);
    return getSessao();
  })().catch((e) => {
    if (epoca === epocaSessao) carregado = null;
    throw new Error(mensagemErro(e, "Falha ao carregar os dados do sistema. Verifique a conexão."));
  });
  carregado = tarefa;
  void tarefa.then((u) => { if (!u && carregado === tarefa) carregado = null; }).catch(() => undefined);
  return tarefa;
}

export const getCurrentUser = getSessao;
export function useCurrentUser() {
  const eu = useSessao();
  const lista = useUsers();
  return (eu && lista.find((u) => u.id === eu.id)) || eu;
}

export async function login(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) {
    if (/invalid login/i.test(error.message)) throw new Error("E-mail ou senha inválidos.");
    if (/rate|too many/i.test(error.message)) throw new Error("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
    throw new Error(mensagemErro(error, "Não foi possível entrar. Tente novamente."));
  }
  encerrarSessaoLocal();
  const u = await carregarSistema();
  if (!u) throw new Error("Usuário desativado. Fale com o administrador.");
  registrarAtividade();
  await supabase.rpc("registrar_acesso");
}

export async function logout() {
  await aguardarGravacoes();
  encerrarSessaoLocal();
  await supabase.auth.signOut();
}
/** Limpa os dados da memória ao sair. */
export function encerrarSessaoLocal() {
  carregado = null;
  epocaSessao++;
  inicial = null;
  definirSessao(null);
  limparColecoes();
}

async function chamar<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    throw new Error((e as Error).message || "Não foi possível concluir a operação.");
  }
}

export async function createUser(data: { name: string; email: string; password: string; role: Role; phone?: string; active?: boolean }) {
  if (getUsers().some((u) => u.email === data.email.trim().toLowerCase())) throw new Error("Já existe um usuário com este e-mail.");
  if (!data.role) throw new Error("Selecione um perfil de acesso.");
  const erro = validarSenha(data.password);
  if (erro) throw new Error(erro);
  await chamar(() => criarUsuario({ data: { ...data, phone: data.phone ?? "", active: data.active ?? true } }));
  await col.carregar();
  registrar({ tipo: "Usuário criado", alvo: data.name, descricao: `Perfil: ${perfilNome(data.role)} · ${data.email.toLowerCase()}` });
}

const ativosAdmin = (users: User[]) => users.filter((u) => u.active && isAdminRole(u.role));

export async function updateUser(id: string, data: { name: string; email: string; role: Role; phone: string; active: boolean }) {
  const users = getUsers();
  const u = users.find((x) => x.id === id);
  if (!u) throw new Error("Usuário não encontrado.");
  const novo = { ...u, ...data, name: data.name.trim(), email: data.email.trim().toLowerCase() };
  if (ativosAdmin(users.map((x) => (x.id === id ? novo : x))).length === 0) throw new Error("O sistema precisa de pelo menos um administrador ativo.");
  await chamar(() => salvarUsuario({ data: { id, name: novo.name, email: novo.email, phone: novo.phone, role: novo.role, active: novo.active } }));
  await col.carregar();
  const mud: string[] = [];
  if (u.name !== novo.name) mud.push(`nome: ${u.name} → ${novo.name}`);
  if (u.email !== novo.email) mud.push(`e-mail: ${u.email} → ${novo.email}`);
  if (u.phone !== novo.phone) mud.push("telefone alterado");
  if (mud.length) registrar({ tipo: "Usuário editado", alvo: novo.name, descricao: mud.join("; ") });
  if (u.role !== novo.role) registrar({ tipo: "Perfil de usuário alterado", alvo: novo.name, descricao: `${perfilNome(u.role)} → ${perfilNome(novo.role)}` });
  if (u.active !== novo.active) registrar({ tipo: novo.active ? "Usuário ativado" : "Usuário inativado", alvo: novo.name, descricao: "" });
}

export async function setUserActive(id: string, active: boolean) {
  const u = getUsers().find((x) => x.id === id);
  if (u) await updateUser(id, { name: u.name, email: u.email, role: u.role, phone: u.phone, active });
}

export async function deleteUser(id: string) {
  const users = getUsers();
  const u = users.find((x) => x.id === id);
  if (!u) return;
  if (u.active && isAdminRole(u.role) && ativosAdmin(users.filter((x) => x.id !== id)).length === 0)
    throw new Error("Não é possível excluir o último administrador ativo.");
  await chamar(() => excluirUsuario({ data: { id } }));
  await col.carregar();
  registrar({ tipo: "Usuário excluído", alvo: u.name, descricao: u.email });
}

export async function resetPassword(id: string, password: string) {
  const erro = validarSenha(password);
  if (erro) throw new Error(erro);
  const u = getUsers().find((x) => x.id === id);
  await chamar(() => redefinirSenha({ data: { id, password } }));
  registrar({ tipo: "Senha redefinida", alvo: u?.name ?? "", descricao: "Senha redefinida pelo administrador." });
}

/** Transfere os usuários de um perfil para outro (antes de excluir o perfil). */
export function transferirUsuarios(de: Role, para: Role) {
  col.definir(getUsers().map((u) => (u.role === de ? { ...u, role: para } : u)));
  enfileirar(async () => {
    const { error } = await supabase.from("user_perfis").update({ perfil_id: para }).eq("perfil_id", de);
    if (error) throw error;
  }, () => void col.carregar());
}
