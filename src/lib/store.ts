import { useSyncExternalStore } from "react";

/** Coleção simples persistida no navegador (mesmo padrão de clientes/veículos). */
export function createCollection<T>(key: string) {
  const listeners = new Set<() => void>();
  let cache: T[] | null = null;
  const empty: T[] = [];

  const get = (): T[] => {
    if (typeof window === "undefined") return empty;
    try {
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch {
      return [];
    }
  };
  const save = (list: T[]) => {
    localStorage.setItem(key, JSON.stringify(list));
    cache = null;
    listeners.forEach((l) => l());
  };
  const use = () =>
    useSyncExternalStore(
      (l) => {
        listeners.add(l);
        return () => listeners.delete(l);
      },
      () => (cache ??= get()),
      () => empty,
    );
  return { get, save, use };
}

export const agoraISO = () => new Date().toISOString();
export const novoId = () => crypto.randomUUID();
export const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const paraNumero = (v: string | number) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(String(v).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
