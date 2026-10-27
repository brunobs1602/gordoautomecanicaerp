import { supabase } from "@/integrations/supabase/client";
import { exigir } from "./acesso";

export interface PortalItem {
  id: string; tipo: "servico" | "produto"; descricao: string; observacao: string;
  quantidade: number; valorUnit: number; desconto: number; acrescimo: number; subtotal: number; aprovado?: boolean;
}
export interface PortalDados {
  codigo: string; versao: string; emitidoEm: string; validade: string; valido: boolean; linkAtivo: boolean;
  status: string; podeAprovar: boolean;
  cliente: { nome: string };
  veiculo: { placa: string; marca: string; modelo: string; ano: string; km: string } | null;
  problema: string; diagnostico: string; obsCliente: string; condicoesPagamento: string;
  itens: PortalItem[]; imagens: string[];
  empresa: { nome: string; telefone: string; whatsapp: string; email: string; endereco: string; logo: string };
  aprovacao: { respondidoEm: string; itens: PortalItem[]; totalAprovado: number; totalRecusado: number } | null;
}

/** Soma os itens escolhidos (apenas para exibição; o servidor recalcula). */
export function totaisSelecao(itens: Pick<PortalItem, "id" | "subtotal">[], selecionados: Set<string>) {
  let aprovado = 0, recusado = 0;
  for (const i of itens) (selecionados.has(i.id) ? (aprovado += i.subtotal) : (recusado += i.subtotal));
  return { aprovado: Math.round(aprovado * 100) / 100, recusado: Math.round(recusado * 100) / 100 };
}

/** Itens a manter na conversão em OS: somente os aprovados pelo cliente. */
export function itensParaConversao<T extends { id: string }>(itens: T[], aprovacao: { itens: { id: string; aprovado?: boolean }[] } | null) {
  if (!aprovacao) return itens;
  const ok = new Set(aprovacao.itens.filter((i) => i.aprovado).map((i) => i.id));
  return itens.filter((i) => ok.has(i.id));
}

// ---------- Imagens ----------
export const TIPOS_IMAGEM = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
export const TAMANHO_ORIGINAL_MAX = 15 * 1024 * 1024;
const LADO_MAX = 1600;

export function dimensoesReduzidas(w: number, h: number, max = LADO_MAX) {
  const f = Math.min(1, max / Math.max(w, h));
  return { w: Math.round(w * f), h: Math.round(h * f) };
}

/** Reduz resolução e qualidade mantendo os defeitos visíveis (JPEG ~0,78). */
export async function comprimirImagem(file: File): Promise<Blob> {
  if (!TIPOS_IMAGEM.includes(file.type)) throw new Error("Formato não aceito. Use JPG, PNG, WEBP ou HEIC.");
  if (file.size > TAMANHO_ORIGINAL_MAX) throw new Error("Imagem muito grande (máximo 15 MB).");
  const bmp = await createImageBitmap(file).catch(() => { throw new Error("Não foi possível ler esta imagem."); });
  const { w, h } = dimensoesReduzidas(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.78));
  if (!blob) throw new Error("Falha ao comprimir a imagem.");
  return blob;
}

export async function enviarImagemOrcamento(orcId: string, file: File) {
  exigir("orcamentos", "editar");
  const blob = await comprimirImagem(file);
  const caminho = `${orcId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.jpg`;
  const { error } = await supabase.storage.from("orcamentos").upload(caminho, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw new Error(/row-level|permission/i.test(error.message) ? "Você não tem permissão para enviar imagens." : "Falha no envio da imagem.");
  return { caminho, nome: file.name, tamanho: blob.size };
}

export async function removerArquivoOrcamento(caminho: string) {
  exigir("orcamentos", "editar");
  await supabase.storage.from("orcamentos").remove([caminho]);
}

export async function urlImagemOrcamento(caminho: string) {
  const { data } = await supabase.storage.from("orcamentos").createSignedUrl(caminho, 3600);
  return data?.signedUrl ?? "";
}

// ---------- Links e respostas ----------
export async function gerarLink(orcId: string) {
  exigir("orcamentos", "editar");
  const { data, error } = await supabase.rpc("orc_gerar_link", { _orc: orcId });
  if (error) throw new Error(error.message);
  return data as string;
}
export async function desativarLink(orcId: string) {
  exigir("orcamentos", "editar");
  const { error } = await supabase.rpc("orc_desativar_link", { _orc: orcId });
  if (error) throw new Error(error.message);
}
export const urlPortal = (token: string) => `${window.location.origin}/portal/${token}`;

export interface Resposta { id: string; link_id: string; respondido_em: string; itens: PortalItem[]; total_aprovado: number; total_recusado: number }
export async function carregarPortalInterno(orcId: string) {
  const [links, resp] = await Promise.all([
    supabase.from("orc_links").select("id,token,ativo,criado_em,criado_por_nome").eq("orcamento_id", orcId).order("criado_em", { ascending: false }),
    supabase.from("orc_aprovacoes").select("id,link_id,respondido_em,itens,total_aprovado,total_recusado").eq("orcamento_id", orcId).order("respondido_em", { ascending: false }),
  ]);
  if (links.error) throw links.error;
  if (resp.error) throw resp.error;
  return { links: links.data, respostas: resp.data as unknown as Resposta[] };
}

/** Resposta válida para conversão: a mais recente. */
export async function ultimaResposta(orcId: string) {
  const { data, error } = await supabase.from("orc_aprovacoes").select("itens").eq("orcamento_id", orcId)
    .order("respondido_em", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data ? { itens: data.itens as unknown as PortalItem[] } : null;
}
