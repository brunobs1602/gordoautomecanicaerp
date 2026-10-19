import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Car, Package, Plus, Trash2, UserPlus, Wrench, X } from "lucide-react";
import { useClientes } from "@/lib/clientes";
import { formatarPlaca, useVeiculos } from "@/lib/veiculos";
import { criarProduto, produtoVazio, useProdutos } from "@/lib/produtos";
import { criarServico, servicoVazio, useServicos } from "@/lib/servicos";
import { useUsers } from "@/lib/auth";
import { calcularTotais, novoItem, subtotalItem, type Dados, type Item } from "@/lib/orcamentos";
import { moeda } from "@/lib/store";
import { mascaraDocumento, mascaraTelefone, soDigitos } from "@/lib/validacao";
import { Field, FormError } from "@/components/AuthCard";
import { Autocomplete } from "@/components/Autocomplete";
import { Modal } from "@/components/Modal";
import { ProdutoForm } from "@/components/estoque/ProdutoForm";
import { ServicoForm } from "@/components/estoque/ServicoForm";
import { QuickCliente, QuickVeiculo } from "./QuickForms";

function Secao({ titulo, children, acao }: { titulo: string; children: ReactNode; acao?: ReactNode }) {
  return (
    <section className="panel p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold uppercase text-metal">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  );
}

