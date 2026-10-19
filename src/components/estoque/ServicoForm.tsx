import { useState } from "react";
import { servicoSchema, type ServicoInput } from "@/lib/servicos";
import { Field, FormError } from "@/components/AuthCard";
import { MoneyInput } from "@/components/MoneyInput";
import { CategoriaCombo } from "./CategoriaCombo";

type Erros = Partial<Record<keyof ServicoInput, string>>;

export function ServicoForm({ inicial, onSalvar, onCancelar, simplificado, submitLabel = "Salvar serviço" }: {
  inicial: ServicoInput; onSalvar: (d: ServicoInput) => void; onCancelar: () => void; simplificado?: boolean; submitLabel?: string;
}) {
  const [f, setF] = useState({ ...inicial, codigo: inicial.codigo ?? "" });
  const [erro, setErro] = useState("");
  const [erros, setErros] = useState<Erros>({});
  const txt = (k: "nome" | "codigo" | "tempoEstimado") => ({
    value: String(f[k]),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value })),
    error: erros[k],
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const r = servicoSchema.safeParse(f);
    if (!r.success) {
      const m: Erros = {};
      for (const i of r.error.issues) m[i.path[0] as keyof ServicoInput] ??= i.message;
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
        <div className="sm:col-span-2"><Field label="Nome do serviço *" {...txt("nome")} /></div>
        <Field label="Código" placeholder="Gerado automaticamente se vazio" {...txt("codigo")} />
        <CategoriaCombo tipo="servico" value={f.categoria} onChange={(v) => setF((p) => ({ ...p, categoria: v }))} />
        <MoneyInput label="Preço padrão" value={f.preco} error={erros.preco} onChange={(n) => setF((p) => ({ ...p, preco: n }))} />
        <Field label="Tempo estimado" placeholder="Ex.: 1h30" {...txt("tempoEstimado")} />
        {!simplificado && (
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-metal">Status</span>
            <select className="field" value={f.ativo ? "1" : "0"} onChange={(e) => setF((p) => ({ ...p, ativo: e.target.value === "1" }))}>
              <option value="1">Ativo</option>
              <option value="0">Inativo</option>
            </select>
          </label>
        )}
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-sm font-medium text-metal">Descrição</span>
          <textarea className="field h-20 py-2" value={f.descricao} onChange={(e) => setF((p) => ({ ...p, descricao: e.target.value }))} />
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost h-11" onClick={onCancelar}>Cancelar</button>
        <button className="btn-primary">{submitLabel}</button>
      </div>
    </form>
  );
}
