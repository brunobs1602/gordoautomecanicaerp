import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NOME_SISTEMA_PADRAO, useConfig, type Config } from "./config";

/** Fonte única do nome da plataforma (Configurações → Sistema). */
const CHAVE = "mecavon.nomeSistema";
const listeners = new Set<() => void>();
let publico: string | null = null;
let buscado = false;

export function normalizarNomeSistema(v: unknown): string {
  const s = String(v ?? "").trim();
  return s || NOME_SISTEMA_PADRAO;
}

export function validarNomeSistema(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s) return "Informe o nome do sistema.";
  if (s.length > 60) return "O nome do sistema pode ter no máximo 60 caracteres.";
  return null;
}

function definir(nome: string) {
  if (nome === publico) return;
  publico = nome;
  try { localStorage.setItem(CHAVE, nome); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

function buscarPublico() {
  if (buscado) return;
  buscado = true;
  try { publico = localStorage.getItem(CHAVE) || null; } catch { /* ignore */ }
  void supabase.rpc("nome_sistema").then(({ data }) => { if (typeof data === "string") definir(normalizarNomeSistema(data)); });
}

/** Nome em uso: da configuração carregada (logado) ou da leitura pública (login/portal). */
export function useNomeSistema(): string {
  const cfg = useConfig() as Config & { sistema?: { nomeSistema?: unknown } };
  const pub = useSyncExternalStore(
    (l) => { listeners.add(l); buscarPublico(); return () => listeners.delete(l); },
    () => publico,
    () => null,
  );
  const doCfg = cfg.sistema?.nomeSistema;
  const temCfg = doCfg !== undefined && String(doCfg).trim() !== "" && String(doCfg) !== NOME_SISTEMA_PADRAO;
  const nome = temCfg ? normalizarNomeSistema(doCfg) : pub ?? NOME_SISTEMA_PADRAO;
  useEffect(() => { if (temCfg) definir(nome); }, [temCfg, nome]);
  return nome;
}

const ESCAPAR = /[.*+?^${}()|[\]\\]/g;
/** Troca o nome padrão pelo configurado nos títulos e metadados declarados nas rotas. */
export function aplicarNome(texto: string, nome: string) {
  if (nome === NOME_SISTEMA_PADRAO) return texto;
  return texto.replace(new RegExp(NOME_SISTEMA_PADRAO.replace(ESCAPAR, "\\$&"), "g"), nome);
}

/** Mantém título da aba e metadados com o nome configurado, inclusive após navegação. */
export function SincronizarNomeSistema() {
  const nome = useNomeSistema();
  useEffect(() => {
    const aplicar = () => {
      const t = aplicarNome(document.title, nome);
      if (t !== document.title) document.title = t;
      document.head.querySelectorAll<HTMLMetaElement>('meta[name="description"],meta[property^="og:"],meta[name^="twitter:"],meta[name="application-name"]').forEach((m) => {
        const c = m.getAttribute("content");
        if (c) { const n = aplicarNome(c, nome); if (n !== c) m.setAttribute("content", n); }
      });
    };
    aplicar();
    const obs = new MutationObserver(aplicar);
    obs.observe(document.head, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["content"] });
    return () => obs.disconnect();
  }, [nome]);
  return null;
}
