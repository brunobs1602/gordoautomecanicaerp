import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { PortalDados } from "./portal";

const TOKEN = /^[a-f0-9]{64}$/;

function clientePublico() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/** Leitura pública do orçamento pelo token. O banco valida o token e só devolve dados deste orçamento. */
export const lerPortal = createServerFn({ method: "GET" })
  .inputValidator((d: { token: string }) => ({ token: String(d?.token ?? "") }))
  .handler(async ({ data }): Promise<PortalDados | { erro: string }> => {
    if (!TOKEN.test(data.token)) return { erro: "invalido" };
    const { data: res, error } = await clientePublico().rpc("portal_ler", { _token: data.token });
    if (error) {
      console.error("portal_ler", error.message);
      return { erro: "falha" };
    }
    const r = res as unknown as PortalDados & { erro?: string };
    if (r.erro) return { erro: r.erro };
    // Arquivos privados: endereços temporários gerados somente após validar o token.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const imagens: string[] = [];
    for (const caminho of (r.imagens ?? []) as string[]) {
      const { data: s } = await supabaseAdmin.storage.from("orcamentos").createSignedUrl(caminho, 3600);
      if (s?.signedUrl) imagens.push(s.signedUrl);
    }
    let logo = "";
    if (r.empresa.logo?.startsWith("marca:")) {
      const { data: s } = await supabaseAdmin.storage.from("marca").createSignedUrl(r.empresa.logo.slice(6), 3600);
      logo = s?.signedUrl ?? "";
    } else if (r.empresa.logo?.startsWith("https://")) logo = r.empresa.logo;
    return { ...r, imagens, empresa: { ...r.empresa, logo } };
  });

/** Confirmação do cliente. Valores, validade e duplicidade são conferidos no banco. */
export const confirmarPortal = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; aprovados: string[]; versao: string }) => ({
    token: String(d?.token ?? ""),
    aprovados: Array.isArray(d?.aprovados) ? d.aprovados.map(String).slice(0, 500) : [],
    versao: String(d?.versao ?? ""),
  }))
  .handler(async ({ data }) => {
    if (!TOKEN.test(data.token)) return { ok: false as const, mensagem: "Link inválido." };
    const { data: res, error } = await clientePublico().rpc("portal_confirmar", {
      _token: data.token, _aprovados: data.aprovados, _versao: data.versao,
    });
    if (error) return { ok: false as const, mensagem: error.message || "Não foi possível registrar sua resposta." };
    return { ok: true as const, status: (res as { status: string }).status };
  });

const cadastroSchema = (d: unknown) => {
  const o = (d ?? {}) as Record<string, unknown>;
  const token = String(o["token"] ?? ""), nome = String(o["nome"] ?? "").trim(), email = String(o["email"] ?? "").trim().toLowerCase(), senha = String(o["senha"] ?? "");
  return { token, nome, email, senha };
};

/** Cadastro do cliente pelo link do orçamento: o link recebido comprova a qual cadastro a conta pertence. */
export const cadastrarContaPortal = createServerFn({ method: "POST" })
  .inputValidator(cadastroSchema)
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; existe?: boolean; mensagem: string }> => {
    if (!TOKEN.test(data.token)) return { ok: false, mensagem: "Link inválido." };
    if (data.nome.length < 2 || data.nome.length > 100) return { ok: false, mensagem: "Informe seu nome." };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email) || data.email.length > 200) return { ok: false, mensagem: "E-mail inválido." };
    if (data.senha.length < 8 || data.senha.length > 72) return { ok: false, mensagem: "A senha deve ter entre 8 e 72 caracteres." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cfg } = await supabaseAdmin.from("configuracoes").select("data").eq("id", 1).maybeSingle();
    if ((cfg?.data as { orcamentos?: { portalCliente?: boolean } } | null)?.orcamentos?.portalCliente !== true) return { ok: false, mensagem: "O portal está indisponível no momento." };
    const { data: link } = await supabaseAdmin.from("orc_links").select("orcamentos(cliente_id)").eq("token", data.token).maybeSingle();
    const clienteId = (link?.orcamentos as { cliente_id: string | null } | null)?.cliente_id;
    if (!clienteId) return { ok: false, mensagem: "Link inválido." };
    const { data: novo, error } = await supabaseAdmin.auth.admin.createUser({ email: data.email, password: data.senha, email_confirm: true, user_metadata: { portal_cliente: true, nome: data.nome } });
    if (error || !novo.user) {
      if (/already|registered|exists/i.test(error?.message ?? "")) return { ok: false, existe: true, mensagem: "Este e-mail já tem uma conta. Entre com sua senha ou recupere o acesso." };
      if (/weak|pwned|password/i.test(error?.message ?? "")) return { ok: false, mensagem: "Senha fraca ou já vazada na internet. Escolha outra." };
      console.error("portal cadastro", error?.message);
      return { ok: false, mensagem: "Não foi possível criar a conta agora." };
    }
    const { error: e2 } = await supabaseAdmin.from("portal_contas").insert({ user_id: novo.user.id, cliente_id: clienteId, email: data.email, nome: data.nome });
    if (e2) {
      await supabaseAdmin.auth.admin.deleteUser(novo.user.id);
      return { ok: false, mensagem: "Não foi possível criar a conta agora." };
    }
    return { ok: true };
  });
