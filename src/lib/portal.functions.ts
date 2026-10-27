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
