import { pode, type Perfil, type Modulo } from "./permissoes";

/** Apenas evita consultas inúteis; a autorização continua sendo aplicada pela RLS. */
export function podeLerColecao(perfil: Perfil | undefined, nome: string) {
  const ver = (...modulos: Modulo[]) => modulos.some((m) => pode(perfil, m));
  const documentos = ver("orcamentos", "ordens");
  switch (nome) {
    case "perfis": case "configuracoes": case "categorias": case "marcas": return true;
    case "clientes": return ver("clientes") || documentos;
    case "veiculos": return ver("veiculos", "clientes") || documentos;
    case "produtos": return ver("produtos") || documentos;
    case "servicos": return ver("servicos") || documentos;
    case "orcamentos": return documentos;
    case "profiles": return ver("usuarios");
    case "auditoria": return ver("usuarios", "perfis") || pode(perfil, "configuracoes", "config");
    default: return false;
  }
}