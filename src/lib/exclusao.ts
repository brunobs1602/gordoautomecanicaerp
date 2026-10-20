import { supabase } from "@/integrations/supabase/client";
import { atualizarDoBanco, aguardarGravacoes, mensagemErro } from "./store";
import { exigir } from "./acesso";

export type TipoExclusao = "cliente" | "veiculo" | "produto" | "orcamento";
export const MODULO_EXCLUSAO = { cliente: "clientes", veiculo: "veiculos", produto: "produtos", orcamento: "orcamentos" } as const;

export interface ResultadoExclusao { ok: boolean; motivos: string[] }

/** Toda a validação de vínculos e permissão acontece no banco (função excluir_registro). */
async function chamar(tipo: TipoExclusao, id: string, somenteVerificar: boolean, motivo = ""): Promise<ResultadoExclusao> {
  exigir(MODULO_EXCLUSAO[tipo], "excluir");
  await aguardarGravacoes();
  const { data, error } = await supabase.rpc("excluir_registro", {
    _tipo: tipo, _id: id, _somente_verificar: somenteVerificar, _motivo: motivo,
  });
  if (error) throw new Error(mensagemErro(error, "Não foi possível concluir a exclusão. Tente novamente."));
  const r = (data ?? {}) as { ok?: boolean; motivos?: string[] };
  return { ok: !!r.ok, motivos: r.motivos ?? [] };
}

export const verificarExclusao = (tipo: TipoExclusao, id: string) => chamar(tipo, id, true);

export async function excluirDefinitivo(tipo: TipoExclusao, id: string, motivo: string) {
  const r = await chamar(tipo, id, false, motivo);
  if (r.ok) await atualizarDoBanco(); // listas, dashboard e estoque refletem a exclusão
  return r;
}
