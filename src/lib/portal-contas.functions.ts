import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Equipe autorizada inicia a redefinição: o cliente recebe um link no e-mail; nenhuma senha é vista ou definida pela oficina. */
export const enviarRedefinicaoCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; origem: string }) => ({ userId: String(d?.userId ?? ""), origem: String(d?.origem ?? "") }))
  .handler(async ({ data, context }) => {
    const { data: ok } = await context.supabase.rpc("tem_permissao", { _modulo: "usuarios", _acao: "editar" });
    if (!ok) throw new Error("Sem permissão.");
    if (!/^https?:\/\/[^/]+$/.test(data.origem)) throw new Error("Endereço inválido.");
    const { data: conta } = await context.supabase.from("portal_contas").select("email").eq("user_id", data.userId).maybeSingle();
    if (!conta) throw new Error("Conta não encontrada.");
    const { error } = await context.supabase.auth.resetPasswordForEmail(conta.email, { redirectTo: `${data.origem}/redefinir-senha?portal=1` });
    if (error) throw new Error(/rate/i.test(error.message) ? "Muitos envios. Aguarde alguns minutos." : "Não foi possível enviar o e-mail.");
    const { data: me } = await context.supabase.from("profiles").select("nome,email").eq("id", context.userId).maybeSingle();
    await context.supabase.from("auditoria").insert({ admin_id: context.userId, admin_nome: me?.nome || me?.email || "—", tipo: "portal", alvo: conta.email, descricao: "Link de redefinição de senha enviado ao cliente" });
    return { ok: true };
  });
