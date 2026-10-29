import { useState } from "react";
import { Pencil, Plus, Power } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/Modal";
import { MoneyInput } from "@/components/MoneyInput";
import { PageHeader } from "@/components/PageHeader";
import { useAcesso } from "@/lib/acesso";
import { ADQUIRENTES, TIPO_CONTA, salvarCadastro, useCadastrosFin, type Cadastro, type TipoCadastro } from "@/lib/financeiro";
import { moeda } from "@/lib/store";
import { Campo, Opcoes, Vazio, dataBr } from "./ui";

type CampoDef = { k: string; label: string; tipo?: "texto" | "numero" | "moeda" | "data" | "bool" | "area" | "select" | "ref"; opcoes?: [string, string][]; ref?: TipoCadastro; padrao?: unknown };

const DEF: Record<Exclude<TipoCadastro, "conta">, { titulo: string; singular: string; campos: CampoDef[]; colunas: (c: Cadastro, nome: (id: unknown) => string) => string[] ; cab: string[] }> = {
  forma: {
    titulo: "Formas de pagamento", singular: "forma de pagamento",
    campos: [
      { k: "chave", label: "Tipo", tipo: "select", opcoes: [["dinheiro", "Dinheiro"], ["pix", "Pix"], ["debito", "Cartão de débito"], ["credito", "Cartão de crédito"], ["transferencia", "Transferência"], ["boleto", "Boleto"], ["cheque", "Cheque"], ["outro", "Outro"]] },
      { k: "contaPadrao", label: "Conta de recebimento (opcional)", tipo: "ref", ref: "conta" },
      { k: "parcelamento", label: "Permite parcelamento", tipo: "bool" },
      { k: "maxParcelas", label: "Máximo de parcelas", tipo: "numero", padrao: 1 },
      { k: "taxa", label: "Taxa padrão (%)", tipo: "numero" },
      { k: "obs", label: "Observações", tipo: "area" },
    ],
    cab: ["Conta de recebimento", "Parcelas"], colunas: (c, nome) => [c.data["contaPadrao"] ? nome(c.data["contaPadrao"]) : "Automática", c.data["parcelamento"] ? `até ${c.data["maxParcelas"] || 1}x` : "À vista"],
  },
  maquininha: {
    titulo: "Maquininhas", singular: "maquininha",
    campos: [
      { k: "fabricante", label: "Fabricante" }, { k: "modelo", label: "Modelo" }, { k: "codigo", label: "Identificação / código interno" },
      { k: "adquirente", label: "Operadora / adquirente", tipo: "select", opcoes: ADQUIRENTES.map((a) => [a, a]) },
      { k: "contaId", label: "Conta bancária de recebimento", tipo: "ref", ref: "conta" },
      { k: "obs", label: "Observações", tipo: "area" },
    ],
    cab: ["Operadora", "Conta de recebimento"], colunas: (c, nome) => [String(c.data["adquirente"] ?? "—"), nome(c.data["contaId"])],
  },
  bandeira: { titulo: "Bandeiras", singular: "bandeira", campos: [{ k: "obs", label: "Observações", tipo: "area" }], cab: [], colunas: () => [] },
  taxa: {
    titulo: "Taxas", singular: "taxa",
    campos: [
      { k: "maquininhaId", label: "Maquininha", tipo: "ref", ref: "maquininha" }, { k: "bandeiraId", label: "Bandeira", tipo: "ref", ref: "bandeira" },
      { k: "modalidade", label: "Modalidade", tipo: "select", opcoes: [["credito", "Crédito"], ["debito", "Débito"]] },
      { k: "parcelas", label: "Número de parcelas", tipo: "numero", padrao: 1 }, { k: "percentual", label: "Taxa (%)", tipo: "numero" },
      { k: "fixo", label: "Valor fixo adicional", tipo: "moeda" }, { k: "prazo", label: "Prazo de recebimento (dias)", tipo: "numero", padrao: 30 },
      { k: "inicio", label: "Início da configuração", tipo: "data" }, { k: "obs", label: "Observações", tipo: "area" },
    ],
    cab: ["Maquininha", "Bandeira", "Modalidade", "Taxa", "Prazo", "Início"],
    colunas: (c, nome) => [nome(c.data["maquininhaId"]), nome(c.data["bandeiraId"]), `${c.data["modalidade"] === "debito" ? "Débito" : "Crédito"} ${c.data["parcelas"] || 1}x`,
      `${Number(c.data["percentual"] || 0).toLocaleString("pt-BR")}%${Number(c.data["fixo"]) ? ` + ${moeda(Number(c.data["fixo"]))}` : ""}`, `${c.data["prazo"] ?? 0} dias`, dataBr(String(c.data["inicio"] ?? ""))],
  },
  pix: {
    titulo: "Chaves Pix", singular: "chave Pix",
    campos: [
      { k: "chave", label: "Chave Pix" },
      { k: "tipoChave", label: "Tipo de chave", tipo: "select", opcoes: [["cpf", "CPF"], ["cnpj", "CNPJ"], ["email", "E-mail"], ["telefone", "Telefone"], ["aleatoria", "Aleatória"]] },
      { k: "recebedor", label: "Nome do recebedor" }, { k: "instituicao", label: "Instituição financeira" },
      { k: "contaId", label: "Conta bancária vinculada", tipo: "ref", ref: "conta" }, { k: "taxa", label: "Taxa (%)", tipo: "numero" },
      { k: "obs", label: "Observações", tipo: "area" },
    ],
    cab: ["Chave", "Instituição", "Conta"], colunas: (c, nome) => [String(c.data["chave"] ?? ""), String(c.data["instituicao"] ?? ""), nome(c.data["contaId"])],
  },
  categoria: {
    titulo: "Categorias financeiras", singular: "categoria",
    campos: [{ k: "natureza", label: "Tipo", tipo: "select", opcoes: [["despesa", "Despesa"], ["receita", "Receita"]], padrao: "despesa" }],
    cab: ["Tipo"], colunas: (c) => [c.data["natureza"] === "receita" ? "Receita" : "Despesa"],
  },
  centro: { titulo: "Centros de custo", singular: "centro de custo", campos: [{ k: "obs", label: "Descrição", tipo: "area" }], cab: [], colunas: () => [] },
};

