import { supabase } from "@/integrations/supabase/client";
import { createCollection, enfileirar } from "./store";
import { getSessao } from "./sessao";

export interface RegistroAuditoria {
  id: string;
  data: string;
  adminId: string;
  adminNome: string;
  tipo: string;
  alvo: string;
  descricao: string;
  secao?: string;
  antes?: string;
  depois?: string;
}

// Somente leitura: o histórico nunca é alterado nem apagado (regras do banco).
const col = createCollection<RegistroAuditoria>("auditoria", {
  sobDemanda: true,
  select: "id,data,admin_id,admin_nome,tipo,alvo,descricao,secao,antes,depois",
  deLinha: (l) => {
    const r: RegistroAuditoria = {
      id: l.id, data: String(l["data"]), adminId: String(l["admin_id"]), adminNome: String(l["admin_nome"]),
      tipo: String(l["tipo"]), alvo: String(l["alvo"]), descricao: String(l["descricao"]),
    };
    if (l["secao"] != null) r.secao = String(l["secao"]);
    if (l["antes"] != null) r.antes = String(l["antes"]);
    if (l["depois"] != null) r.depois = String(l["depois"]);
    return r;
  },
});
export const useAuditoria = () => [...col.use()].sort((a, b) => a.data.localeCompare(b.data));
export const getAuditoria = col.get;
export const carregarAuditoria = col.carregar;
export const garantirAuditoria = col.garantir;

export function registrar(r: Omit<RegistroAuditoria, "id" | "data" | "adminId" | "adminNome">, adminNome?: string) {
  const eu = getSessao();
  if (!eu) return;
  const linha = {
    admin_id: eu.id, admin_nome: adminNome ?? eu.name, tipo: r.tipo, alvo: r.alvo, descricao: r.descricao,
    secao: r.secao ?? null, antes: r.antes ?? null, depois: r.depois ?? null,
  };
  enfileirar(async () => {
    const { data, error } = await supabase.from("auditoria").insert(linha).select("id,data").single();
    if (error) throw error;
    col.definir([...col.get(), { ...r, id: data.id, data: data.data, adminId: eu.id, adminNome: linha.admin_nome }]);
  });
}
