import { useState } from "react";
import { servicoSchema, type ServicoInput } from "@/lib/servicos";
import { Field } from "@/components/AuthCard";

type Erros = Partial<Record<keyof ServicoInput, string>>;

export function ServicoForm({ inicial, onSalvar, onCancelar, simplificado, submitLabel = "Salvar serviço" }: {
  inicial: ServicoInput; onSalvar: (d: ServicoInput) => void; onCancelar: () => void; simplificado?: boolean; submitLabel?: string;
}) {
  const [f, setF] = useState({ ...inicial, preco: String(inicial.preco) });
  const [erros, setErros] = useState<Erros>({});
  const txt = (k: keyof typeof f) => ({
    value: String(f[k]),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value })),
    error: erros[k],
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const r = servicoSchema.safeParse({ ...f, preco: f.preco === "" ? 0 : Number(f.preco.replace(",", ".")) });
    if (!r.success) {
      const m: Erros = {};
      for (const i of r.error.issues) m[i.path[0] as keyof ServicoInput] ??= i.message;
      return setErros(m);
    }
    onSalvar(r.data);
  };
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="Nome do serviço *" {...txt("nome")} /></div>
        <Field label="Categoria" {...txt("categoria")} />
        <Field label="Preço padrão (R$)" type="number" step="0.01" min="0" {...txt("preco")} />
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
