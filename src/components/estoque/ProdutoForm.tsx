import { useState } from "react";
import { produtoSchema, UNIDADES, type ProdutoInput } from "@/lib/produtos";
import { Field, FormError } from "@/components/AuthCard";
import { MoneyInput } from "@/components/MoneyInput";
import { CategoriaCombo } from "./CategoriaCombo";

type Erros = Partial<Record<keyof ProdutoInput, string>>;
const NUM: (keyof ProdutoInput)[] = ["estoque", "estoqueMinimo"];

/** Formulário de produto. `simplificado` mostra apenas os campos do cadastro rápido. */
export function ProdutoForm({ inicial, onSalvar, onCancelar, simplificado, submitLabel = "Salvar produto" }: {
  inicial: ProdutoInput; onSalvar: (d: ProdutoInput) => void; onCancelar: () => void; simplificado?: boolean; submitLabel?: string;
}) {
  const [f, setF] = useState<Record<keyof ProdutoInput, string | boolean>>(
    Object.fromEntries(Object.entries(inicial).map(([k, v]) => [k, typeof v === "number" ? String(v) : v])) as never,
  );
  const [valores, setValores] = useState({ custo: inicial.custo, preco: inicial.preco });
  const [erros, setErros] = useState<Erros>({});
  const [erro, setErro] = useState("");
  const txt = (k: keyof ProdutoInput) => ({
    value: String(f[k]),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value })),
    error: erros[k],
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const dados = { ...f } as Record<string, unknown>;
    for (const k of NUM) dados[k] = f[k] === "" ? 0 : Number(String(f[k]).replace(",", "."));
    Object.assign(dados, valores);
    const r = produtoSchema.safeParse(dados);
    if (!r.success) {
      const m: Erros = {};
      for (const i of r.error.issues) m[i.path[0] as keyof ProdutoInput] ??= i.message;
      return setErros(m);
    }
    setErros({});
    try {
      onSalvar(r.data);
    } catch (err) {
      setErro((err as Error).message);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <FormError message={erro} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="Nome do produto *" {...txt("nome")} /></div>
        <Field label="Código interno" placeholder="Gerado automaticamente se vazio" {...txt("codigo")} />
        {!simplificado && <Field label="Código de barras" inputMode="numeric" {...txt("codigoBarras")} />}
        <CategoriaCombo tipo="produto" value={String(f.categoria)} onChange={(v) => setF((p) => ({ ...p, categoria: v }))} />
        {!simplificado && <Field label="Marca" {...txt("marca")} />}
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-metal">Unidade</span>
          <select className="field" value={String(f.unidade)} onChange={(e) => setF((p) => ({ ...p, unidade: e.target.value }))}>
            {UNIDADES.map((u) => <option key={u}>{u}</option>)}
          </select>
        </label>
        <MoneyInput label="Preço de custo" value={valores.custo} error={erros.custo} onChange={(n) => setValores((v) => ({ ...v, custo: n }))} />
        <MoneyInput label="Preço de venda" value={valores.preco} error={erros.preco} onChange={(n) => setValores((v) => ({ ...v, preco: n }))} />
        <Field label={simplificado ? "Estoque inicial" : "Estoque atual"} type="number" step="1" min="0" {...txt("estoque")} />
        {!simplificado && (
          <>
            <Field label="Estoque mínimo" type="number" step="1" min="0" {...txt("estoqueMinimo")} />
            <Field label="Localização" placeholder="Ex.: Prateleira A3" {...txt("localizacao")} />
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-metal">Status</span>
              <select className="field" value={f.ativo ? "1" : "0"} onChange={(e) => setF((p) => ({ ...p, ativo: e.target.value === "1" }))}>
                <option value="1">Ativo</option>
                <option value="0">Inativo</option>
              </select>
            </label>
            <label className="block space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium text-metal">Descrição</span>
              <textarea className="field h-20 py-2" value={String(f.descricao)} onChange={(e) => setF((p) => ({ ...p, descricao: e.target.value }))} />
            </label>
          </>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost h-11" onClick={onCancelar}>Cancelar</button>
        <button className="btn-primary">{submitLabel}</button>
      </div>
    </form>
  );
}
