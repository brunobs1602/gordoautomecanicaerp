import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CAMBIOS, CATEGORIAS, COMBUSTIVEIS, TIPOS, formatarPlaca, normalizarChassi, veiculoSchema, type VeiculoInput } from "@/lib/veiculos";
import { soDigitos } from "@/lib/validacao";
import { Field, FormError } from "@/components/AuthCard";
import { ClienteSelect } from "./ClienteSelect";
import { MarcaCombo } from "./MarcaCombo";
import { useConfig } from "@/lib/config";

type Erros = Partial<Record<keyof VeiculoInput, string>>;

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="panel p-5">
      <h2 className="mb-4 text-lg font-bold uppercase text-metal">{titulo}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

function Opcoes({ label, value, onChange, opcoes }: { label: string; value: string; onChange: (v: string) => void; opcoes: string[] }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-metal">{label}</span>
      <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>
        {opcoes.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

export function VeiculoForm({ inicial, onSalvar, submitLabel, cancelarPara, mostrarCliente = true }: {
  inicial: VeiculoInput;
  onSalvar: (d: VeiculoInput) => void;
  submitLabel: string;
  cancelarPara: { to: string; params?: Record<string, string> };
  mostrarCliente?: boolean;
}) {
  const [f, setF] = useState<VeiculoInput>(inicial);
  const [erros, setErros] = useState<Erros>({});
  const [erro, setErro] = useState("");
  const set = <K extends keyof VeiculoInput>(k: K, v: VeiculoInput[K]) => setF((p) => ({ ...p, [k]: v }));
  const txt = (k: keyof VeiculoInput, mask?: (v: string) => string) => ({
    value: String(f[k] ?? ""),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(k, (mask ? mask(e.target.value) : e.target.value) as never),
    error: erros[k],
  });
  const cad = useConfig().cadastros;
  const num = (max: number) => (v: string) => soDigitos(v).slice(0, max);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    const r = veiculoSchema.safeParse(f);
    if (!r.success) {
      const map: Erros = {};
      for (const i of r.error.issues) map[i.path[0] as keyof VeiculoInput] ??= i.message;
      setErros(map);
      setErro("Corrija os campos destacados.");
      return;
    }
    setErros({});
    try {
      onSalvar(r.data as VeiculoInput);
    } catch (err) {
      setErro((err as Error).message);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <FormError message={erro} />
      {mostrarCliente && (
        <section className="panel p-5">
          <h2 className="mb-4 text-lg font-bold uppercase text-metal">Proprietário</h2>
          <ClienteSelect value={f.clienteId} onChange={(id) => set("clienteId", id)} error={erros.clienteId} />
        </section>
      )}
      <Secao titulo="Identificação">
        <Field label={cad.exigirPlaca !== false ? "Placa *" : "Placa"} {...txt("placa", formatarPlaca)} placeholder="ABC-1234 ou ABC1D23" />
        <Field label="Renavam" inputMode="numeric" {...txt("renavam", num(11))} />
        <Field label="Chassi" {...txt("chassi", normalizarChassi)} />
        <MarcaCombo value={f.marca} onChange={(v) => set("marca", v)} error={erros.marca} />
        <Field label="Modelo" {...txt("modelo")} />
        <Field label="Versão" {...txt("versao")} />
        <Field label="Ano de fabricação" inputMode="numeric" {...txt("anoFabricacao", num(4))} />
        <Field label="Ano do modelo" inputMode="numeric" {...txt("anoModelo", num(4))} />
        <Field label="Cor" {...txt("cor")} />
      </Secao>
      <Secao titulo="Características">
        <Opcoes label="Tipo de veículo" value={f.tipo} onChange={(v) => set("tipo", v)} opcoes={TIPOS} />
        <Opcoes label="Categoria" value={f.categoria} onChange={(v) => set("categoria", v)} opcoes={CATEGORIAS} />
        <Opcoes label="Combustível" value={f.combustivel} onChange={(v) => set("combustivel", v)} opcoes={COMBUSTIVEIS} />
        <Field label={cad.exigirKm === true ? "Quilometragem atual *" : "Quilometragem atual"} inputMode="numeric" {...txt("quilometragem", (v) => v.replace(/[^\d-]/g, "").slice(0, 8))} />
        <Field label="Número de portas" inputMode="numeric" {...txt("portas", num(2))} />
        <Opcoes label="Câmbio" value={f.cambio} onChange={(v) => set("cambio", v)} opcoes={CAMBIOS} />
      </Secao>
      <Secao titulo="Outras informações">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-metal">Status</span>
          <select className="field" value={f.ativo ? "1" : "0"} onChange={(e) => set("ativo", e.target.value === "1")}>
            <option value="1">Ativo</option>
            <option value="0">Inativo</option>
          </select>
        </label>
        <label className="block space-y-1.5 sm:col-span-2 lg:col-span-3">
          <span className="text-sm font-medium text-metal">Observações gerais</span>
          <textarea className="field h-28 py-2" value={f.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
          {erros.observacoes && <span className="text-xs text-destructive">{erros.observacoes}</span>}
        </label>
      </Secao>
      <div className="flex flex-wrap justify-end gap-3">
        <Link {...(cancelarPara as { to: "/veiculos" })} className="btn-ghost h-11">Cancelar</Link>
        <button className="btn-primary">{submitLabel}</button>
      </div>
    </form>
  );
}
