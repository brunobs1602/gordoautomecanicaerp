import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lerComRecuperacao } from "./leitura";

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
export async function aguardarGravacoes() {
  // Novas gravações podem entrar enquanto aguardamos a fila anterior.
  while (pendentes > 0) await fila;
}
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
  sobDemanda?: boolean;
}

type Coletor = { nome: string; carregar: () => Promise<void>; limpar: () => void; sobDemanda?: boolean };
const coletores = new Map<string, Coletor>();
let permitido: (nome: string) => boolean = () => true;
export const configurarLeituras = (fn: (nome: string) => boolean) => { permitido = fn; };
export const registrarColetor = (c: Coletor) => { coletores.set(c.nome, c); };
export async function carregarColecoes(nomes?: readonly string[]) {
  const resultados = await Promise.allSettled([...coletores.values()]
    .filter((c) => permitido(c.nome) && (nomes ? nomes.includes(c.nome) : !c.sobDemanda))
    .map((c) => c.carregar()));
  const falha = resultados.find((r) => r.status === "rejected");
  if (falha?.status === "rejected") throw falha.reason;
}
export const limparColecoes = () => {
  permitido = () => false;
  coletores.forEach((c) => c.limpar());
};
/** Relê tudo do banco (sem descartar gravações ainda pendentes). */
export async function atualizarDoBanco(nomes?: readonly string[]) {
  await aguardarGravacoes();
  await carregarColecoes(nomes);
}

/** Coleção salva no Lovable Cloud. Leitura instantânea do cache; gravação em segundo plano. */
export function createCollection<T extends { id: string }>(tabela: string, op: Opcoes<T> = {}) {
  const listeners = new Set<() => void>();
  let cache: T[] = [];
  let revisao = 0;
  let geracao = 0;
  let leitura: Promise<void> | null = null;
  let carregada = false;
  const emit = () => listeners.forEach((l) => l());
  const tab = () => supabase.from(tabela as "clientes");
  const paraLinha = op.paraLinha ?? ((t: T) => {
    const { id, ...resto } = t;
    return { id, data: resto, ...(op.colunas?.(t) ?? {}) } as Linha;
  });
  const deLinha = op.deLinha ?? ((l: Linha) => ({ ...(l["data"] as object), id: l.id }) as T);

  const carregar = (): Promise<void> => {
    if (leitura) return leitura;
    const epoca = geracao;
    const tarefa = (async () => {
      // Páginas estáveis evitam o limite silencioso do serviço (e o antigo teto de 10.000).
      for (;;) {
        const versao = revisao;
        const linhas: Linha[] = [];
        for (let inicio = 0; ; inicio += 500) {
          const pagina = await lerComRecuperacao(async (signal) => {
            const { data, error } = await tab().select(op.select ?? "id,data")
              .order("id").range(inicio, inicio + 499).abortSignal(signal);
            if (error) throw error;
            return (data ?? []) as unknown as Linha[];
          });
          if (epoca !== geracao) return;
          linhas.push(...pagina);
          if (pagina.length < 500) break;
        }
        if (versao !== revisao) {
          await aguardarGravacoes();
          if (epoca !== geracao) return;
          continue;
        }
        cache = linhas.map(deLinha);
        carregada = true;
        emit();
        return;
      }
    })();
    leitura = tarefa;
    void tarefa.finally(() => { if (leitura === tarefa) leitura = null; }).catch(() => undefined);
    return tarefa;
  };
  const recarregar = () => void carregar().catch(() => toast.error("Falha ao carregar dados."));
  registrarColetor({ nome: tabela, carregar, sobDemanda: op.sobDemanda ?? false, limpar: () => {
    geracao++; revisao++; leitura = null; carregada = false; cache = []; emit();
  } });

  const get = (): T[] => cache;
  const save = (list: T[]) => {
    const antes = new Map(cache.map((x) => [x.id, JSON.stringify(x)]));
    const alterados = list.filter((x) => antes.get(x.id) !== JSON.stringify(x));
    const ids = new Set(list.map((x) => x.id));
    const removidos = cache.filter((x) => !ids.has(x.id)).map((x) => x.id);
    revisao++;
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
  const definir = (list: T[]) => { revisao++; cache = list; emit(); };
  const garantir = () => carregada ? Promise.resolve() : carregar();
  return { get, save, use, carregar, garantir, definir };
}

export const agoraISO = () => new Date().toISOString();
export const novoId = () => crypto.randomUUID();
export const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const paraNumero = (v: string | number) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(String(v).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
