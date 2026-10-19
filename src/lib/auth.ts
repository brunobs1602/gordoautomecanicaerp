import { useSyncExternalStore } from "react";

export type Role = "admin" | "funcionario";
export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

const USERS_KEY = "gordo.users";
const SESSION_KEY = "gordo.session";
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

export const hasAdmin = () => getUsers().some((u) => u.role === "admin");

export function getCurrentUser(): User | null {
  if (!isBrowser()) return null;
  const id = localStorage.getItem(SESSION_KEY);
  const u = getUsers().find((x) => x.id === id);
  return u && u.active ? u : null;
}

export async function createUser(data: { name: string; email: string; password: string; role: Role }) {
  const users = getUsers();
  const email = data.email.trim().toLowerCase();
  if (users.some((u) => u.email === email)) throw new Error("Já existe um usuário com este e-mail.");
  const user: User = {
    id: crypto.randomUUID(),
    name: data.name.trim(),
    email,
    passwordHash: await hashPassword(data.password),
    role: data.role,
    active: true,
    createdAt: new Date().toISOString(),
  };
  saveUsers([...users, user]);
  return user;
}

export async function login(email: string, password: string) {
  const u = getUsers().find((x) => x.email === email.trim().toLowerCase());
  if (!u || u.passwordHash !== (await hashPassword(password))) throw new Error("E-mail ou senha inválidos.");
  if (!u.active) throw new Error("Usuário desativado. Fale com o administrador.");
  localStorage.setItem(SESSION_KEY, u.id);
  emit();
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
  emit();
}

export function toggleUserActive(id: string) {
  saveUsers(getUsers().map((u) => (u.id === id ? { ...u, active: !u.active } : u)));
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
