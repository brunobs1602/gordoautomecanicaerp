import { useState } from "react";
import { Check, Minus } from "lucide-react";
import { ACOES, MODULOS, todasPermissoes, type Acao, type Modulo, type Permissoes } from "@/lib/permissoes";
import type { PerfilInput } from "@/lib/perfis";
import { Field, FormError } from "@/components/AuthCard";

/** Tabela de permissões por módulo. Somente leitura quando onChange não for passado. */
export function MatrizPermissoes({ valor, onChange, bloqueado }: { valor: Permissoes; onChange?: (p: Permissoes) => void; bloqueado?: boolean | undefined }) {
  const editavel = Boolean(onChange) && !bloqueado;
  const tem = (m: Modulo, a: Acao) => valor[m]?.includes(a) ?? false;
  const set = (m: Modulo, acoes: Acao[]) => onChange?.({ ...valor, [m]: acoes });
  const alternar = (m: Modulo, a: Acao) => set(m, tem(m, a) ? (valor[m] ?? []).filter((x) => x !== a) : [...(valor[m] ?? []), a]);

  return (
    <div className="space-y-3">
      {editavel && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-ghost h-9 text-xs" onClick={() => onChange?.(todasPermissoes())}>Selecionar todas as permissões</button>
          <button type="button" className="btn-ghost h-9 text-xs" onClick={() => onChange?.({})}>Limpar todas as permissões</button>
        </div>
      )}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="p-3">Módulo</th>
              {ACOES.map((a) => <th key={a.key} className="p-2 text-center">{a.label}</th>)}
              {editavel && <th className="p-2 text-right">Módulo inteiro</th>}
            </tr>
          </thead>
          <tbody>
            {MODULOS.map((m) => (
              <tr key={m.key} className="border-b border-border/60 last:border-0">
                <td className="p-3 font-medium">{m.label}</td>
                {ACOES.map((a) => {
                  if (!m.acoes.includes(a.key)) return <td key={a.key} className="p-2 text-center text-muted-foreground/40">—</td>;
                  const on = bloqueado || tem(m.key, a.key);
                  return (
                    <td key={a.key} className="p-2 text-center">
                      <button
                        type="button"
                        disabled={!editavel}
                        aria-pressed={on}
                        aria-label={`${m.label}: ${a.label}`}
                        onClick={() => alternar(m.key, a.key)}
                        className={`inline-grid h-7 w-7 place-items-center rounded-md border transition-colors ${on ? "border-success bg-success/20 text-success" : "border-border text-muted-foreground"} ${editavel ? "hover:border-primary" : "cursor-default"}`}
                      >
                        {on ? <Check className="h-4 w-4" /> : <Minus className="h-3 w-3" />}
                      </button>
                    </td>
                  );
                })}
                {editavel && (
                  <td className="p-2 text-right whitespace-nowrap">
                    <button type="button" className="text-xs text-primary hover:underline" onClick={() => set(m.key, [...m.acoes])}>Todas</button>
                    <span className="mx-1 text-muted-foreground">·</span>
                    <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => set(m.key, [])}>Nenhuma</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {bloqueado && <p className="text-xs text-muted-foreground">O perfil Administrador sempre possui acesso total.</p>}
    </div>
  );
}

export function PerfilForm({ inicial, admin, onSalvar, onCancelar }: {
  inicial: PerfilInput; admin?: boolean; onSalvar: (d: PerfilInput) => void; onCancelar: () => void;
}) {
  const [d, setD] = useState(inicial);
  const [erro, setErro] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (d.nome.trim().length < 2) return setErro("Informe o nome do perfil.");
    try {
      onSalvar(d);
    } catch (err) {
      setErro((err as Error).message);
    }
  };
  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <FormError message={erro} />
      <div className="panel grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Nome do perfil *" value={d.nome} maxLength={60} onChange={(e) => setD({ ...d, nome: e.target.value })} />
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-metal">Status</span>
          <select className="field" value={d.ativo ? "1" : "0"} disabled={admin} onChange={(e) => setD({ ...d, ativo: e.target.value === "1" })}>
            <option value="1">Ativo</option>
            <option value="0">Inativo</option>
          </select>
        </label>
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-sm font-medium text-metal">Descrição</span>
          <textarea className="field min-h-20" maxLength={300} value={d.descricao} onChange={(e) => setD({ ...d, descricao: e.target.value })} />
        </label>
      </div>
      <div className="panel p-5">
        <h2 className="mb-3 text-xl font-bold uppercase">Permissões por módulo</h2>
        <MatrizPermissoes valor={d.permissoes} onChange={(p) => setD({ ...d, permissoes: p })} bloqueado={admin} />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost h-11" onClick={onCancelar}>Cancelar</button>
        <button className="btn-primary">Salvar perfil</button>
      </div>
    </form>
  );
}