const CONTA_CAMPOS: CampoDef[] = [
  { k: "banco", label: "Banco" }, { k: "codigoBanco", label: "Código do banco" }, { k: "agencia", label: "Agência" }, { k: "numero", label: "Número da conta" },
  { k: "tipoConta", label: "Tipo de conta", tipo: "select", opcoes: Object.entries(TIPO_CONTA), padrao: "corrente" },
  { k: "titular", label: "Titular" }, { k: "documentoTitular", label: "CPF/CNPJ do titular" },
  { k: "saldoInicial", label: "Saldo inicial", tipo: "moeda" }, { k: "dataSaldo", label: "Data do saldo inicial", tipo: "data" },
  { k: "obs", label: "Observações", tipo: "area" },
];

export function CadastroForm({ tipo, atual, onClose, campos, singular }: { tipo: TipoCadastro; atual: Cadastro | null; onClose: () => void; campos: CampoDef[]; singular: string }) {
  const cads = useCadastrosFin();
  const [nome, setNome] = useState(atual?.nome ?? "");
  const [data, setData] = useState<Record<string, unknown>>(() => ({ ...Object.fromEntries(campos.filter((c) => c.padrao !== undefined).map((c) => [c.k, c.padrao])), ...(tipo === "forma" ? { chave: "outro" } : {}), ...(atual?.data ?? {}) }));
  const [avancado, setAvancado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const camposVisiveis = tipo === "forma" && !avancado ? campos.filter((c) => ["chave", "contaPadrao"].includes(c.k)) : campos;
  const set = (k: string, v: unknown) => setData((d) => ({ ...d, [k]: v }));
  const temMov = tipo === "conta" && atual && Boolean(atual.data["__temMov"]);
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} wide title={atual ? `Editar ${singular}` : `Nova ${singular}`}>
      {tipo === "forma" && <p className="mb-4 text-sm text-muted-foreground">Informe o nome e o tipo. A conta é opcional: sem escolha, o sistema usa o caixa da oficina. Maquininha, bandeira e chave Pix não são obrigatórias para receber.</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {tipo !== "taxa" && <Campo label="Nome *" className="sm:col-span-2"><input className="field" value={nome} onChange={(e) => setNome(e.target.value)} placeholder={tipo === "forma" ? "Ex.: Dinheiro, Pix, Cartão de crédito" : undefined} /></Campo>}
        {camposVisiveis.map((c) => {
          const v = data[c.k];
          if (c.tipo === "bool") return <label key={c.k} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(v)} onChange={(e) => set(c.k, e.target.checked)} /> {c.label}</label>;
          if (c.tipo === "moeda") return <MoneyInput key={c.k} label={c.label} value={Number(v || 0)} disabled={Boolean(temMov && c.k === "saldoInicial")} onChange={(n) => set(c.k, n)} />;
          if (c.tipo === "select") return <Campo key={c.k} label={c.label}><select className="field" value={String(v ?? "")} onChange={(e) => set(c.k, e.target.value)}><option value="">Selecione</option>{c.opcoes!.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Campo>;
          if (c.tipo === "ref") return <Opcoes key={c.k} label={c.label} value={String(v ?? "")} onChange={(x) => set(c.k, x)} itens={cads.filter((x) => x.tipo === c.ref && (x.ativo || x.id === v))} />;
          if (c.tipo === "area") return <Campo key={c.k} label={c.label} className="sm:col-span-2"><textarea className="field min-h-16" value={String(v ?? "")} onChange={(e) => set(c.k, e.target.value)} /></Campo>;
          return <Campo key={c.k} label={c.label}><input className="field" type={c.tipo === "numero" ? "number" : c.tipo === "data" ? "date" : "text"} step="any"
            value={String(v ?? "")} onChange={(e) => set(c.k, c.tipo === "numero" ? Number(e.target.value) : e.target.value)} /></Campo>;
        })}
      </div>
      {tipo === "forma" && <button className="btn-ghost mt-3 h-10" onClick={() => setAvancado(!avancado)}>{avancado ? "Ocultar opções adicionais" : "Opções adicionais (parcelas, taxas e observações)"}</button>}
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-ghost h-11" disabled={salvando} onClick={onClose}>Cancelar</button>
        <button className="btn-primary" disabled={salvando} onClick={async () => {
          const { __temMov: _x, ...limpo } = data;
          const nomeFinal = tipo === "taxa"
            ? `${cads.find((x) => x.id === limpo["maquininhaId"])?.nome ?? "?"} · ${cads.find((x) => x.id === limpo["bandeiraId"])?.nome ?? "?"} · ${limpo["modalidade"] === "debito" ? "Débito" : `Crédito ${limpo["parcelas"] || 1}x`}`
            : nome;
          if (tipo === "taxa" && (!limpo["maquininhaId"] || !limpo["bandeiraId"] || !limpo["modalidade"])) { toast.error("Selecione maquininha, bandeira e modalidade."); return; }
          if (tipo === "forma" && !limpo["chave"]) { toast.error("Selecione o tipo da forma de pagamento."); return; }
          setSalvando(true);
          try { await salvarCadastro({ id: atual?.id, tipo, nome: nomeFinal, ativo: atual?.ativo ?? true, data: limpo }); toast.success("Salvo."); onClose(); }
          catch (e) { toast.error((e as Error).message); }
          finally { setSalvando(false); }
        }}>{salvando ? "Salvando..." : "Salvar"}</button>
      </div>
    </Modal>
  );
}

