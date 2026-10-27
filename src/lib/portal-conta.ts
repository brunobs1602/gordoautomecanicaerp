import { supabase } from "@/integrations/supabase/client";

export type Situacao = "aguardando" | "parcial" | "aprovado" | "recusado" | "vencido";
export interface OrcCliente { id: string; codigo: string; veiculo: string; emitidoEm: string; validade: string; total: number; situacao: Situacao }
export interface ContaCliente { nome: string; email: string; empresa: string }

export const SITUACAO: Record<Situacao, string> = {
  aguardando: "Aguardando aprovação", parcial: "Parcialmente aprovado", aprovado: "Aprovado", recusado: "Recusado", vencido: "Vencido",
};

export const OBS_MAX = 1000;
/** Observações do cliente: opcional, até 1000 caracteres (o banco confere de novo). */
export function validarObs(t: string) {
  const v = t.trim();
  return v.length > OBS_MAX ? `As observações podem ter no máximo ${OBS_MAX} caracteres.` : "";
}

/** Conta do cliente logado; null quando não há sessão ou a conta não é do portal. */
export async function minhaConta(): Promise<ContaCliente | { erro: "inativa" } | null> {
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) return null;
  const { data, error } = await supabase.rpc("portal_minha_conta");
  if (error) throw new Error("Falha de conexão. Tente novamente.");
  return (data as unknown as ContaCliente | { erro: "inativa" } | null) ?? null;
}

export async function entrarCliente(email: string, senha: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha });
  if (error) throw new Error(/invalid/i.test(error.message) ? "E-mail ou senha inválidos." : "Não foi possível entrar. Tente novamente.");
  const c = await minhaConta();
  if (!c) { await supabase.auth.signOut(); throw new Error("Este e-mail não tem acesso ao portal do cliente."); }
  if ("erro" in c) { await supabase.auth.signOut(); throw new Error("Seu acesso ao portal está desativado. Fale com a oficina."); }
  return c;
}

export async function sairCliente() { await supabase.auth.signOut(); }

export async function esqueciSenha(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}/redefinir-senha?portal=1` });
  if (error && /rate/i.test(error.message)) throw new Error("Muitos pedidos. Aguarde alguns minutos.");
}

export async function meusOrcamentos(): Promise<OrcCliente[]> {
  const { data, error } = await supabase.rpc("portal_meus_orcamentos");
  if (error) throw new Error(error.message);
  return (data as unknown as OrcCliente[]) ?? [];
}

export async function abrirOrcamento(id: string) {
  const { data, error } = await supabase.rpc("portal_abrir_orcamento", { _orc: id });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function vincularLink(token: string) {
  const { error } = await supabase.rpc("portal_vincular", { _token: token });
  if (error) throw new Error(error.message);
}

/** Confirmação direto no banco (com a sessão do cliente, quando houver, para registrar a conta). */
export async function confirmarResposta(token: string, aprovados: string[], versao: string, obs: string) {
  const { data, error } = await supabase.rpc("portal_confirmar", { _token: token, _aprovados: aprovados, _versao: versao, _obs: obs.trim() });
  if (error) return { ok: false as const, mensagem: error.message || "Não foi possível registrar sua resposta." };
  return { ok: true as const, status: (data as { status: string }).status };
}

export interface ContaPortal { user_id: string; cliente_id: string; nome: string; email: string; ativo: boolean; criado_em: string; ultimo_acesso: string | null; clientes: { documento: string; data: { nome?: string } } | null }
export async function listarContasPortal(): Promise<ContaPortal[]> {
  const { data, error } = await supabase.from("portal_contas").select("user_id,cliente_id,nome,email,ativo,criado_em,ultimo_acesso,clientes(documento,data)").order("criado_em", { ascending: false });
  if (error) throw new Error(error.message);
  return data as unknown as ContaPortal[];
}
export async function ativarContaPortal(userId: string, ativo: boolean) {
  const { error } = await supabase.rpc("portal_conta_ativar", { _user: userId, _ativo: ativo });
  if (error) throw new Error(error.message);
}
