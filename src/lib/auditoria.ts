import { agoraISO, createCollection, novoId } from "./store";

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

const col = createCollection<RegistroAuditoria>("gordo.auditoria");
export const useAuditoria = col.use;
export const getAuditoria = col.get;

/** Lê o usuário logado direto do armazenamento para não depender de auth (evita ciclo). */
function ator() {
  try {
    const id = localStorage.getItem("gordo.session");
    const u = (JSON.parse(localStorage.getItem("gordo.users") || "[]") as { id: string; name: string }[]).find((x) => x.id === id);
    return { adminId: u?.id ?? "", adminNome: u?.name ?? "Sistema" };
  } catch {
    return { adminId: "", adminNome: "Sistema" };
  }
}

export function registrar(r: Omit<RegistroAuditoria, "id" | "data" | "adminId" | "adminNome">) {
  if (typeof window === "undefined") return;
  col.save([...col.get(), { ...r, ...ator(), id: novoId(), data: agoraISO() }]);
}