function Area({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-metal">{label}</span>
      <textarea className="field h-auto py-2" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

const num = (v: string) => {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

type Rapido = null | "cliente" | "veiculo" | "produto" | "servico";

export function OrcamentoForm({ inicial, onSalvar, submitLabel, cancelarPara }: {
  inicial: Dados; onSalvar: (d: Dados) => void; submitLabel: string; cancelarPara: { to: string; params?: Record<string, string> };
}) {
  const [f, setF] = useState<Dados>(inicial);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erro, setErro] = useState("");
  const [rapido, setRapido] = useState<Rapido>(null);
  const clientes = useClientes();
  const veiculos = useVeiculos();
  const produtos = useProdutos();
  const servicos = useServicos();
  const usuarios = useUsers().filter((u) => u.active);

  const cliente = clientes.find((c) => c.id === f.clienteId);
  const veiculosCliente = veiculos.filter((v) => v.clienteId === f.clienteId && (v.ativo || v.id === f.veiculoId));
  const totais = calcularTotais(f.itens);
  const set = <K extends keyof Dados>(k: K, v: Dados[K]) => setF((p) => ({ ...p, [k]: v }));
  const setItem = (id: string, patch: Partial<Item>) => set("itens", f.itens.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const addItem = (i: Item) => setF((p) => ({ ...p, itens: [...p.itens, i] }));

  const selecionarVeiculo = (id: string) => {
    const v = veiculos.find((x) => x.id === id);
    setF((p) => ({ ...p, veiculoId: id, quilometragem: p.quilometragem || v?.quilometragem || "" }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const m: Record<string, string> = {};
    if (!cliente) m["clienteId"] = "Selecione o cliente.";
    if (!f.veiculoId || !veiculos.some((v) => v.id === f.veiculoId && v.clienteId === f.clienteId)) m["veiculoId"] = "Selecione um veículo deste cliente.";
    if (f.quilometragem && !/^\d+$/.test(f.quilometragem)) m["quilometragem"] = "Quilometragem inválida.";
    if (f.itens.some((i) => !i.descricao.trim())) m["itens"] = "Todos os itens precisam de descrição.";
    if (f.itens.some((i) => i.quantidade <= 0)) m["itens"] = "A quantidade dos itens deve ser maior que zero.";
    setErros(m);
    if (Object.keys(m).length) return setErro("Corrija os campos destacados.");
    setErro("");
    try {
      onSalvar(f);
    } catch (err) {
      setErro((err as Error).message);
    }
  };

  const linhas = (tipo: Item["tipo"]) => f.itens.filter((i) => i.tipo === tipo);

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <FormError message={erro} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Secao titulo="Cliente" acao={<button type="button" className="btn-ghost" onClick={() => setRapido("cliente")}><UserPlus className="h-4 w-4" /> Novo cliente</button>}>
          {cliente ? (
            <div className="flex items-center justify-between gap-3 rounded-md border border-primary/60 bg-background p-3">
              <div className="min-w-0">
                <div className="truncate font-medium">{cliente.nome}</div>
                <div className="text-xs text-muted-foreground">{mascaraDocumento(cliente.documento, cliente.tipo)} · {mascaraTelefone(cliente.telefone) || "sem telefone"}</div>
              </div>
              <button type="button" className="btn-ghost px-2.5" title="Trocar cliente" onClick={() => setF((p) => ({ ...p, clienteId: "", veiculoId: "" }))}><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <Autocomplete
              itens={clientes.filter((c) => c.ativo)}
              placeholder="Pesquisar cliente por nome, CPF/CNPJ ou telefone"
              vazio="Nenhum cliente encontrado."
              filtrar={(c, t) => c.nome.toLowerCase().includes(t) || (!!soDigitos(t) && (c.documento.includes(soDigitos(t)) || soDigitos(c.telefone).includes(soDigitos(t))))}
              render={(c) => (<><div className="text-sm font-medium">{c.nome}</div><div className="text-xs text-muted-foreground">{mascaraDocumento(c.documento, c.tipo)} · {mascaraTelefone(c.telefone) || "sem telefone"}</div></>)}
              onSelect={(c) => setF((p) => ({ ...p, clienteId: c.id, veiculoId: "" }))}
              acaoExtra={<button type="button" className="text-sm text-primary" onClick={() => setRapido("cliente")}>+ Cadastrar novo cliente</button>}
            />
          )}
          {erros["clienteId"] && <p className="mt-1 text-xs text-destructive">{erros["clienteId"]}</p>}
        </Secao>

        <Secao titulo="Veículo" acao={<button type="button" className="btn-ghost" disabled={!cliente} title={cliente ? "" : "Selecione um cliente primeiro"} onClick={() => setRapido("veiculo")}><Car className="h-4 w-4" /> Novo veículo</button>}>
          {!cliente ? (
            <p className="text-sm text-muted-foreground">Selecione um cliente para escolher o veículo.</p>
          ) : veiculosCliente.length === 0 ? (
            <p className="text-sm text-muted-foreground">Este cliente não possui veículos. Use “Novo veículo”.</p>
          ) : (
            <select className="field" value={f.veiculoId} onChange={(e) => selecionarVeiculo(e.target.value)} aria-label="Veículo">
              <option value="">Selecione o veículo</option>
              {veiculosCliente.map((v) => (
                <option key={v.id} value={v.id}>{formatarPlaca(v.placa)} — {[v.marca, v.modelo, v.anoModelo].filter(Boolean).join(" ")}</option>
              ))}
            </select>
          )}
          {erros["veiculoId"] && <p className="mt-1 text-xs text-destructive">{erros["veiculoId"]}</p>}
        </Secao>
      </div>

      <Secao titulo="Atendimento">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Validade do orçamento" type="date" value={f.validade} onChange={(e) => set("validade", e.target.value)} />
          <Field label="Previsão de conclusão" type="date" value={f.previsao} onChange={(e) => set("previsao", e.target.value)} />
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-metal">Responsável</span>
            <select className="field" value={f.responsavelId} onChange={(e) => set("responsavelId", e.target.value)}>
              <option value="">Selecione</option>
              {usuarios.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </label>
          <Field label="Quilometragem" inputMode="numeric" value={f.quilometragem} error={erros["quilometragem"]} onChange={(e) => set("quilometragem", soDigitos(e.target.value))} />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Area label="Problema relatado pelo cliente" value={f.problema} onChange={(v) => set("problema", v)} />
          <Area label="Diagnóstico / avaliação inicial" value={f.diagnostico} onChange={(v) => set("diagnostico", v)} />
        </div>
      </Secao>

      {(["servico", "produto"] as const).map((tipo) => (
        <Secao
          key={tipo}
          titulo={tipo === "servico" ? "Serviços" : "Produtos e peças"}
          acao={
            <div className="flex flex-wrap gap-2">
              {tipo === "servico" && <button type="button" className="btn-ghost" onClick={() => addItem(novoItem("servico"))}><Plus className="h-4 w-4" /> Serviço avulso</button>}
              <button type="button" className="btn-ghost" onClick={() => setRapido(tipo)}>
                {tipo === "servico" ? <Wrench className="h-4 w-4" /> : <Package className="h-4 w-4" />} Cadastrar {tipo === "servico" ? "serviço" : "produto"}
              </button>
            </div>
          }
        >
          {tipo === "servico" ? (
            <Autocomplete
              itens={servicos.filter((s) => s.ativo)}
              placeholder="Buscar serviço cadastrado"
              vazio="Nenhum serviço encontrado. Use “Serviço avulso” ou cadastre um novo."
              filtrar={(s, t) => s.nome.toLowerCase().includes(t) || s.categoria.toLowerCase().includes(t)}
              render={(s) => (<div className="flex justify-between gap-3 text-sm"><span>{s.nome}{s.tempoEstimado && <span className="text-muted-foreground"> · {s.tempoEstimado}</span>}</span><span className="text-metal">{moeda(s.preco)}</span></div>)}
              onSelect={(s) => addItem(novoItem("servico", { refId: s.id, descricao: s.nome, valorUnit: s.preco }))}
            />
          ) : (
            <Autocomplete
              itens={produtos.filter((p) => p.ativo)}
              placeholder="Buscar produto por nome, código ou categoria"
              vazio="Produto não encontrado."
              filtrar={(p, t) => p.nome.toLowerCase().includes(t) || p.codigo.toLowerCase().includes(t) || p.categoria.toLowerCase().includes(t)}
              render={(p) => (<div className="flex justify-between gap-3 text-sm"><span>{p.nome} {p.codigo && <span className="text-muted-foreground">({p.codigo})</span>} <span className="text-xs text-muted-foreground">· estoque {p.estoque} {p.unidade}</span></span><span className="text-metal">{moeda(p.preco)}</span></div>)}
              onSelect={(p) => addItem(novoItem("produto", { refId: p.id, descricao: p.nome, valorUnit: p.preco }))}
              acaoExtra={<button type="button" className="text-sm text-primary" onClick={() => setRapido("produto")}>+ Cadastrar novo produto</button>}
            />
          )}

          {linhas(tipo).length > 0 && (
            <div className="mt-4 space-y-3">
              {linhas(tipo).map((i) => (
                <div key={i.id} className="rounded-md border border-border bg-background/60 p-3">
                  <div className="grid gap-3 sm:grid-cols-6 lg:grid-cols-12">
                    <div className="sm:col-span-6 lg:col-span-4">
                      <Field label="Descrição" value={i.descricao} onChange={(e) => setItem(i.id, { descricao: e.target.value })} />
                    </div>
                    <div className="sm:col-span-2 lg:col-span-1"><Field label="Qtd." type="number" min="0" step="1" value={String(i.quantidade)} onChange={(e) => setItem(i.id, { quantidade: num(e.target.value) })} /></div>
                    <div className="sm:col-span-2 lg:col-span-2"><Field label="Valor unit." type="number" min="0" step="0.01" value={String(i.valorUnit)} onChange={(e) => setItem(i.id, { valorUnit: num(e.target.value) })} /></div>
                    <div className="sm:col-span-2 lg:col-span-2"><Field label="Desconto" type="number" min="0" step="0.01" value={String(i.desconto)} onChange={(e) => setItem(i.id, { desconto: num(e.target.value) })} /></div>
                    <div className="sm:col-span-3 lg:col-span-2"><Field label="Acréscimo" type="number" min="0" step="0.01" value={String(i.acrescimo)} onChange={(e) => setItem(i.id, { acrescimo: num(e.target.value) })} /></div>
                    <div className="flex items-end justify-between gap-2 sm:col-span-3 lg:col-span-1 lg:flex-col lg:items-end">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Subtotal</div>
                        <div className="font-display text-lg font-bold">{moeda(subtotalItem(i))}</div>
                      </div>
                      <button type="button" className="btn-ghost px-2.5 hover:text-destructive" title="Remover item" onClick={() => set("itens", f.itens.filter((x) => x.id !== i.id))}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <input className="field mt-2 h-9 text-sm" placeholder="Observação do item (opcional)" value={i.observacao} onChange={(e) => setItem(i.id, { observacao: e.target.value })} />
                </div>
              ))}
            </div>
          )}
          {tipo === "produto" && erros["itens"] && <p className="mt-2 text-xs text-destructive">{erros["itens"]}</p>}
        </Secao>
      ))}

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Secao titulo="Observações">
          <div className="grid gap-4">
            <Area label="Observações para o cliente (aparecem no documento)" value={f.obsCliente} onChange={(v) => set("obsCliente", v)} />
            <Area label="Condições de pagamento" value={f.condicoesPagamento} onChange={(v) => set("condicoesPagamento", v)} rows={2} />
            <Area label="Observações internas (não aparecem para o cliente)" value={f.obsInterna} onChange={(v) => set("obsInterna", v)} />
          </div>
        </Secao>
        <ResumoFinanceiro totais={totais} />
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <Link {...(cancelarPara as { to: "/ordens" })} className="btn-ghost h-11">Cancelar</Link>
        <button className="btn-primary">{submitLabel}</button>
      </div>

      <Modal open={rapido === "cliente"} onOpenChange={(o) => !o && setRapido(null)} title="Novo cliente" description="Cadastro rápido. Os dados do orçamento serão mantidos.">
        <QuickCliente onCancelar={() => setRapido(null)} onCriado={(c) => { setF((p) => ({ ...p, clienteId: c.id, veiculoId: "" })); setRapido(null); }} />
      </Modal>
      <Modal open={rapido === "veiculo"} onOpenChange={(o) => !o && setRapido(null)} title="Novo veículo" description={cliente ? `Será vinculado a ${cliente.nome}.` : ""}>
        {cliente && <QuickVeiculo clienteId={cliente.id} onCancelar={() => setRapido(null)} onCriado={(v) => { setF((p) => ({ ...p, veiculoId: v.id, quilometragem: p.quilometragem || v.quilometragem })); setRapido(null); }} />}
      </Modal>
      <Modal open={rapido === "produto"} onOpenChange={(o) => !o && setRapido(null)} title="Novo produto" description="O produto será salvo e adicionado ao orçamento.">
        <ProdutoForm simplificado inicial={produtoVazio()} submitLabel="Salvar e adicionar" onCancelar={() => setRapido(null)} onSalvar={(d) => { const p = criarProduto(d); addItem(novoItem("produto", { refId: p.id, descricao: p.nome, valorUnit: p.preco })); setRapido(null); }} />
      </Modal>
      <Modal open={rapido === "servico"} onOpenChange={(o) => !o && setRapido(null)} title="Novo serviço" description="O serviço será salvo e adicionado ao orçamento.">
        <ServicoForm simplificado inicial={servicoVazio()} submitLabel="Salvar e adicionar" onCancelar={() => setRapido(null)} onSalvar={(d) => { const s = criarServico(d); addItem(novoItem("servico", { refId: s.id, descricao: s.nome, valorUnit: s.preco })); setRapido(null); }} />
      </Modal>
    </form>
  );
}

export function ResumoFinanceiro({ totais }: { totais: ReturnType<typeof calcularTotais> }) {
  const linha = (l: string, v: string) => (<div className="flex justify-between text-sm"><span className="text-muted-foreground">{l}</span><span>{v}</span></div>);
  return (
    <section className="panel h-fit space-y-2 p-5">
      <h2 className="mb-2 text-lg font-bold uppercase text-metal">Resumo financeiro</h2>
      {linha("Total de serviços", moeda(totais.servicos))}
      {linha("Total de produtos", moeda(totais.produtos))}
      {linha("Descontos", `− ${moeda(totais.descontos)}`)}
      {linha("Acréscimos", `+ ${moeda(totais.acrescimos)}`)}
      <div className="racing-line my-3" />
      <div className="flex items-end justify-between">
        <span className="font-display text-lg font-bold uppercase">Total</span>
        <span className="font-display text-3xl font-bold text-primary">{moeda(totais.total)}</span>
      </div>
    </section>
  );
}
