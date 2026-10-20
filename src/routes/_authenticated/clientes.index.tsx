import { guard, useAcesso } from "@/lib/acesso";
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, Pencil, Plus, Power, Search, Trash2, Users, X } from "lucide-react";
import { BotaoAtualizar } from "@/components/BotaoAtualizar";
import { alterarStatusCliente, excluirCliente, useClientes } from "@/lib/clientes";
import { useVeiculos } from "@/lib/veiculos";
import { mascaraDocumento, mascaraTelefone, soDigitos } from "@/lib/validacao";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusBadge, TipoBadge } from "@/components/clientes/StatusBadge";

export const Route = createFileRoute("/_authenticated/clientes/")({
  beforeLoad: guard(["clientes"]),
  head: () => ({
    meta: [
      { title: "Clientes · Gordo Auto Mecânica ERP" },
      { name: "description", content: "Cadastro e consulta de clientes da oficina." },
      { property: "og:title", content: "Clientes · Gordo ERP" },
      { property: "og:description", content: "Cadastro e consulta de clientes da oficina." },
    ],
  }),
  component: ListaClientes,
});

function ListaClientes() {
  const clientes = useClientes();
  const { pode } = useAcesso();
  const veiculos = useVeiculos();
  const comVeiculo = useMemo(() => new Set(veiculos.map((v) => v.clienteId)), [veiculos]);
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState<"" | "PF" | "PJ">("");
  const [status, setStatus] = useState<"" | "true" | "false">("");
  const [ordem, setOrdem] = useState<"nome" | "recentes" | "antigos">("nome");
  const filtrado = !!(busca.trim() || tipo || status);
  const limpar = () => { setBusca(""); setTipo(""); setStatus(""); };
  const inativos = clientes.filter((c) => !c.ativo).length;

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const qd = soDigitos(q);
    const t = (v: unknown) => String(v ?? "").toLowerCase();
    return clientes
      .filter((c) => !tipo || c.tipo === tipo)
      .filter((c) => !status || String(c.ativo) === status)
      .filter((c) =>
        !q ||
        t(c.nome).includes(q) ||
        t(c.nomeFantasia).includes(q) ||
        t(c.email).includes(q) ||
        (qd.length > 0 && (soDigitos(c.documento).includes(qd) || soDigitos(c.telefone).includes(qd) || soDigitos(c.telefone2).includes(qd))),
      )
      .sort((a, b) =>
        ordem === "nome" ? t(a.nome).localeCompare(t(b.nome), "pt-BR")
          : ordem === "recentes" ? t(b.criadoEm).localeCompare(t(a.criadoEm))
          : t(a.criadoEm).localeCompare(t(b.criadoEm)),
      );
  }, [clientes, busca, tipo, status, ordem]);

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle={`${clientes.length} cliente(s) cadastrado(s)${inativos ? ` · ${inativos} inativo(s)` : ""}`}
        action={<div className="flex gap-2"><BotaoAtualizar />{pode("clientes", "criar") && <Link to="/clientes/novo" className="btn-primary"><Plus className="h-4 w-4" /> Novo cliente</Link>}</div>}
      />

      <div className="panel mb-4 grid gap-3 p-4 md:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input className="field pl-9" placeholder="Buscar por nome, CPF/CNPJ, telefone ou e-mail" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <select className="field md:w-48" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)} aria-label="Tipo de pessoa">
          <option value="">Todos os tipos</option>
          <option value="PF">Pessoa Física</option>
          <option value="PJ">Pessoa Jurídica</option>
        </select>
        <select className="field md:w-40" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Status">
          <option value="">Todos status</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select>
        <select className="field md:w-52" value={ordem} onChange={(e) => setOrdem(e.target.value as typeof ordem)} aria-label="Ordenar">
          <option value="nome">Ordenar por nome</option>
          <option value="recentes">Cadastro mais recente</option>
          <option value="antigos">Cadastro mais antigo</option>
        </select>
      </div>
      {filtrado && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          Mostrando {lista.length} de {clientes.length} cliente(s) com filtro aplicado.
          <button className="btn-ghost px-2.5 py-1 text-xs" onClick={limpar}><X className="h-3.5 w-3.5" /> Limpar filtros</button>
        </div>
      )}

      {clientes.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 p-12 text-center">
          <Users className="h-10 w-10 text-primary" />
          <h2 className="text-2xl font-bold uppercase">Nenhum cliente cadastrado</h2>
          <p className="text-sm text-muted-foreground">Comece cadastrando o primeiro cliente da oficina.</p>
          {pode("clientes", "criar") && <Link to="/clientes/novo" className="btn-primary mt-2"><Plus className="h-4 w-4" /> Novo cliente</Link>}
        </div>
      ) : lista.length === 0 ? (
        <div className="panel p-10 text-center text-muted-foreground">Nenhum cliente encontrado com estes filtros. <button className="text-primary underline" onClick={limpar}>Limpar filtros</button></div>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="p-4">Cliente</th>
                <th className="p-4">CPF/CNPJ</th>
                <th className="p-4">Telefone</th>
                <th className="p-4">Cadastro</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                  <td className="p-4">
                    <div className="font-medium">{c.nome}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <TipoBadge tipo={c.tipo} /> {c.email}
                    </div>
                  </td>
                  <td className="p-4 font-mono text-xs">{mascaraDocumento(c.documento, c.tipo)}</td>
                  <td className="p-4">{c.telefone ? mascaraTelefone(c.telefone) : "—"}</td>
                  <td className="p-4 text-muted-foreground">{new Date(c.criadoEm).toLocaleDateString("pt-BR")}</td>
                  <td className="p-4"><StatusBadge ativo={c.ativo} /></td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1.5">
                      <Link to="/clientes/$id" params={{ id: c.id }} className="btn-ghost px-2.5" title="Visualizar"><Eye className="h-4 w-4" /></Link>
                      {pode("clientes", "editar") && <Link to="/clientes/$id/editar" params={{ id: c.id }} className="btn-ghost px-2.5" title="Editar"><Pencil className="h-4 w-4" /></Link>}
                      {pode("clientes", "inativar") && <ConfirmDialog
                        trigger={<button className="btn-ghost px-2.5" title={c.ativo ? "Inativar" : "Ativar"}><Power className="h-4 w-4" /></button>}
                        title={c.ativo ? "Inativar cliente?" : "Ativar cliente?"}
                        description={`Deseja ${c.ativo ? "inativar" : "ativar"} o cliente "${c.nome}"?`}
                        confirmLabel={c.ativo ? "Inativar" : "Ativar"}
                        onConfirm={() => alterarStatusCliente(c.id, !c.ativo)}
                      />}
                      {pode("clientes", "excluir") && !comVeiculo.has(c.id) && (
                        <ConfirmDialog
                          trigger={<button className="btn-ghost px-2.5 hover:text-destructive" title="Excluir"><Trash2 className="h-4 w-4" /></button>}
                          title="Excluir cliente?"
                          description={`O cliente "${c.nome}" será excluído definitivamente. Esta ação não pode ser desfeita.`}
                          confirmLabel="Excluir"
                          onConfirm={() => excluirCliente(c.id)}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
