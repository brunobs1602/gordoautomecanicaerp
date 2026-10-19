import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, Pencil, Plus, Power, Search, Trash2, Users } from "lucide-react";
import { alterarStatusCliente, excluirCliente, useClientes } from "@/lib/clientes";
import { useCurrentUser } from "@/lib/auth";
import { useVeiculos } from "@/lib/veiculos";
import { mascaraDocumento, mascaraTelefone, soDigitos } from "@/lib/validacao";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusBadge, TipoBadge } from "@/components/clientes/StatusBadge";

export const Route = createFileRoute("/_authenticated/clientes/")({
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
  const isAdmin = useCurrentUser()?.role === "admin";
  const veiculos = useVeiculos();
  const comVeiculo = useMemo(() => new Set(veiculos.map((v) => v.clienteId)), [veiculos]);
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState<"" | "PF" | "PJ">("");
  const [ordem, setOrdem] = useState<"nome" | "recentes" | "antigos">("nome");

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const qd = soDigitos(q);
    return clientes
      .filter((c) => !tipo || c.tipo === tipo)
      .filter((c) =>
        !q ||
        c.nome.toLowerCase().includes(q) ||
        c.nomeFantasia.toLowerCase().includes(q) ||
        c.email.includes(q) ||
        (qd.length > 0 && (c.documento.includes(qd) || soDigitos(c.telefone).includes(qd) || soDigitos(c.telefone2).includes(qd))),
      )
      .sort((a, b) =>
        ordem === "nome" ? a.nome.localeCompare(b.nome, "pt-BR")
          : ordem === "recentes" ? b.criadoEm.localeCompare(a.criadoEm)
          : a.criadoEm.localeCompare(b.criadoEm),
      );
  }, [clientes, busca, tipo, ordem]);

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle={`${clientes.length} cliente(s) cadastrado(s)`}
        action={<Link to="/clientes/novo" className="btn-primary"><Plus className="h-4 w-4" /> Novo cliente</Link>}
      />

      <div className="panel mb-4 grid gap-3 p-4 md:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input className="field pl-9" placeholder="Buscar por nome, CPF/CNPJ, telefone ou e-mail" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <select className="field md:w-48" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)} aria-label="Tipo de pessoa">
          <option value="">Todos os tipos</option>
          <option value="PF">Pessoa Física</option>
          <option value="PJ">Pessoa Jurídica</option>
        </select>
        <select className="field md:w-52" value={ordem} onChange={(e) => setOrdem(e.target.value as typeof ordem)} aria-label="Ordenar">
          <option value="nome">Ordenar por nome</option>
          <option value="recentes">Cadastro mais recente</option>
          <option value="antigos">Cadastro mais antigo</option>
        </select>
      </div>

      {clientes.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 p-12 text-center">
          <Users className="h-10 w-10 text-primary" />
          <h2 className="text-2xl font-bold uppercase">Nenhum cliente cadastrado</h2>
          <p className="text-sm text-muted-foreground">Comece cadastrando o primeiro cliente da oficina.</p>
          <Link to="/clientes/novo" className="btn-primary mt-2"><Plus className="h-4 w-4" /> Novo cliente</Link>
        </div>
      ) : lista.length === 0 ? (
        <div className="panel p-10 text-center text-muted-foreground">Nenhum cliente encontrado para esta busca.</div>
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
                      <Link to="/clientes/$id/editar" params={{ id: c.id }} className="btn-ghost px-2.5" title="Editar"><Pencil className="h-4 w-4" /></Link>
                      <ConfirmDialog
                        trigger={<button className="btn-ghost px-2.5" title={c.ativo ? "Inativar" : "Ativar"}><Power className="h-4 w-4" /></button>}
                        title={c.ativo ? "Inativar cliente?" : "Ativar cliente?"}
                        description={`Deseja ${c.ativo ? "inativar" : "ativar"} o cliente "${c.nome}"?`}
                        confirmLabel={c.ativo ? "Inativar" : "Ativar"}
                        onConfirm={() => alterarStatusCliente(c.id, !c.ativo)}
                      />
                      {isAdmin && !comVeiculo.has(c.id) && (
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
