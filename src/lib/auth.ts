import { useSyncExternalStore } from "react";
import { ADMIN_ID, getPerfis } from "./permissoes";
import { getConfig, validarSenha } from "./config";
import { registrar } from "./auditoria";

/** Id do perfil de acesso (ver permissoes.ts). "admin" e "funcionario" vêm de versões anteriores. */
export type Role = string;
export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  phone?: string;
  active: boolean;
  createdAt: string;
  lastLogin?: string;
  failedAttempts?: number;
  mustChangePassword?: boolean;
}

const USERS_KEY = "gordo.users";
const SESSION_KEY = "gordo.session";
const SESSION_AT = "gordo.session.at";
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const isBrowser = () => typeof window !== "undefined";

export function getUsers(): User[] {
  if (!isBrowser()) return [];
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveUsers(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  cachedUsers = null;
  emit();
}

export async function hashPassword(pw: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("gordo:" + pw));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const isAdminRole = (role: Role) => role === ADMIN_ID;
export const hasAdmin = () => getUsers().some((u) => isAdminRole(u.role));
export const perfilNome = (role: Role) => getPerfis().find((p) => p.id === role)?.nome ?? "Sem perfil";

function sessaoExpirada() {
  const min = Number(getConfig().seguranca.sessaoMinutos) || 0;
  if (!min) return false;
  const at = Number(localStorage.getItem(SESSION_AT) || 0);
  return Date.now() - at > min * 60_000;
}

export function getCurrentUser(): User | null {
  if (!isBrowser()) return null;
  const id = localStorage.getItem(SESSION_KEY);
  if (id && sessaoExpirada()) {
    logout();
    return null;
  }
  const u = getUsers().find((x) => x.id === id);
  if (u) localStorage.setItem(SESSION_AT, String(Date.now()));
  return u && u.active ? u : null;
}

const ativosAdmin = (users: User[]) => users.filter((u) => u.active && isAdminRole(u.role));

export async function createUser(data: { name: string; email: string; password: string; role: Role; phone?: string; active?: boolean }) {
  const users = getUsers();
  const email = data.email.trim().toLowerCase();
  if (users.some((u) => u.email === email)) throw new Error("Já existe um usuário com este e-mail.");
  if (!data.role) throw new Error("Selecione um perfil de acesso.");
  const erroSenha = validarSenha(data.password);
  if (erroSenha) throw new Error(erroSenha);
  const user: User = {
    id: crypto.randomUUID(),
    name: data.name.trim(),
    email,
    passwordHash: await hashPassword(data.password),
    role: data.role,
    phone: data.phone ?? "",
    active: data.active ?? true,
    createdAt: new Date().toISOString(),
    mustChangePassword: users.length > 0 && Boolean(getConfig().seguranca.trocarSenha),
  };
  saveUsers([...users, user]);
  if (users.length > 0) registrar({ tipo: "Usuário criado", alvo: user.name, descricao: `Perfil: ${perfilNome(user.role)} · ${email}` });
  return user;
}

export function updateUser(id: string, data: { name: string; email: string; role: Role; phone: string; active: boolean }) {
  const users = getUsers();
  const u = users.find((x) => x.id === id);
  if (!u) throw new Error("Usuário não encontrado.");
  const email = data.email.trim().toLowerCase();
  if (users.some((x) => x.email === email && x.id !== id)) throw new Error("Já existe um usuário com este e-mail.");
  const novo = { ...u, ...data, name: data.name.trim(), email };
  const lista = users.map((x) => (x.id === id ? novo : x));
  if (ativosAdmin(users).length > 0 && ativosAdmin(lista).length === 0)
    throw new Error("O sistema precisa de pelo menos um administrador ativo.");
  saveUsers(lista);
  const mud: string[] = [];
  if (u.name !== novo.name) mud.push(`nome: ${u.name} → ${novo.name}`);
  if (u.email !== novo.email) mud.push(`e-mail: ${u.email} → ${novo.email}`);
  if ((u.phone ?? "") !== novo.phone) mud.push("telefone alterado");
  if (mud.length) registrar({ tipo: "Usuário editado", alvo: novo.name, descricao: mud.join("; ") });
  if (u.role !== novo.role) registrar({ tipo: "Perfil de usuário alterado", alvo: novo.name, descricao: `${perfilNome(u.role)} → ${perfilNome(novo.role)}` });
  if (u.active !== novo.active) registrar({ tipo: novo.active ? "Usuário ativado" : "Usuário inativado", alvo: novo.name, descricao: "" });
}

export function setUserActive(id: string, active: boolean) {
  const u = getUsers().find((x) => x.id === id);
  if (!u) return;
  updateUser(id, { name: u.name, email: u.email, role: u.role, phone: u.phone ?? "", active });
}
export const toggleUserActive = (id: string) => {
  const u = getUsers().find((x) => x.id === id);
  if (u) setUserActive(id, !u.active);
};

export function deleteUser(id: string) {
  const users = getUsers();
  const u = users.find((x) => x.id === id);
  if (!u) return;
  const lista = users.filter((x) => x.id !== id);
  if (u.active && isAdminRole(u.role) && ativosAdmin(lista).length === 0)
    throw new Error("Não é possível excluir o último administrador ativo.");
  saveUsers(lista);
  registrar({ tipo: "Usuário excluído", alvo: u.name, descricao: u.email });
}

export async function resetPassword(id: string, password: string) {
  const erro = validarSenha(password);
  if (erro) throw new Error(erro);
  const hash = await hashPassword(password);
  const users = getUsers();
  const u = users.find((x) => x.id === id);
  if (!u) throw new Error("Usuário não encontrado.");
  saveUsers(users.map((x) => (x.id === id ? { ...x, passwordHash: hash, failedAttempts: 0, mustChangePassword: Boolean(getConfig().seguranca.trocarSenha) } : x)));
  registrar({ tipo: "Senha redefinida", alvo: u.name, descricao: "Senha redefinida pelo administrador." });
}

export async function changeOwnPassword(id: string, password: string) {
  const erro = validarSenha(password);
  if (erro) throw new Error(erro);
  const hash = await hashPassword(password);
  saveUsers(getUsers().map((x) => (x.id === id ? { ...x, passwordHash: hash, mustChangePassword: false } : x)));
}

/** Transfere os usuários de um perfil para outro (antes de excluir o perfil). */
export function transferirUsuarios(de: Role, para: Role) {
  saveUsers(getUsers().map((u) => (u.role === de ? { ...u, role: para } : u)));
}

export async function login(email: string, password: string) {
  const users = getUsers();
  const u = users.find((x) => x.email === email.trim().toLowerCase());
  const sec = getConfig().seguranca;
  const max = Number(sec.maxTentativas) || 5;
  if (u && sec.bloquearTentativas && (u.failedAttempts ?? 0) >= max)
    throw new Error("Usuário bloqueado por excesso de tentativas. Peça ao administrador para redefinir a senha.");
  if (!u || u.passwordHash !== (await hashPassword(password))) {
    if (u) saveUsers(users.map((x) => (x.id === u.id ? { ...x, failedAttempts: (x.failedAttempts ?? 0) + 1 } : x)));
    throw new Error("E-mail ou senha inválidos.");
  }
  if (!u.active) throw new Error("Usuário desativado. Fale com o administrador.");
  saveUsers(users.map((x) => (x.id === u.id ? { ...x, failedAttempts: 0, lastLogin: new Date().toISOString() } : x)));
  localStorage.setItem(SESSION_KEY, u.id);
  localStorage.setItem(SESSION_AT, String(Date.now()));
  emit();
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_AT);
  emit();
}

let cachedUsers: User[] | null = null;
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export function useUsers() {
  return useSyncExternalStore(
    subscribe,
    () => (cachedUsers ??= getUsers()),
    () => [] as User[],
  );
}
export function useCurrentUser() {
  const users = useUsers();
  const id = isBrowser() ? localStorage.getItem(SESSION_KEY) : null;
  const u = users.find((x) => x.id === id);
  return u && u.active ? u : null;
}