export function CadastrosFin({ tipo }: { tipo: Exclude<TipoCadastro, "conta"> }) {
  const def = DEF[tipo];
  const todos = useCadastrosFin();
  const lista = todos.filter((c) => c.tipo === tipo).sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome, "pt-BR"));
  const { pode } = useAcesso();
  const podeEditar = pode("financeiro", "config");
  const podeCriar = podeEditar || ((tipo === "categoria" || tipo === "centro") && pode("financeiro", "criar"));
  const [edit, setEdit] = useState<Cadastro | "novo" | null>(null);
  const [filtro, setFiltro] = useState("");
  const nome = (id: unknown) => todos.find((c) => c.id === id)?.nome ?? "—";
  const visiveis = lista.filter((c) => !filtro || (tipo === "categoria" ? c.data["natureza"] === filtro : c.data["maquininhaId"] === filtro));

  return (
    <>
      <PageHeader title={def.titulo} subtitle={`${lista.filter((c) => c.ativo).length} ativo(s)`}
        action={podeCriar && <button className="btn-primary" onClick={() => setEdit("novo")}><Plus className="h-4 w-4" /> Adicionar</button>} />
      {tipo === "forma" && <div className="panel mb-4 space-y-1 p-4 text-sm">
        <p>Cadastre as formas aceitas pela oficina, como Dinheiro, Pix, Débito ou Crédito. Nome e tipo são suficientes para começar.</p>
        <p className="text-muted-foreground">Somente formas ativas aparecem ao registrar pagamentos. Use o lápis para editar e o botão de ativar/inativar para mudar a disponibilidade, sem apagar o histórico.</p>
      </div>}
      {tipo === "categoria" && <div className="panel mb-4 space-y-1 p-4 text-sm">
        <p>Organize receitas e despesas nas categorias da oficina. Use Adicionar para cadastrar e o lápis para editar, conforme suas permissões.</p>
        <p className="text-muted-foreground">As categorias anteriores e seus vínculos foram preservados. Inativar impede novas seleções, sem apagar lançamentos antigos; ativar torna a categoria disponível novamente.</p>
      </div>}
      {(tipo === "categoria" || tipo === "taxa") && (
        <div className="panel mb-4 max-w-sm p-4">
          {tipo === "categoria"
            ? <Campo label="Tipo"><select className="field" value={filtro} onChange={(e) => setFiltro(e.target.value)}><option value="">Todas</option><option value="despesa">Despesas</option><option value="receita">Receitas</option></select></Campo>
            : <Opcoes label="Maquininha" value={filtro} onChange={setFiltro} itens={todos.filter((c) => c.tipo === "maquininha")} vazio="Todas" />}
        </div>
      )}
      {tipo === "taxa" && !todos.some((c) => c.tipo === "maquininha") && <p className="mb-4 text-sm text-amber-400">Cadastre primeiro uma maquininha.</p>}
      {visiveis.length === 0 ? <Vazio>Nenhum registro.</Vazio> : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="p-3">Nome</th>{def.cab.map((c) => <th key={c} className="p-3">{c}</th>)}<th className="p-3">Situação</th><th className="p-3 text-right">Ações</th>
            </tr></thead>
            <tbody>
              {visiveis.map((c) => (
                <tr key={c.id} className={`border-b border-border/60 last:border-0 ${c.ativo ? "" : "opacity-60"}`}>
                  <td className="p-3 font-medium">{c.nome}</td>
                  {def.colunas(c, nome).map((v, i) => <td key={i} className="p-3 text-muted-foreground">{v}</td>)}
                  <td className="p-3">{c.ativo ? "Ativo" : "Inativo"}</td>
                  <td className="p-3"><div className="flex justify-end gap-1">
                    {podeEditar && <button className="btn-ghost px-2.5" title="Editar" onClick={() => setEdit(c)}><Pencil className="h-4 w-4" /></button>}
                    {podeEditar && <button className="btn-ghost px-2.5" title={c.ativo ? "Inativar" : "Ativar"} onClick={async () => {
                      try { await salvarCadastro({ ...c, ativo: !c.ativo }); toast.success(c.ativo ? "Inativado." : "Ativado."); } catch (e) { toast.error((e as Error).message); }
                    }}><Power className="h-4 w-4" /></button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">Registros financeiros não são apagados: inative o que não for mais usado. Nenhum dado completo de cartão ou senha de maquininha é armazenado.</p>
      {edit && <CadastroForm tipo={tipo} atual={edit === "novo" ? null : edit} campos={def.campos} singular={def.singular} onClose={() => setEdit(null)} />}
    </>
  );
}

export { CONTA_CAMPOS };
