import { guard, useAcesso } from "@/lib/acesso";
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Car, Eye, Pencil, Plus, Power, Search, X } from "lucide-react";
import { BotaoAtualizar } from "@/components/BotaoAtualizar";
import { TIPOS, alterarStatusVeiculo, formatarPlaca, normalizarPlaca, useVeiculos } from "@/lib/veiculos";
import { useClientes } from "@/lib/clientes";
import { soDigitos } from "@/lib/validacao";
import { PageHeader } from "@/components/PageHeader";
import { ExcluirRegistro } from "@/components/ExcluirRegistro";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusBadge } from "@/components/clientes/StatusBadge";

export const Route = createFileRoute("/_authenticated/veiculos/")({
  beforeLoad: guard(["veiculos"]),
  head: () => ({
    meta: [
      { title: "Veículos · Gordo Auto Mecânica ERP" },
      { name: "description", content: "Cadastro e consulta de veículos dos clientes." },
      { property: "og:title", content: "Veículos · Gordo ERP" },
      { property: "og:description", content: "Cadastro e consulta de veículos dos clientes." },
    ],
  }),
  component: ListaVeiculos,
});

function ListaVeiculos() {
  const veiculos = useVeiculos();
  const clientes = useClientes();
  const { pode } = useAcesso();
  const [busca, setBusca] = useState("");
  const [marca, setMarca] = useState("");
  const [tipo, setTipo] = useState("");
  const [status, setStatus] = useState("");
  const [ordem, setOrdem] = useState<"placa" | "modelo" | "recentes" | "antigos">("placa");
  const filtrado = !!(busca.trim() || marca || tipo || status);
  const limpar = () => { setBusca(""); setMarca(""); setTipo(""); setStatus(""); };

  const porId = useMemo(() => new Map(clientes.map((c) => [c.id, c])), [clientes]);
  const marcas = useMemo(() => [...new Set(veiculos.map((v) => v.marca).filter(Boolean))].sort(), [veiculos]);
  const semDono = veiculos.filter((v) => !porId.has(v.clienteId)).length;

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const qd = soDigitos(q);
    const qp = normalizarPlaca(q);
    const t = (v: unknown) => String(v ?? "").toLowerCase();
    return veiculos
      .filter((v) => (!marca || v.marca === marca) && (!tipo || v.tipo === tipo) && (!status || String(v.ativo) === status))
      .filter((v) => {
        if (!q) return true;
        const c = porId.get(v.clienteId);
        return (
          (qp && t(v.placa).includes(qp.toLowerCase())) ||
          t(v.modelo).includes(q) ||
          t(v.marca).includes(q) ||
          (c && t(c.nome).includes(q)) ||
          (c && qd.length > 0 && soDigitos(c.documento).includes(qd))
        );
      })
      .sort((a, b) =>
        ordem === "placa" ? t(a.placa).localeCompare(t(b.placa))
          : ordem === "modelo" ? t(a.modelo).localeCompare(t(b.modelo), "pt-BR")
          : ordem === "recentes" ? t(b.criadoEm).localeCompare(t(a.criadoEm))
          : t(a.criadoEm).localeCompare(t(b.criadoEm)),
      );
  }, [veiculos, porId, busca, marca, tipo, status, ordem]);

  return (
    <>
      <PageHeader
        title="Veículos"
        subtitle={`${veiculos.length} veículo(s) cadastrado(s)`}
        action={<div className="flex gap-2"><BotaoAtualizar />{pode("veiculos", "criar") && <Link to="/veiculos/novo" className="btn-primary"><Plus className="h-4 w-4" /> Novo veículo</Link>}</div>}
      />
      {semDono > 0 && (
        <div className="panel mb-4 border-destructive/50 p-3 text-sm">
          {semDono} veículo(s) sem cliente proprietário válido. Eles continuam salvos; abra o veículo e use "Alterar proprietário" para corrigir.
        </div>
      )}

      <div className="panel mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto]">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input className="field pl-9" placeholder="Buscar por placa, modelo, marca, cliente ou CPF/CNPJ" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <select className="field lg:w-40" value={marca} onChange={(e) => setMarca(e.target.value)} aria-label="Marca">
          <option value="">Todas as marcas</option>
          {marcas.map((m) => <option key={m}>{m}</option>)}
        </select>
        <select className="field lg:w-40" value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo">
          <option value="">Todos os tipos</option>
          {TIPOS.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select className="field lg:w-36" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">Todos status</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select>
        <select className="field lg:w-48" value={ordem} onChange={(e) => setOrdem(e.target.value as typeof ordem)} aria-label="Ordenar">
          <option value="placa">Ordenar por placa</option>
          <option value="modelo">Ordenar por modelo</option>
          <option value="recentes">Cadastro mais recente</option>
          <option value="antigos">Cadastro mais antigo</option>
        </select>
      </div>
      {filtrado && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          Mostrando {lista.length} de {veiculos.length} veículo(s) com filtro aplicado.
          <button className="btn-ghost px-2.5 py-1 text-xs" onClick={limpar}><X className="h-3.5 w-3.5" /> Limpar filtros</button>
        </div>
      )}

      {veiculos.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 p-12 text-center">
          <Car className="h-10 w-10 text-primary" />
          <h2 className="text-2xl font-bold uppercase">Nenhum veículo cadastrado</h2>
          <p className="text-sm text-muted-foreground">Cadastre o primeiro veículo e vincule a um cliente.</p>
          {pode("veiculos", "criar") && <Link to="/veiculos/novo" className="btn-primary mt-2"><Plus className="h-4 w-4" /> Novo veículo</Link>}
        </div>
      ) : lista.length === 0 ? (
        <div className="panel p-10 text-center text-muted-foreground">Nenhum veículo encontrado com estes filtros. <button className="text-primary underline" onClick={limpar}>Limpar filtros</button></div>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="p-4">Placa</th>
                <th className="p-4">Veículo</th>
                <th className="p-4">Proprietário</th>
                <th className="p-4">Cadastro</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((v) => {
                const c = porId.get(v.clienteId);
                return (
                  <tr key={v.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                    <td className="p-4"><span className="rounded border border-metal/40 px-2 py-1 font-mono text-xs font-bold tracking-wider">{formatarPlaca(v.placa)}</span></td>
                    <td className="p-4">
                      <div className="font-medium">{[v.marca, v.modelo].filter(Boolean).join(" ") || "—"}</div>
                      <div className="text-xs text-muted-foreground">{[v.tipo, v.anoModelo || v.anoFabricacao].filter(Boolean).join(" · ")}</div>
                    </td>
                    <td className="p-4">{c ? <Link to="/clientes/$id" params={{ id: c.id }} className="hover:text-primary">{c.nome}</Link> : "—"}</td>
                    <td className="p-4 text-muted-foreground">{new Date(v.criadoEm).toLocaleDateString("pt-BR")}</td>
                    <td className="p-4"><StatusBadge ativo={v.ativo} /></td>
                    <td className="p-4">
                      <div className="flex justify-end gap-1.5">
                        <Link to="/veiculos/$id" params={{ id: v.id }} className="btn-ghost px-2.5" title="Visualizar"><Eye className="h-4 w-4" /></Link>
                        {pode("veiculos", "editar") && <Link to="/veiculos/$id/editar" params={{ id: v.id }} className="btn-ghost px-2.5" title="Editar"><Pencil className="h-4 w-4" /></Link>}
                        {pode("veiculos", "inativar") && (
                          <ConfirmDialog
                            trigger={<button className="btn-ghost px-2.5" title={v.ativo ? "Inativar" : "Ativar"}><Power className="h-4 w-4" /></button>}
                            title={v.ativo ? "Inativar veículo?" : "Ativar veículo?"}
                            description={`Deseja ${v.ativo ? "inativar" : "ativar"} o veículo ${formatarPlaca(v.placa)}?`}
                            confirmLabel={v.ativo ? "Inativar" : "Ativar"}
                            onConfirm={() => alterarStatusVeiculo(v.id, !v.ativo)}
                          />
                        )}
                        <ExcluirRegistro compacto tipo="veiculo" id={v.id} nome={formatarPlaca(v.placa) || v.modelo} confirmacao={formatarPlaca(v.placa) || v.modelo || "EXCLUIR"}
                          detalhes={[["Placa", formatarPlaca(v.placa)], ["Veículo", [v.marca, v.modelo].filter(Boolean).join(" ")], ["Proprietário", c?.nome ?? ""]]} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
