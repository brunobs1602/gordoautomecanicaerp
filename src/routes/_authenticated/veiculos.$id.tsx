import { guard, useAcesso } from "@/lib/acesso";
import { useState, type ReactNode } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Pencil, Power, UserRoundCog } from "lucide-react";
import { alterarProprietario, alterarStatusVeiculo, formatarPlaca, useVeiculos } from "@/lib/veiculos";
import { getClientes, useClientes } from "@/lib/clientes";
import { mascaraDocumento, mascaraTelefone } from "@/lib/validacao";
import { PageHeader } from "@/components/PageHeader";
import { ExcluirRegistro } from "@/components/ExcluirRegistro";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormError } from "@/components/AuthCard";
import { StatusBadge } from "@/components/clientes/StatusBadge";
import { ClienteSelect } from "@/components/veiculos/ClienteSelect";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/veiculos/$id")({
  beforeLoad: guard(["veiculos"]),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Detalhes do veículo · Mecavon" },
      { name: "description", content: "Dados do veículo e do proprietário." },
      { property: "og:title", content: "Detalhes do veículo · Mecavon" },
      { property: "og:description", content: "Dados do veículo e do proprietário." },
    ],
  }),
  component: DetalheVeiculo,
});

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words">{children || "—"}</dd>
    </div>
  );
}
function Bloco({ titulo, children, acao }: { titulo: string; children: ReactNode; acao?: ReactNode }) {
  return (
    <section className="panel p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold uppercase text-metal">{titulo}</h2>
        {acao}
      </div>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</dl>
    </section>
  );
}

const clienteExiste = (id: string) => getClientes().some((c) => c.id === id);

function TrocarProprietario({ veiculoId, atual }: { veiculoId: string; atual: string }) {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(atual);
  const [erro, setErro] = useState("");
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); setSel(atual); setErro(""); }}>
      <DialogTrigger asChild>
        <button className="btn-ghost"><UserRoundCog className="h-4 w-4" /> Alterar proprietário</button>
      </DialogTrigger>
      <DialogContent className="border-border bg-card">
        <DialogHeader><DialogTitle className="font-display text-2xl uppercase">Alterar proprietário</DialogTitle></DialogHeader>
        <FormError message={erro} />
        <ClienteSelect value={sel} onChange={setSel} />
        <div className="flex justify-end gap-2">
          <button className="btn-ghost h-10" onClick={() => setOpen(false)}>Cancelar</button>
          <button
            className="btn-primary h-10"
            onClick={() => {
              if (!sel) return setErro("Selecione o cliente proprietário.");
              try {
                alterarProprietario(veiculoId, sel, clienteExiste);
                setOpen(false);
              } catch (e) {
                setErro((e as Error).message);
              }
            }}
          >
            Salvar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetalheVeiculo() {
  const { id } = Route.useParams();
  const { pode } = useAcesso();
  const v = useVeiculos().find((x) => x.id === id);
  const clientes = useClientes();
  const navigate = useNavigate();

  if (!v)
    return (
      <div className="panel p-10 text-center">
        <p className="mb-4 text-muted-foreground">Veículo não encontrado.</p>
        <Link to="/veiculos" className="btn-ghost">Voltar para veículos</Link>
      </div>
    );
  const c = clientes.find((x) => x.id === v.clienteId);
  const data = (iso: string) => new Date(iso).toLocaleString("pt-BR");

  return (
    <>
      <Link to="/veiculos" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar para veículos
      </Link>
      <PageHeader
        title={formatarPlaca(v.placa)}
        subtitle={[v.marca, v.modelo, v.versao].filter(Boolean).join(" ") || undefined}
        action={
          <div className="flex flex-wrap gap-2">
            {pode("veiculos", "editar") && <Link to="/veiculos/$id/editar" params={{ id }} className="btn-ghost h-11"><Pencil className="h-4 w-4" /> Editar</Link>}
            {pode("veiculos", "inativar") && (
              <ConfirmDialog
                trigger={<button className="btn-ghost h-11"><Power className="h-4 w-4" /> {v.ativo ? "Inativar" : "Ativar"}</button>}
                title={v.ativo ? "Inativar veículo?" : "Ativar veículo?"}
                description={`Deseja ${v.ativo ? "inativar" : "ativar"} o veículo ${formatarPlaca(v.placa)}?`}
                confirmLabel={v.ativo ? "Inativar" : "Ativar"}
                onConfirm={() => alterarStatusVeiculo(v.id, !v.ativo)}
              />
            )}
            <ExcluirRegistro tipo="veiculo" id={v.id} nome={formatarPlaca(v.placa) || v.modelo} confirmacao={formatarPlaca(v.placa) || v.modelo || "EXCLUIR"}
              detalhes={[["Placa", formatarPlaca(v.placa)], ["Veículo", [v.marca, v.modelo].filter(Boolean).join(" ")], ["Proprietário", clientes.find((x) => x.id === v.clienteId)?.nome ?? ""]]}
              aoExcluir={() => navigate({ to: "/veiculos", replace: true })} />
          </div>
        }
      />
      <div className="mb-5"><StatusBadge ativo={v.ativo} /></div>

      <div className="space-y-5">
        <Bloco titulo="Proprietário" acao={<TrocarProprietario veiculoId={v.id} atual={v.clienteId} />}>
          {c ? (
            <>
              <Info label="Nome"><Link to="/clientes/$id" params={{ id: c.id }} className="text-primary hover:underline">{c.nome}</Link></Info>
              <Info label={c.tipo === "PF" ? "CPF" : "CNPJ"}>{mascaraDocumento(c.documento, c.tipo)}</Info>
              <Info label="Telefone">{mascaraTelefone(c.telefone)}</Info>
              <Info label="E-mail">{c.email}</Info>
              <Info label="Cidade / Estado">{[c.cidade, c.estado].filter(Boolean).join(" / ")}</Info>
              <Info label="Status do cliente"><StatusBadge ativo={c.ativo} /></Info>
            </>
          ) : (
            <Info label="Cliente">Cliente não encontrado. Altere o proprietário.</Info>
          )}
        </Bloco>
        <Bloco titulo="Identificação">
          <Info label="Placa">{formatarPlaca(v.placa)}</Info>
          <Info label="Renavam">{v.renavam}</Info>
          <Info label="Chassi">{v.chassi}</Info>
          <Info label="Marca">{v.marca}</Info>
          <Info label="Modelo">{v.modelo}</Info>
          <Info label="Versão">{v.versao}</Info>
          <Info label="Ano fabricação / modelo">{[v.anoFabricacao, v.anoModelo].filter(Boolean).join(" / ")}</Info>
          <Info label="Cor">{v.cor}</Info>
        </Bloco>
        <Bloco titulo="Características">
          <Info label="Tipo">{v.tipo}</Info>
          <Info label="Categoria">{v.categoria}</Info>
          <Info label="Combustível">{v.combustivel}</Info>
          <Info label="Quilometragem">{v.quilometragem ? `${Number(v.quilometragem).toLocaleString("pt-BR")} km` : ""}</Info>
          <Info label="Portas">{v.portas}</Info>
          <Info label="Câmbio">{v.cambio}</Info>
        </Bloco>
        <Bloco titulo="Outras informações">
          <Info label="Cadastrado em">{data(v.criadoEm)}</Info>
          <Info label="Última atualização">{data(v.atualizadoEm)}</Info>
          <div className="sm:col-span-2 lg:col-span-3">
            <Info label="Observações"><span className="whitespace-pre-wrap">{v.observacoes}</span></Info>
          </div>
        </Bloco>
      </div>
    </>
  );
}
