import type { ReactNode } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Car, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { alterarStatusCliente, excluirCliente, useClientes } from "@/lib/clientes";
import { getVeiculosDoCliente } from "@/lib/veiculos";
import { useCurrentUser } from "@/lib/auth";
import { mascaraCEP, mascaraDocumento, mascaraTelefone } from "@/lib/validacao";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusBadge, TipoBadge } from "@/components/clientes/StatusBadge";

export const Route = createFileRoute("/_authenticated/clientes/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes do cliente · Gordo Auto Mecânica ERP" },
      { name: "description", content: "Dados e veículos do cliente." },
      { property: "og:title", content: "Detalhes do cliente · Gordo ERP" },
      { property: "og:description", content: "Dados e veículos do cliente." },
    ],
  }),
  component: DetalheCliente,
});

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words">{children || "—"}</dd>
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="panel p-5">
      <h2 className="mb-4 text-lg font-bold uppercase text-metal">{titulo}</h2>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</dl>
    </section>
  );
}

const data = (iso: string) => (iso ? new Date(iso).toLocaleString("pt-BR") : "");
const dataSimples = (d: string) => (d ? d.split("-").reverse().join("/") : "");

function DetalheCliente() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const isAdmin = useCurrentUser()?.role === "admin";
  const c = useClientes().find((x) => x.id === id);

  if (!c)
    return (
      <div className="panel p-10 text-center">
        <p className="mb-4 text-muted-foreground">Cliente não encontrado.</p>
        <Link to="/clientes" className="btn-ghost">Voltar para clientes</Link>
      </div>
    );

  const pf = c.tipo === "PF";
  const veiculos = getVeiculosDoCliente(c.id);

  return (
    <>
      <Link to="/clientes" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar para clientes
      </Link>
      <PageHeader
        title={c.nome}
        subtitle={c.nomeFantasia || undefined}
        action={
          <div className="flex flex-wrap gap-2">
            <Link to="/clientes/$id/editar" params={{ id }} className="btn-ghost h-11"><Pencil className="h-4 w-4" /> Editar</Link>
            <ConfirmDialog
              trigger={<button className="btn-ghost h-11"><Power className="h-4 w-4" /> {c.ativo ? "Inativar" : "Ativar"}</button>}
              title={c.ativo ? "Inativar cliente?" : "Ativar cliente?"}
              description={`Deseja ${c.ativo ? "inativar" : "ativar"} o cliente "${c.nome}"?`}
              confirmLabel={c.ativo ? "Inativar" : "Ativar"}
              onConfirm={() => alterarStatusCliente(c.id, !c.ativo)}
            />
            {isAdmin && (
              <ConfirmDialog
                trigger={<button className="btn-ghost h-11 hover:text-destructive"><Trash2 className="h-4 w-4" /> Excluir</button>}
                title="Excluir cliente?"
                description={`O cliente "${c.nome}" será excluído definitivamente. Esta ação não pode ser desfeita.`}
                confirmLabel="Excluir"
                onConfirm={() => {
                  excluirCliente(c.id);
                  navigate({ to: "/clientes", replace: true });
                }}
              />
            )}
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <TipoBadge tipo={c.tipo} /> <StatusBadge ativo={c.ativo} />
      </div>

      <div className="space-y-5">
        <Bloco titulo="Identificação">
          <Info label={pf ? "CPF" : "CNPJ"}>{mascaraDocumento(c.documento, c.tipo)}</Info>
          <Info label={pf ? "RG" : "Inscrição estadual"}>{c.rgIe}</Info>
          <Info label={pf ? "Data de nascimento" : "Data de abertura"}>{dataSimples(c.dataNascimento)}</Info>
        </Bloco>
        <Bloco titulo="Contato">
          <Info label="E-mail">{c.email}</Info>
          <Info label="Telefone principal">{mascaraTelefone(c.telefone)}</Info>
          <Info label="Telefone/WhatsApp secundário">{mascaraTelefone(c.telefone2)}</Info>
        </Bloco>
        <Bloco titulo="Endereço">
          <Info label="CEP">{mascaraCEP(c.cep)}</Info>
          <Info label="Logradouro">{[c.logradouro, c.numero].filter(Boolean).join(", ")}</Info>
          <Info label="Complemento">{c.complemento}</Info>
          <Info label="Bairro">{c.bairro}</Info>
          <Info label="Cidade / Estado">{[c.cidade, c.estado].filter(Boolean).join(" / ")}</Info>
          <Info label="País">{c.pais}</Info>
        </Bloco>
        <Bloco titulo="Outras informações">
          <Info label="Origem do cliente">{c.origem}</Info>
          <Info label="Cadastrado em">{data(c.criadoEm)}</Info>
          <Info label="Última atualização">{data(c.atualizadoEm)}</Info>
          <div className="sm:col-span-2 lg:col-span-3">
            <Info label="Observações"><span className="whitespace-pre-wrap">{c.observacoes}</span></Info>
          </div>
        </Bloco>

        <section className="panel p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold uppercase text-metal">Veículos vinculados</h2>
            <button className="btn-primary h-10" disabled title="Módulo de veículos em desenvolvimento">
              <Plus className="h-4 w-4" /> Adicionar veículo
            </button>
          </div>
          {veiculos.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border p-8 text-center">
              <Car className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium">Nenhum veículo vinculado a este cliente.</p>
              <p className="text-xs text-muted-foreground">O cadastro de veículos está em desenvolvimento.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
