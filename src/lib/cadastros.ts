import { MSG_SEM_PERMISSAO, podeAtual } from "./acesso";
import { registrar } from "./auditoria";
import { agoraISO, createCollection, novoId } from "./store";

export type TipoCategoria = "produto" | "servico";
export interface Categoria { id: string; tipo: TipoCategoria; nome: string; ativo: boolean }
export interface Marca { id: string; nome: string; ativo: boolean }

const chave = (s: string) => s.trim().toLocaleLowerCase("pt-BR");

const cats = createCollection<Categoria>("categorias", {
  select: "id,tipo,nome,ativo",
  paraLinha: (c) => ({ id: c.id, tipo: c.tipo, nome: c.nome.trim(), ativo: c.ativo, atualizado_em: agoraISO() }),
  deLinha: (l) => ({ id: l.id, tipo: l["tipo"] as TipoCategoria, nome: String(l["nome"]), ativo: Boolean(l["ativo"]) }),
});
const marcas = createCollection<Marca>("marcas", {
  select: "id,nome,ativo",
  paraLinha: (m) => ({ id: m.id, nome: m.nome.trim(), ativo: m.ativo, atualizado_em: agoraISO() }),
  deLinha: (l) => ({ id: l.id, nome: String(l["nome"]), ativo: Boolean(l["ativo"]) }),
});

const ordenar = <T extends { nome: string }>(l: T[]) => [...l].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
export const getCategorias = (tipo: TipoCategoria) => cats.get().filter((c) => c.tipo === tipo);
export const useCategorias = (tipo: TipoCategoria) => ordenar(cats.use().filter((c) => c.tipo === tipo));
export const getMarcas = marcas.get;
export const useMarcas = () => ordenar(marcas.use());

const modCat = (t: TipoCategoria) => (t === "produto" ? "produtos" : "servicos");
const LABEL_CAT = { produto: "Categoria de produto", servico: "Categoria de serviço" };
export const podeCriarCategoria = (t: TipoCategoria) =>
  podeAtual("configuracoes", "config") || podeAtual(modCat(t), "criar") || podeAtual(modCat(t), "editar");
export const podeCriarMarca = () =>
  podeAtual("configuracoes", "config") || podeAtual("veiculos", "criar") || podeAtual("veiculos", "editar");
const exigirConfig = () => { if (!podeAtual("configuracoes", "config")) throw new Error(MSG_SEM_PERMISSAO); };

function validarNome(nome: string, lista: { id: string; nome: string }[], ignorar?: string) {
  const n = nome.trim();
  if (n.length < 1 || n.length > 60) throw new Error("Informe um nome com até 60 caracteres.");
  if (lista.some((x) => x.id !== ignorar && chave(x.nome) === chave(n))) throw new Error("Já existe um cadastro com este nome.");
  return n;
}

export function criarCategoria(tipo: TipoCategoria, nome: string) {
  if (!podeCriarCategoria(tipo)) throw new Error(MSG_SEM_PERMISSAO);
  const n = validarNome(nome, getCategorias(tipo));
  const c: Categoria = { id: novoId(), tipo, nome: n, ativo: true };
  cats.save([...cats.get(), c]);
  registrar({ tipo: "cadastro", alvo: n, descricao: `${LABEL_CAT[tipo]} criada` });
  return c;
}
/** Renomear também atualiza os registros que usam a categoria (via callback). */
export function editarCategoria(id: string, nome: string, renomearUsos: (antigo: string, novo: string) => void) {
  exigirConfig();
  const c = cats.get().find((x) => x.id === id);
  if (!c) throw new Error("Categoria não encontrada.");
  const n = validarNome(nome, getCategorias(c.tipo), id);
  if (n === c.nome) return;
  cats.save(cats.get().map((x) => (x.id === id ? { ...x, nome: n } : x)));
  renomearUsos(c.nome, n);
  registrar({ tipo: "cadastro", alvo: n, descricao: `${LABEL_CAT[c.tipo]} renomeada`, antes: c.nome, depois: n });
}
export function statusCategoria(id: string, ativo: boolean) {
  exigirConfig();
  const c = cats.get().find((x) => x.id === id);
  if (!c) return;
  cats.save(cats.get().map((x) => (x.id === id ? { ...x, ativo } : x)));
  registrar({ tipo: "cadastro", alvo: c.nome, descricao: `${LABEL_CAT[c.tipo]} ${ativo ? "ativada" : "inativada"}` });
}
export function excluirCategoria(id: string, emUso: number) {
  exigirConfig();
  if (emUso > 0) throw new Error(`Categoria em uso por ${emUso} registro(s). Transfira-os para outra categoria antes de excluir.`);
  const c = cats.get().find((x) => x.id === id);
  if (!c) return;
  cats.save(cats.get().filter((x) => x.id !== id));
  registrar({ tipo: "cadastro", alvo: c.nome, descricao: `${LABEL_CAT[c.tipo]} excluída` });
}

export function criarMarca(nome: string) {
  if (!podeCriarMarca()) throw new Error(MSG_SEM_PERMISSAO);
  const n = validarNome(nome, marcas.get());
  const m: Marca = { id: novoId(), nome: n, ativo: true };
  marcas.save([...marcas.get(), m]);
  registrar({ tipo: "cadastro", alvo: n, descricao: "Marca de veículo criada" });
  return m;
}
export function editarMarca(id: string, nome: string, renomearUsos: (antigo: string, novo: string) => void) {
  exigirConfig();
  const m = marcas.get().find((x) => x.id === id);
  if (!m) throw new Error("Marca não encontrada.");
  const n = validarNome(nome, marcas.get(), id);
  if (n === m.nome) return;
  marcas.save(marcas.get().map((x) => (x.id === id ? { ...x, nome: n } : x)));
  renomearUsos(m.nome, n);
  registrar({ tipo: "cadastro", alvo: n, descricao: "Marca de veículo renomeada", antes: m.nome, depois: n });
}
export function statusMarca(id: string, ativo: boolean) {
  exigirConfig();
  const m = marcas.get().find((x) => x.id === id);
  if (!m) return;
  marcas.save(marcas.get().map((x) => (x.id === id ? { ...x, ativo } : x)));
  registrar({ tipo: "cadastro", alvo: m.nome, descricao: `Marca de veículo ${ativo ? "ativada" : "inativada"}` });
}

export const mesmoNome = (a: string, b: string) => chave(a) === chave(b);
