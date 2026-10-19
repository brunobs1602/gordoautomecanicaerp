import { useSyncExternalStore } from "react";

/** Usuário do sistema (a senha fica apenas no login seguro do Lovable Cloud). */
export interface User {
  id: string;
  name: string;
  email: string;
  role: string; // id do perfil de acesso
  phone: string;
  active: boolean;
  createdAt: string;
  lastLogin?: string | undefined;
}

let atual: User | null = null;
const listeners = new Set<() => void>();
export const getSessao = () => atual;
export function definirSessao(u: User | null) {
  atual = u;
  listeners.forEach((l) => l());
}
export function useSessao() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getSessao,
    () => null,
  );
}
