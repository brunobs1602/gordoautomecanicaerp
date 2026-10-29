import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uuid } from "./uuid";

const BUCKET = "marca";
const PREFIXO = "marca:";
const TIPOS = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"];
export const TAMANHO_MAX = 1_000_000;

/** Envia a imagem para o armazenamento privado e devolve a referência salva nas configurações. */
export async function enviarImagem(campo: string, file: File): Promise<string> {
  if (!TIPOS.includes(file.type)) throw new Error("Formato não permitido. Use PNG, JPG, WEBP, SVG ou ICO.");
  if (file.size > TAMANHO_MAX) throw new Error("Imagem muito grande. Use até 1 MB.");
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "png";
  // Nome novo a cada envio: documentos antigos continuam válidos.
  const caminho = `${campo.replace(/[^a-zA-Z0-9_-]/g, "")}/${Date.now()}-${uuid().slice(0, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(caminho, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(/row-level|permission/i.test(error.message) ? "Você não tem permissão para enviar arquivos." : "Falha no envio da imagem. Tente novamente.");
  return PREFIXO + caminho;
}

const cache = new Map<string, { url: string; ate: number }>();
async function urlAssinada(ref: string) {
  const c = cache.get(ref);
  if (c && c.ate > Date.now()) return c.url;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(ref.slice(PREFIXO.length), 3600);
  if (error || !data) return "";
  cache.set(ref, { url: data.signedUrl, ate: Date.now() + 50 * 60_000 });
  return data.signedUrl;
}

/** Converte a referência salva em um endereço exibível (temporário e privado). */
export function useImagem(ref: string | undefined | null) {
  const [url, setUrl] = useState(() => (ref && !ref.startsWith(PREFIXO) ? ref : ""));
  useEffect(() => {
    let vivo = true;
    if (!ref) setUrl("");
    else if (!ref.startsWith(PREFIXO)) setUrl(ref);
    else void urlAssinada(ref).then((u) => vivo && setUrl(u));
    return () => {
      vivo = false;
    };
  }, [ref]);
  return url;
}
