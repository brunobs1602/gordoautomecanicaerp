import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { clienteSchema, ORIGENS, UFS, type ClienteInput } from "@/lib/clientes";
import { mascaraCEP, mascaraDocumento, mascaraTelefone } from "@/lib/validacao";
import { Field, FormError } from "@/components/AuthCard";

type Erros = Partial<Record<keyof ClienteInput, string>>;

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="panel p-5">
      <h2 className="mb-4 text-lg font-bold uppercase text-metal">{titulo}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-metal">{label}</span>
      <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>{children}</select>
    </label>
  );
}

export function ClienteForm({ inicial, onSalvar, submitLabel, cancelarPara }: {
  inicial: ClienteInput;
  onSalvar: (dados: ClienteInput) => void;
  submitLabel: string;
  cancelarPara: { to: string; params?: Record<string, string> };
}) {
  const [f, setF] = useState<ClienteInput>(inicial);
  const [erros, setErros] = useState<Erros>({});
  const [erro, setErro] = useState("");
  const pf = f.tipo === "PF";

  const set = <K extends keyof ClienteInput>(k: K, v: ClienteInput[K]) => setF((p) => ({ ...p, [k]: v }));
  const txt = (k: keyof ClienteInput, mask?: (v: string) => string) => ({
    value: String(f[k] ?? ""),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(k, (mask ? mask(e.target.value) : e.target.value) as never),
    error: erros[k],
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    const r = clienteSchema.safeParse(f);
    if (!r.success) {
      const map: Erros = {};
      for (const i of r.error.issues) map[i.path[0] as keyof ClienteInput] ??= i.message;
      setErros(map);
      setErro("Corrija os campos destacados.");
      return;
    }
    setErros({});
    try {
      onSalvar(r.data as ClienteInput);
    } catch (err) {
      setErro((err as Error).message);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <FormError message={erro} />
      <Secao titulo="Identificação">
        <Select label="Tipo de pessoa" value={f.tipo} onChange={(v) => setF((p) => ({ ...p, tipo: v as "PF" | "PJ", documento: mascaraDocumento(p.documento, v as "PF" | "PJ") }))}>
          <option value="PF">Pessoa Física</option>
          <option value="PJ">Pessoa Jurídica</option>
        </Select>
        <Field label={pf ? "Nome completo *" : "Razão social *"} {...txt("nome")} />
        <Field label="Nome fantasia" {...txt("nomeFantasia")} />
        <Field label={pf ? "CPF *" : "CNPJ *"} inputMode="numeric" {...txt("documento", (v) => mascaraDocumento(v, f.tipo))} />
        <Field label={pf ? "RG" : "Inscrição estadual"} {...txt("rgIe")} />
        <Field label={pf ? "Data de nascimento" : "Data de abertura"} type="date" {...txt("dataNascimento")} />
      </Secao>

      <Secao titulo="Contato">
        <Field label="E-mail" type="email" {...txt("email")} />
        <Field label="Telefone principal" inputMode="tel" {...txt("telefone", mascaraTelefone)} />
        <Field label="Telefone/WhatsApp secundário" inputMode="tel" {...txt("telefone2", mascaraTelefone)} />
      </Secao>

      <Secao titulo="Endereço">
        <Field label="CEP" inputMode="numeric" {...txt("cep", mascaraCEP)} />
        <Field label="Logradouro" {...txt("logradouro")} />
        <Field label="Número" {...txt("numero")} />
        <Field label="Complemento" {...txt("complemento")} />
        <Field label="Bairro" {...txt("bairro")} />
        <Field label="Cidade" {...txt("cidade")} />
        <Select label="Estado" value={f.estado} onChange={(v) => set("estado", v)}>
          <option value="">Selecione</option>
          {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
        </Select>
        <Field label="País" {...txt("pais")} />
      </Secao>

      <Secao titulo="Outras informações">
        <Select label="Origem do cliente" value={f.origem} onChange={(v) => set("origem", v)}>
          <option value="">Selecione</option>
          {ORIGENS.map((o) => <option key={o} value={o}>{o}</option>)}
        </Select>
        <Select label="Status" value={f.ativo ? "1" : "0"} onChange={(v) => set("ativo", v === "1")}>
          <option value="1">Ativo</option>
          <option value="0">Inativo</option>
        </Select>
        <label className="block space-y-1.5 sm:col-span-2 lg:col-span-3">
          <span className="text-sm font-medium text-metal">Observações</span>
          <textarea className="field h-28 py-2" value={f.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
          {erros.observacoes && <span className="text-xs text-destructive">{erros.observacoes}</span>}
        </label>
      </Secao>

      <div className="flex flex-wrap justify-end gap-3">
        <Link {...(cancelarPara as { to: "/clientes" })} className="btn-ghost h-11">Cancelar</Link>
        <button className="btn-primary">{submitLabel}</button>
      </div>
    </form>
  );
}
