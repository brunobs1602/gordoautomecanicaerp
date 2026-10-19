import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/** Traduz erros do banco para mensagens claras, sem detalhes técnicos. */
export function mensagemErro(e: unknown, padrao = "Não foi possível salvar. Tente novamente."): string {
  const err = e as { code?: string; message?: string } | null;
  const msg = err?.message ?? "";
  if (err?.code === "23505") return "Já existe um registro com estes dados (duplicado).";
  if (err?.code === "23503") return "Este registro está vinculado a outros e não pode ser alterado assim.";
  if (err?.code === "42501" || /row-level security|permission denied/i.test(msg)) return "Você não tem permissão para realizar esta ação.";
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return "Falha de conexão. Verifique a internet e tente novamente.";
  if (err?.code === "P0001" && msg) return msg; // mensagens de regra de negócio do banco (já em português)
  return padrao;
}

// Fila única: as gravações acontecem na ordem em que foram feitas (ex.: cliente antes do veículo).
let fila: Promise<unknown> = Promise.resolve();
let pendentes = 0;
const pendListeners = new Set<() => void>();
const avisarPend = () => pendListeners.forEach((l) => l());
export function enfileirar(fn: () => Promise<void>, aoFalhar?: () => void) {
  pendentes++;
  avisarPend();
  fila = fila
    .then(fn)
    .catch((e) => {
      toast.error(mensagemErro(e));
      aoFalhar?.();
    })
    .finally(() => {
      pendentes--;
      avisarPend();
    });
  return fila;
}
export const aguardarGravacoes = () => fila;
export function useGravando() {
  return useSyncExternalStore(
    (l) => {
      pendListeners.add(l);
      return () => pendListeners.delete(l);
    },
    () => pendentes > 0,
    () => false,
  );
}

type Linha = Record<string, unknown> & { id: string };
interface Opcoes<T> {
  /** Colunas próprias da tabela (além de id e data). */
  colunas?: (t: T) => Record<string, unknown>;
  /** Tabelas com colunas próprias em vez do campo "data". */
  paraLinha?: (t: T) => Linha;
  deLinha?: (l: Linha) => T;
  select?: string;
}

const coletores: { carregar: () => Promise<void>; limpar: () => void }[] = [];
export const carregarColecoes = () => Promise.all(coletores.map((c) => c.carregar()));
export const limparColecoes = () => coletores.forEach((c) => c.limpar());

/** Coleção salva no Lovable Cloud. Leitura instantânea do cache; gravação em segundo plano. */
export function createCollection<T extends { id: string }>(tabela: string, op: Opcoes<T> = {}) {
  const listeners = new Set<() => void>();
  let cache: T[] = [];
  const emit = () => listeners.forEach((l) => l());
  const tab = () => supabase.from(tabela as "clientes");
  const paraLinha = op.paraLinha ?? ((t: T) => {
    const { id, ...resto } = t;
    return { id, data: resto, ...(op.colunas?.(t) ?? {}) } as Linha;
  });
  const deLinha = op.deLinha ?? ((l: Linha) => ({ ...(l["data"] as object), id: l.id }) as T);

  const carregar = async () => {
    const { data, error } = await supabase.from(tabela as "clientes").select(op.select ?? "id,data").limit(10000);
    if (error) throw error;
    cache = ((data ?? []) as unknown as Linha[]).map(deLinha);
    emit();
  };
  const recarregar = () => void carregar().catch(() => toast.error("Falha ao carregar dados."));
  coletores.push({ carregar, limpar: () => { cache = []; emit(); } });

  const get = (): T[] => cache;
  const save = (list: T[]) => {
    const antes = new Map(cache.map((x) => [x.id, JSON.stringify(x)]));
    const alterados = list.filter((x) => antes.get(x.id) !== JSON.stringify(x));
    const ids = new Set(list.map((x) => x.id));
    const removidos = cache.filter((x) => !ids.has(x.id)).map((x) => x.id);
    cache = list;
    emit();
    if (alterados.length)
      enfileirar(async () => {
        const { error } = await tab().upsert(alterados.map(paraLinha) as never);
        if (error) throw error;
      }, recarregar);
    if (removidos.length)
      enfileirar(async () => {
        const { error } = await tab().delete().in("id", removidos);
        if (error) throw error;
      }, recarregar);
  };
  const use = () =>
    useSyncExternalStore(
      (l) => {
        listeners.add(l);
        return () => listeners.delete(l);
      },
      get,
      get,
    );
  /** Atualiza só o cache local (dados já gravados por outro caminho). */
  const definir = (list: T[]) => { cache = list; emit(); };
  return { get, save, use, carregar, definir };
}

export const agoraISO = () => new Date().toISOString();
export const novoId = () => crypto.randomUUID();
export const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const paraNumero = (v: string | number) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(String(v).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
