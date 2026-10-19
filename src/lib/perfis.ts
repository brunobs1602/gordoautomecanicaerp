import { exigir } from "./acesso";
import { getUsers, transferirUsuarios } from "./auth";
import { registrar } from "./auditoria";
import { ADMIN_ID, diffPermissoes, getPerfis, salvarPerfis, type Perfil, type Permissoes } from "./permissoes";
import { agoraISO, novoId } from "./store";

export interface PerfilInput { nome: string; descricao: string; ativo: boolean; permissoes: Permissoes }

function nomeUnico(nome: string, ignorar?: string) {
  const n = nome.trim().toLowerCase();
  if (!n) throw new Error("Informe o nome do perfil.");
  if (getPerfis().some((p) => p.id !== ignorar && p.nome.trim().toLowerCase() === n)) throw new Error("Já existe um perfil com este nome.");
}

export function criarPerfil(d: PerfilInput) {
  exigir("perfis", "criar");
  nomeUnico(d.nome);
  const p: Perfil = { ...d, nome: d.nome.trim(), id: novoId(), criadoEm: agoraISO(), atualizadoEm: agoraISO() };
  salvarPerfis([...getPerfis(), p]);
  registrar({ tipo: "Perfil criado", alvo: p.nome, descricao: diffPermissoes({}, p.permissoes).join("; ") || "Sem permissões." });
  return p;
}

export function atualizarPerfil(id: string, d: PerfilInput) {
  exigir("perfis", "editar");
  const lista = getPerfis();
  const p = lista.find((x) => x.id === id);
  if (!p) throw new Error("Perfil não encontrado.");
  nomeUnico(d.nome, id);
  // O perfil Administrador mantém sempre acesso total e não pode ser inativado.
  const novo: Perfil = id === ADMIN_ID ? { ...p, nome: d.nome.trim(), descricao: d.descricao, atualizadoEm: agoraISO() } : { ...p, ...d, nome: d.nome.trim(), atualizadoEm: agoraISO() };
  salvarPerfis(lista.map((x) => (x.id === id ? novo : x)));
  const mud: string[] = [];
  if (p.nome !== novo.nome) mud.push(`nome: ${p.nome} → ${novo.nome}`);
  if (p.descricao !== novo.descricao) mud.push("descrição alterada");
  if (mud.length) registrar({ tipo: "Perfil editado", alvo: novo.nome, descricao: mud.join("; ") });
  const perms = diffPermissoes(p.permissoes, novo.permissoes);
  if (perms.length) registrar({ tipo: "Permissões alteradas", alvo: novo.nome, descricao: perms.join("; ") });
  if (p.ativo !== novo.ativo) registrar({ tipo: novo.ativo ? "Perfil ativado" : "Perfil inativado", alvo: novo.nome, descricao: "" });
}

export function alterarStatusPerfil(id: string, ativo: boolean) {
  exigir("perfis", "inativar");
  if (id === ADMIN_ID && !ativo) throw new Error("O perfil Administrador não pode ser inativado.");
  const p = getPerfis().find((x) => x.id === id);
  if (!p) return;
  salvarPerfis(getPerfis().map((x) => (x.id === id ? { ...x, ativo, atualizadoEm: agoraISO() } : x)));
  registrar({ tipo: ativo ? "Perfil ativado" : "Perfil inativado", alvo: p.nome, descricao: "" });
}

/** Exclui o perfil. Se houver usuários vinculados, é obrigatório informar para qual perfil transferi-los. */
export function excluirPerfil(id: string, transferirPara?: string) {
  exigir("perfis", "excluir");
  if (id === ADMIN_ID) throw new Error("O perfil Administrador não pode ser excluído.");
  const p = getPerfis().find((x) => x.id === id);
  if (!p) return;
  const vinculados = getUsers().filter((u) => u.role === id).length;
  if (vinculados > 0) {
    if (!transferirPara || transferirPara === id || !getPerfis().some((x) => x.id === transferirPara))
      throw new Error("Transfira os usuários vinculados para outro perfil antes de excluir.");
    transferirUsuarios(id, transferirPara);
  }
  salvarPerfis(getPerfis().filter((x) => x.id !== id));
  const destino = getPerfis().find((x) => x.id === transferirPara)?.nome;
  registrar({ tipo: "Perfil excluído", alvo: p.nome, descricao: vinculados ? `${vinculados} usuário(s) transferido(s) para ${destino}.` : "" });
}
