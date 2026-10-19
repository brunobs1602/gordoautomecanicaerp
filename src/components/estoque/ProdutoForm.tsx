import { useState } from "react";
import { produtoSchema, UNIDADES, type ProdutoInput } from "@/lib/produtos";
import { Field, FormError } from "@/components/AuthCard";

type Erros = Partial<Record<keyof ProdutoInput, string>>;
const NUM: (keyof ProdutoInput)[] = ["custo", "preco", "estoque", "estoqueMinimo"];

/** Formulário de produto. `simplificado` mostra apenas os campos do cadastro rápido. */
export function ProdutoForm({ inicial, onSalvar, onCancelar, simplificado, submitLabel = "Salvar produto" }: {
  inicial: ProdutoInput; onSalvar: (d: ProdutoInput) => void; onCancelar: () => void; simplificado?: boolean; submitLabel?: string;
}) {
  const [f, setF] = useState<Record<keyof ProdutoInput, string | boolean>>(
    Object.fromEntries(Object.entries(inicial).map(([k, v]) => [k, typeof v === "number" ? String(v) : v])) as never,
  );
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
        <Field label="Código interno" {...txt("codigo")} />
        {!simplificado && <Field label="Código de barras" inputMode="numeric" {...txt("codigoBarras")} />}
        <Field label="Categoria" {...txt("categoria")} />
        {!simplificado && <Field label="Marca" {...txt("marca")} />}
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-metal">Unidade</span>
          <select className="field" value={String(f.unidade)} onChange={(e) => setF((p) => ({ ...p, unidade: e.target.value }))}>
            {UNIDADES.map((u) => <option key={u}>{u}</option>)}
          </select>
        </label>
        <Field label="Preço de custo (R$)" type="number" step="0.01" min="0" {...txt("custo")} />
        <Field label="Preço de venda (R$)" type="number" step="0.01" min="0" {...txt("preco")} />
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
