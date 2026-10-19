import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SEM_PERMISSAO = "Você não tem permissão para realizar esta ação.";

type Ctx = { supabase: { rpc: (fn: "tem_permissao", a: { _modulo: string; _acao: string }) => PromiseLike<{ data: boolean | null }> } };
async function exigir(ctx: Ctx, modulo: string, acao: string) {
  const { data } = await ctx.supabase.rpc("tem_permissao", { _modulo: modulo, _acao: acao });
  if (!data) throw new Error(SEM_PERMISSAO);
}

function erroAmigavel(e: unknown): never {
  const msg = (e as { message?: string })?.message ?? "";
  if (/already been registered|already exists|duplicate/i.test(msg)) throw new Error("Já existe um usuário com este e-mail.");
  if (/administrador ativo|SEM_PERMISSAO|permissão/i.test(msg)) throw new Error(msg);
  if (/password/i.test(msg)) throw new Error("A senha não atende às regras de segurança (pode ser fraca ou já vazada).");
  console.error(e);
  throw new Error("Não foi possível concluir a operação. Tente novamente.");
}

const dadosUsuario = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().max(20),
  role: z.string().min(1).max(60),
  active: z.boolean(),
});

/** Cadastro do primeiro administrador. Só funciona enquanto não existir nenhum administrador. */
export const criarPrimeiroAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().email().max(255), password: z.string().min(6).max(100) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: precisa } = await supabaseAdmin.rpc("precisa_configuracao_inicial");
    if (!precisa) throw new Error("O administrador principal já foi cadastrado.");
    const email = data.email.toLowerCase();
    const { data: criado, error } = await supabaseAdmin.auth.admin.createUser({ email, password: data.password, email_confirm: true });
    if (error || !criado.user) erroAmigavel(error);
    const id = criado.user.id;
    const p = await supabaseAdmin.from("profiles").insert({ id, nome: data.name, email });
    const r = await supabaseAdmin.from("user_perfis").insert({ user_id: id, perfil_id: "admin" });
    if (p.error || r.error) {
      await supabaseAdmin.auth.admin.deleteUser(id);
      erroAmigavel(p.error ?? r.error);
    }
    return { ok: true };
  });

export const criarUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => dadosUsuario.extend({ password: z.string().min(6).max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    await exigir(context as unknown as Ctx, "usuarios", "criar");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();
    const { data: criado, error } = await supabaseAdmin.auth.admin.createUser({ email, password: data.password, email_confirm: true });
    if (error || !criado.user) erroAmigavel(error);
    const id = criado.user.id;
    const p = await supabaseAdmin.from("profiles").insert({ id, nome: data.name, email, telefone: data.phone, ativo: data.active });
    const r = await supabaseAdmin.from("user_perfis").insert({ user_id: id, perfil_id: data.role });
    if (p.error || r.error) {
      await supabaseAdmin.auth.admin.deleteUser(id);
      erroAmigavel(p.error ?? r.error);
    }
    return { id };
  });

export const salvarUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => dadosUsuario.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx & { userId: string };
    await exigir(ctx, "usuarios", "editar");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();
    const { data: atual } = await supabaseAdmin.from("profiles").select("email").eq("id", data.id).single();
    if (!atual) throw new Error("Usuário não encontrado.");
    if (atual.email !== email) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, { email, email_confirm: true });
      if (error) erroAmigavel(error);
    }
    const p = await supabaseAdmin.from("profiles").update({ nome: data.name, email, telefone: data.phone, ativo: data.active }).eq("id", data.id);
    if (p.error) erroAmigavel(p.error);
    const r = await supabaseAdmin.from("user_perfis").update({ perfil_id: data.role }).eq("user_id", data.id);
    if (r.error) erroAmigavel(r.error);
    // Usuário inativo perde a sessão imediatamente.
    if (!data.active) await supabaseAdmin.auth.admin.signOut(data.id).catch(() => undefined);
    return { ok: true };
  });

export const redefinirSenha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), password: z.string().min(6).max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    await exigir(context as unknown as Ctx, "usuarios", "editar");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, { password: data.password });
    if (error) erroAmigavel(error);
    return { ok: true };
  });

export const excluirUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx & { userId: string };
    await exigir(ctx, "usuarios", "excluir");
    if (ctx.userId === data.id) throw new Error("Você não pode excluir o próprio usuário.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) erroAmigavel(error);
    return { ok: true };
  });

/** Apaga cadastros e orçamentos (manutenção). Usuários, perfis, configurações e histórico são mantidos. */
export const limparDadosDemonstracao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await exigir(context as unknown as Ctx, "configuracoes", "config");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    for (const t of ["orcamentos", "veiculos", "clientes", "produtos", "servicos"] as const) {
      const { error } = await supabaseAdmin.from(t).delete().not("id", "is", null);
      if (error) erroAmigavel(error);
    }
    return { ok: true };
  });
