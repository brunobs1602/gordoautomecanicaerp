import { redirect } from "@tanstack/react-router";
import { getCurrentUser, useCurrentUser } from "./auth";
import { ADMIN_ID, getPerfis, pode, usePerfis, type Acao, type Modulo } from "./permissoes";

export const MSG_SEM_PERMISSAO = "Você não tem permissão para realizar esta ação.";

/** Permissões do usuário logado (atualiza ao mudar perfis ou usuários). */
export function useAcesso() {
  const user = useCurrentUser();
  const perfis = usePerfis();
  const perfil = perfis.find((p) => p.id === user?.role);
  return {
    user,
    perfil,
    isAdmin: Boolean(perfil?.ativo && perfil.id === ADMIN_ID),
    pode: (m: Modulo, a: Acao = "ver") => pode(perfil, m, a),
  };
}

export function podeAtual(m: Modulo, a: Acao = "ver") {
  const u = getCurrentUser();
  return pode(getPerfis().find((p) => p.id === u?.role), m, a);
}

/** Bloqueia a operação mesmo quando chamada por outro caminho além do botão. */
export function exigir(m: Modulo, a: Acao) {
  if (!podeAtual(m, a)) throw new Error(MSG_SEM_PERMISSAO);
}

/** Para beforeLoad de rotas: redireciona se o usuário não tiver nenhuma das permissões. */
export const guard = (...req: [Modulo, Acao?][]) => () => {
  if (!req.some(([m, a]) => podeAtual(m, a ?? "ver"))) throw redirect({ to: "/sem-permissao" });
};
