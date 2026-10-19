import { useState } from "react";
import { clienteSchema, clienteVazio, criarCliente, getClientes, type Cliente } from "@/lib/clientes";
import { criarVeiculo, formatarPlaca, veiculoSchema, veiculoVazio, type Veiculo } from "@/lib/veiculos";
import { mascaraDocumento, mascaraTelefone } from "@/lib/validacao";
import { Field, FormError } from "@/components/AuthCard";

const clienteExiste = (id: string) => getClientes().some((c) => c.id === id);

function mapErros(issues: { path: (string | number)[]; message: string }[]) {
  const m: Record<string, string> = {};
  for (const i of issues) m[String(i.path[0])] ??= i.message;
  return m;
}

export function QuickCliente({ onCriado, onCancelar }: { onCriado: (c: Cliente) => void; onCancelar: () => void }) {
  const [f, setF] = useState({ ...clienteVazio() });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erro, setErro] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const r = clienteSchema.safeParse(f);
    if (!r.success) return setErros(mapErros(r.error.issues));
    try {
      onCriado(criarCliente(r.data as typeof f));
    } catch (err) {
      setErro((err as Error).message);
    }
  };
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <FormError message={erro} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-metal">Tipo de pessoa</span>
          <select className="field" value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value as "PF" | "PJ", documento: "" })}>
            <option value="PF">Pessoa Física</option>
            <option value="PJ">Pessoa Jurídica</option>
          </select>
        </label>
        <Field label={f.tipo === "PF" ? "CPF *" : "CNPJ *"} value={f.documento} error={erros["documento"]} onChange={(e) => setF({ ...f, documento: mascaraDocumento(e.target.value, f.tipo) })} />
        <div className="sm:col-span-2">
          <Field label={f.tipo === "PF" ? "Nome completo *" : "Razão social *"} value={f.nome} error={erros["nome"]} onChange={(e) => setF({ ...f, nome: e.target.value })} />
        </div>
        <Field label="Telefone" value={f.telefone} error={erros["telefone"]} onChange={(e) => setF({ ...f, telefone: mascaraTelefone(e.target.value) })} />
        <Field label="E-mail" type="email" value={f.email} error={erros["email"]} onChange={(e) => setF({ ...f, email: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost h-11" onClick={onCancelar}>Cancelar</button>
        <button className="btn-primary">Salvar cliente</button>
      </div>
    </form>
  );
}

export function QuickVeiculo({ clienteId, onCriado, onCancelar }: { clienteId: string; onCriado: (v: Veiculo) => void; onCancelar: () => void }) {
  const [f, setF] = useState(veiculoVazio(clienteId));
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erro, setErro] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const r = veiculoSchema.safeParse(f);
    if (!r.success) return setErros(mapErros(r.error.issues));
    try {
      onCriado(criarVeiculo(r.data as typeof f, clienteExiste));
    } catch (err) {
      setErro((err as Error).message);
    }
  };
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <FormError message={erro} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Placa *" placeholder="ABC-1234 ou ABC1D23" value={f.placa} error={erros["placa"]} onChange={(e) => setF({ ...f, placa: formatarPlaca(e.target.value) })} />
        <Field label="Marca" value={f.marca} onChange={set("marca")} />
        <Field label="Modelo" value={f.modelo} onChange={set("modelo")} />
        <Field label="Ano do modelo" inputMode="numeric" value={f.anoModelo} error={erros["anoModelo"]} onChange={set("anoModelo")} />
        <Field label="Cor" value={f.cor} onChange={set("cor")} />
        <Field label="Quilometragem" inputMode="numeric" value={f.quilometragem} error={erros["quilometragem"]} onChange={set("quilometragem")} />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost h-11" onClick={onCancelar}>Cancelar</button>
        <button className="btn-primary">Salvar veículo</button>
      </div>
    </form>
  );
}
