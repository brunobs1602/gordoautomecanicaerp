import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Download, History, Lock, ShieldCheck, UserCog, RotateCcw, Save, Search, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { guard, useAcesso } from "@/lib/acesso";
import {
  CONFIG_PADRAO, SECOES, VERSAO, diffSecao, secaoDe, getConfig, importarConfig, salvarConfig, useConfig,
  type Campo, type Config, type Valor,
} from "@/lib/config";
import { registrar, garantirAuditoria } from "@/lib/auditoria";
import { ErroConexao } from "@/components/ErroConexao";
import { enviarImagem, useImagem } from "@/lib/arquivos";
import { aguardarGravacoes, mensagemErro } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { ResetDados } from "@/components/config/ResetDados";
import { getClientes } from "@/lib/clientes";
import { getVeiculos } from "@/lib/veiculos";
import { getOrcamentos } from "@/lib/orcamentos";
import { getProdutos } from "@/lib/produtos";
import { getServicos } from "@/lib/servicos";
import { getPerfis } from "@/lib/permissoes";
import { getUsers } from "@/lib/auth";
import { getAuditoria, useAuditoria } from "@/lib/auditoria";
import { carregarColecoes } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Modal } from "@/components/Modal";
import { variaveisTema } from "@/components/Tema";
import { GerenciarCategorias, GerenciarMarcas } from "@/components/config/Cadastros";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  beforeLoad: guard(["configuracoes"], ["usuarios"], ["perfis"]),
  loader: () => garantirAuditoria(),
  pendingComponent: () => <p className="p-6 text-muted-foreground">Carregando configurações...</p>,
  errorComponent: ErroConexao,
  notFoundComponent: () => <p>Configurações não encontradas.</p>,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Configurações · Gordo Auto Mecânica ERP" },
      { name: "description", content: "Central de configurações da oficina e do sistema." },
      { property: "og:title", content: "Configurações · Gordo ERP" },
      { property: "og:description", content: "Central de configurações da oficina e do sistema." },
    ],
  }),
  component: Configuracoes,
});

const MANUT = "manutencao";
const MARCAS = "marcas";
const CAT_PROD = "categorias-produtos";
const CAT_SERV = "categorias-servicos";

function Configuracoes() {
  const cfg = useConfig();
  const { pode } = useAcesso();
  const podeAlterar = pode("configuracoes", "config");
  const podeVer = pode("configuracoes");
  const [aba, setAba] = useState<string>(podeVer ? SECOES[0]!.key : "");
  const sistema = [
    podeVer && { key: MANUT, titulo: "Manutenção e dados" },
  ].filter(Boolean) as { key: string; titulo: string }[];
  const cadastrosAbas = podeAlterar ? [
    { key: MARCAS, titulo: "Marcas de veículos" },
    { key: CAT_PROD, titulo: "Categorias de produtos" },
    { key: CAT_SERV, titulo: "Categorias de serviços" },
  ] : [];
  const admin = [
    pode("usuarios") && { to: "/usuarios", titulo: "Usuários", icon: UserCog },
    pode("perfis") && { to: "/perfis", titulo: "Perfis de acesso", icon: ShieldCheck },
    (pode("usuarios") || pode("perfis") || podeAlterar) && { to: "/historico", titulo: "Histórico e auditoria", icon: History },
  ].filter(Boolean) as { to: "/usuarios" | "/perfis" | "/historico"; titulo: string; icon: typeof History }[];
  const botao = (s: { key: string; titulo: string }) => (
    <button
      key={s.key}
      onClick={() => setAba(s.key)}
      className={`whitespace-nowrap rounded-md border-l-2 px-3 py-2 text-left text-sm font-medium ${aba === s.key ? "border-primary bg-accent" : "border-transparent text-muted-foreground hover:bg-accent/60"}`}
    >
      {s.titulo}
    </button>
  );
  const grupo = (t: string) => <div className="hidden px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-primary lg:block">{t}</div>;
  const [busca, setBusca] = useState("");
  const q = busca.trim().toLowerCase();
  const resultados = useMemo(
    () => (q ? SECOES.map((s) => ({ s, campos: s.campos.filter((f) => `${f.label} ${f.desc}`.toLowerCase().includes(q)) })).filter((r) => r.campos.length) : []),
    [q],
  );

  return (
    <>
      <PageHeader title="Configurações" subtitle={podeAlterar ? "Ajuste a empresa, documentos e regras do sistema." : "Somente leitura: seu perfil não pode alterar as configurações."} />
      {podeVer && <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input className="field pl-9" placeholder="Buscar configuração..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>}

      {q ? (
        <div className="panel p-5">
          {resultados.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma configuração encontrada.</p>}
          <ul className="space-y-2">
            {resultados.flatMap(({ s, campos }) => campos.map((f) => (
              <li key={s.key + f.key}>
                <button className="w-full rounded-md border border-border p-3 text-left hover:bg-accent" onClick={() => { setAba(s.key); setBusca(""); }}>
                  <div className="text-xs uppercase tracking-wider text-primary">{s.titulo}</div>
                  <div className="font-medium">{f.label}</div>
                  {f.desc && <div className="text-xs text-muted-foreground">{f.desc}</div>}
                </button>
              </li>
            )))}
          </ul>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[230px_1fr]">
          <nav className="panel flex gap-1 overflow-x-auto p-2 lg:flex-col">
            {podeVer && <>{grupo("Sistema")}{SECOES.map(botao)}{sistema.map(botao)}</>}
            {cadastrosAbas.length > 0 && <>{grupo("Cadastros auxiliares")}{cadastrosAbas.map(botao)}</>}
            {admin.length > 0 && <>{grupo("Administração")}{admin.map((a) => (
              <Link key={a.to} to={a.to} className="flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent/60">
                <a.icon className="h-4 w-4" /> {a.titulo} <ChevronRight className="ml-auto hidden h-4 w-4 lg:block" />
              </Link>
            ))}</>}
          </nav>
          {aba === MANUT ? <Manutencao podeAlterar={podeAlterar} />
            : aba === MARCAS && podeAlterar ? <GerenciarMarcas />
            : aba === CAT_PROD && podeAlterar ? <GerenciarCategorias tipo="produto" />
            : aba === CAT_SERV && podeAlterar ? <GerenciarCategorias tipo="servico" />
            : podeVer && SECOES.some((x) => x.key === aba) ? <EditorSecao key={aba} secao={aba} cfg={cfg} podeAlterar={podeAlterar} />
            : (
              <div className="grid gap-3 sm:grid-cols-2">
                {admin.map((a) => (
                  <Link key={a.to} to={a.to} className="panel flex items-center gap-3 p-5 hover:bg-accent/40">
                    <a.icon className="h-6 w-6 text-primary" /> <span className="font-semibold">{a.titulo}</span>
                  </Link>
                ))}
              </div>
            )}
        </div>
      )}
    </>
  );
}

function EditorSecao({ secao, cfg, podeAlterar }: { secao: string; cfg: Config; podeAlterar: boolean }) {
  const def = SECOES.find((s) => s.key === secao)!;
  const [rascunho, setRascunho] = useState<Record<string, Valor>>(secaoDe(cfg, secao));
  const mudancas = diffSecao(secao, secaoDe(cfg, secao), rascunho);
  const set = (k: string, v: Valor) => setRascunho((r) => ({ ...r, [k]: v }));

  const gravar = (novo: Record<string, Valor>, descricao: string) => {
    const atual = getConfig();
    const diff = diffSecao(secao, secaoDe(atual, secao), novo);
    if (!diff.length) {
      toast.info("Nenhuma alteração para salvar.");
      return;
    }
    salvarConfig({ ...atual, [secao]: novo } as Config);
    if (atual.seguranca.auditoria !== false)
      diff.forEach((d) => registrar({ tipo: "Configuração alterada", alvo: def.titulo, secao: def.titulo, descricao: `${descricao}: ${d.campo}`, antes: d.antes, depois: d.depois }));
    toast.success("Configurações salvas com sucesso.");
  };

  return (
    <div className="space-y-5">
      <div className="panel p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold uppercase">{def.titulo}</h2>
            <p className="text-sm text-muted-foreground">{def.desc}</p>
          </div>
          {!podeAlterar && <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" /> Somente leitura</span>}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {def.campos.map((f) => <CampoConfig key={f.key} campo={f} valor={rascunho[f.key]!} onChange={(v) => set(f.key, v)} disabled={!podeAlterar} />)}
        </div>
      </div>

      {secao === "visual" && <PreviaVisual v={rascunho as Config["visual"]} />}
      {secao === "documentos" && <PreviaDocumento d={rascunho as Config["documentos"]} empresa={cfg.empresa} />}

      {podeAlterar && (
        <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 rounded-md border border-border bg-card/95 p-3 backdrop-blur">
          {mudancas.length > 0 && <span className="mr-auto text-sm text-warning">{mudancas.length} alteração(ões) não salva(s)</span>}
          <ConfirmDialog
            trigger={<button className="btn-ghost h-10"><RotateCcw className="h-4 w-4" /> Restaurar padrão</button>}
            title="Restaurar padrão?" description={`Todos os campos de "${def.titulo}" voltarão ao valor original e serão salvos.`}
            confirmLabel="Restaurar" onConfirm={() => { setRascunho(secaoDe(CONFIG_PADRAO, secao)); gravar(secaoDe(CONFIG_PADRAO, secao), "Restaurado o padrão"); }}
          />
          <button className="btn-ghost h-10" disabled={!mudancas.length} onClick={() => setRascunho(secaoDe(cfg, secao))}><X className="h-4 w-4" /> Cancelar</button>
          <ConfirmDialog
            trigger={<button className="btn-primary h-10" disabled={!mudancas.length}><Save className="h-4 w-4" /> Salvar alterações</button>}
            title="Salvar alterações?"
            description={mudancas.slice(0, 6).map((m) => `${m.campo}: ${m.antes || "—"} → ${m.depois || "—"}`).join(" · ") + (mudancas.length > 6 ? ` · e mais ${mudancas.length - 6}` : "")}
            confirmLabel="Salvar" onConfirm={() => gravar(rascunho, "Alterado")}
          />
        </div>
      )}
    </div>
  );
}

function CampoConfig({ campo: f, valor, onChange, disabled }: { campo: Campo; valor: Valor; onChange: (v: Valor) => void; disabled: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const label = (
    <div>
      <div className="text-sm font-medium text-metal">{f.label}</div>
      {f.desc && <div className="text-xs text-muted-foreground">{f.desc}</div>}
    </div>
  );
  if (f.tipo === "bool")
    return (
      <label className={`flex items-center justify-between gap-3 rounded-md border border-border p-3 ${disabled ? "opacity-70" : "cursor-pointer"}`}>
        {label}
        <input type="checkbox" className="h-5 w-5 accent-[var(--primary)]" checked={Boolean(valor)} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      </label>
    );
  if (f.tipo === "imagem") return <CampoImagem campo={f} valor={String(valor || "")} onChange={onChange} disabled={disabled} label={label} />;
  return (
    <label className={`block space-y-1.5 ${f.tipo === "area" ? "md:col-span-2" : ""}`}>
      {label}
      {f.tipo === "area" ? (
        <textarea className="field min-h-20" value={String(valor)} disabled={disabled} maxLength={1000} onChange={(e) => onChange(e.target.value)} />
      ) : f.tipo === "select" ? (
        <select className="field" value={String(valor)} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
          {f.opcoes!.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      ) : f.tipo === "cor" ? (
        <div className="flex items-center gap-2">
          <input type="color" className="h-10 w-14 cursor-pointer rounded border border-border bg-transparent" value={String(valor)} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
          <input className="field font-mono" value={String(valor)} disabled={disabled} maxLength={7} onChange={(e) => onChange(e.target.value)} />
        </div>
      ) : (
        <input
          className="field"
          type={f.tipo === "numero" ? "number" : f.tipo === "hora" ? "time" : "text"}
          value={String(valor)}
          disabled={disabled}
          maxLength={200}
          onChange={(e) => onChange(f.tipo === "numero" ? Number(e.target.value) : e.target.value)}
        />
      )}
    </label>
  );
}

function CampoImagem({ campo: f, valor, onChange, disabled, label }: { campo: Campo; valor: string; onChange: (v: Valor) => void; disabled: boolean; label: React.ReactNode }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const url = useImagem(valor);
  const [enviando, setEnviando] = useState(false);
  const enviar = async (file?: File) => {
    if (!file) return;
    setEnviando(true);
    try {
      onChange(await enviarImagem(f.key, file));
      toast.success("Imagem enviada. Salve as alterações para aplicar.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };
  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      {label}
      <div className="flex items-center gap-3">
        <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-md border border-dashed border-border bg-background">
          {url ? <img src={url} alt={f.label} className="h-full w-full object-contain" /> : <span className="text-[10px] text-muted-foreground">Sem imagem</span>}
        </div>
        {!disabled && (
          <div className="flex flex-wrap gap-2">
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon" className="hidden" onChange={(e) => { void enviar(e.target.files?.[0]); e.target.value = ""; }} />
            <button type="button" disabled={enviando} className="btn-ghost h-9 text-xs" onClick={() => inputRef.current?.click()}><Upload className="h-3.5 w-3.5" /> {enviando ? "Enviando..." : valor ? "Substituir" : "Enviar"}</button>
            {valor && <button type="button" className="btn-ghost h-9 text-xs hover:text-destructive" onClick={() => onChange("")}><Trash2 className="h-3.5 w-3.5" /> Remover</button>}
          </div>
        )}
      </div>
    </div>
  );
}

function PreviaVisual({ v }: { v: Config["visual"] }) {
  const vars = variaveisTema(v) as React.CSSProperties;
  return (
    <div className="panel p-5">
      <h3 className="mb-3 text-xl font-bold uppercase">Pré-visualização</h3>
      <div style={vars} className="overflow-hidden rounded-[var(--radius)] border border-border">
        <div className="flex" style={{ background: "var(--background)", color: "var(--foreground)", fontSize: `${Number(v.fonte) || 16}px` }}>
          <div className="w-40 space-y-1 p-3" style={{ background: "var(--sidebar)" }}>
            {v.mostrarNome && <div className="font-display font-extrabold italic text-metal">GORDO</div>}
            <div className="rounded-md border-l-2 border-primary bg-sidebar-accent px-2 py-1.5 text-xs">Dashboard</div>
            <div className="px-2 py-1.5 text-xs opacity-70">Clientes</div>
          </div>
          <div className="flex-1 space-y-3 p-4">
            <div className={`rounded-[var(--radius)] p-3 ${v.estiloCards === "contorno" ? "border border-primary" : v.estiloCards === "destaque" ? "border-t-4 border-primary bg-card" : "bg-card"}`}>
              <div className="text-xs uppercase text-muted-foreground">Clientes cadastrados</div>
              <div className="font-display text-2xl font-bold">42</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-[var(--radius)] bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Botão principal</span>
              <span className="rounded-full bg-success/20 px-2 py-1 text-xs text-success">Sucesso</span>
              <span className="rounded-full bg-warning/20 px-2 py-1 text-xs text-warning">Alerta</span>
              <span className="rounded-full bg-destructive/20 px-2 py-1 text-xs text-destructive">Erro</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviaDocumento({ d, empresa }: { d: Config["documentos"]; empresa: Config["empresa"] }) {
  const end = [empresa.logradouro, empresa.numero, empresa.bairro, empresa.cidade].filter(Boolean).join(", ");
  return (
    <div className="panel p-5">
      <h3 className="mb-3 text-xl font-bold uppercase">Prévia do documento</h3>
      <div className="mx-auto max-w-xl rounded-md bg-paper p-6 text-[12px] text-ink">
        <div className="flex items-start justify-between border-b-2 border-primary pb-3">
          <div>
            <div className="font-display text-xl font-extrabold italic uppercase">{String(empresa.nomeFantasia)}</div>
            {d.mostrarEndereco && end && <div className="text-ink-muted">{end}</div>}
            {d.mostrarTelefone && empresa.whatsapp && <div className="text-ink-muted">WhatsApp {String(empresa.whatsapp)}</div>}
          </div>
          <div className="text-right font-display text-lg font-bold uppercase">{String(d.titulo)}<div className="text-xs text-ink-muted">ORC-00001</div></div>
        </div>
        {d.apresentacao && <p className="mt-3 whitespace-pre-wrap">{String(d.apresentacao)}</p>}
        <div className="mt-3 flex justify-between border-t border-paper-border py-1.5"><span>Troca de óleo</span><span>R$ 150,00</span></div>
        {d.mostrarDescontos && <div className="flex justify-between text-ink-muted"><span>Desconto</span><span>- R$ 10,00</span></div>}
        <div className="flex justify-between border-t border-ink pt-1.5 font-bold"><span>Total</span><span>R$ 140,00</span></div>
        {d.validadeTexto && <p className="mt-3 text-ink-muted">{String(d.validadeTexto)} ({String(d.validadeDias)} dias)</p>}
        {d.garantia && <p className="text-ink-muted">{String(d.garantia)}</p>}
        {d.mostrarAssinatura && <div className="mt-6 w-48 border-t border-ink pt-1 text-center">Assinatura do cliente</div>}
        {d.rodape && <p className="mt-4 text-center text-ink-muted">{String(d.rodape)}</p>}
      </div>
    </div>
  );
}

const LOCAIS: { chave: string; tabela: "clientes" | "veiculos" | "produtos" | "servicos" | "orcamentos"; nome: string }[] = [
  { chave: "gordo.clientes", tabela: "clientes", nome: "Clientes" },
  { chave: "gordo.veiculos", tabela: "veiculos", nome: "Veículos" },
  { chave: "gordo.produtos", tabela: "produtos", nome: "Produtos" },
  { chave: "gordo.servicos", tabela: "servicos", nome: "Serviços" },
  { chave: "gordo.orcamentos", tabela: "orcamentos", nome: "Orçamentos e OS" },
];
type Reg = Record<string, unknown> & { id: string };
function linhaDe(tabela: string, r: Reg) {
  const { id, ...resto } = r;
  const extra: Record<string, unknown> =
    tabela === "clientes" ? { documento: r["documento"] ?? "", ativo: r["ativo"] ?? true }
    : tabela === "veiculos" ? { cliente_id: r["clienteId"], placa: r["placa"] ?? "", ativo: r["ativo"] ?? true }
    : tabela === "produtos" ? { codigo: String(r["codigo"] ?? "").trim(), ativo: r["ativo"] ?? true }
    : tabela === "servicos" ? { ativo: r["ativo"] ?? true }
    : { numero: r["numero"], tipo: r["tipo"], status: r["status"], cliente_id: r["clienteId"] || null, veiculo_id: r["veiculoId"] || null };
  return { id, data: resto, ...extra };
}
const lerLocal = (k: string): Reg[] => {
  try { const v = JSON.parse(localStorage.getItem(k) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
};

function baixar(nome: string, conteudo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

function Manutencao({ podeAlterar }: { podeAlterar: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importado, setImportado] = useState<Config | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [relatorio, setRelatorio] = useState<string[] | null>(null);
  const hoje = new Date().toISOString().slice(0, 10);
  const backups = useAuditoriaTipo("Backup manual");
  const ultimo = backups.at(-1)?.data;
  const locais = LOCAIS.map((l) => ({ ...l, qtd: lerLocal(l.chave).length })).filter((l) => l.qtd > 0);
  const totais = [["Clientes", getClientes().length], ["Veículos", getVeiculos().length], ["Produtos", getProdutos().length], ["Serviços", getServicos().length], ["Orçamentos e OS", getOrcamentos().length], ["Usuários", getUsers().length]] as const;

  const backup = () => {
    const dados = { perfis: getPerfis(), usuarios: getUsers(), configuracoes: getConfig(), clientes: getClientes(), veiculos: getVeiculos(), produtos: getProdutos(), servicos: getServicos(), orcamentos: getOrcamentos(), auditoria: getAuditoria() };
    baixar(`gordo-backup-${hoje}.json`, JSON.stringify({ versao: VERSAO, criadoEm: new Date().toISOString(), dados }, null, 2));
    registrar({ tipo: "Backup manual", alvo: "Sistema", descricao: "Cópia dos dados baixada pelo administrador." });
  };
  const exportar = () => baixar(`gordo-configuracoes-${hoje}.json`, JSON.stringify({ versao: VERSAO, config: getConfig() }, null, 2));
  const lerArquivo = (f?: File) => {
    if (!f) return;
    f.text().then((t) => {
      try { setImportado(importarConfig(t)); } catch { toast.error("Arquivo de configurações inválido."); }
    });
  };

  /** Copia os dados que estavam salvos só neste navegador para o banco, sem duplicar. */
  const migrar = async () => {
    setOcupado(true);
    const linhas: string[] = [];
    try {
      for (const l of LOCAIS) {
        const regs = lerLocal(l.chave);
        if (!regs.length) continue;
        const { data: existentes } = await supabase.from(l.tabela).select("id");
        const ja = new Set((existentes ?? []).map((x) => x.id));
        const novos = regs.filter((r) => r && typeof r.id === "string" && !ja.has(r.id));
        let ok = 0;
        const falhas: string[] = [];
        for (const r of novos) {
          const { error } = await supabase.from(l.tabela).insert(linhaDe(l.tabela, r) as never);
          if (error) falhas.push(mensagemErro(error, "erro"));
          else ok++;
        }
        linhas.push(`${l.nome}: ${regs.length} no navegador, ${regs.length - novos.length} já existiam, ${ok} migrado(s)${falhas.length ? `, ${falhas.length} com problema (${[...new Set(falhas)].join("; ")})` : ""}.`);
      }
      await carregarColecoes();
      registrar({ tipo: "Migração de dados", alvo: "Sistema", descricao: linhas.join(" ") });
      setRelatorio(linhas.length ? linhas : ["Nenhum dado local encontrado."]);
    } catch (e) {
      toast.error(mensagemErro(e, "Falha na migração. Nada foi apagado do navegador."));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="panel grid gap-4 p-5 sm:grid-cols-2">
        <Info label="Versão do sistema" valor={VERSAO} />
        <Info label="Ambiente" valor={import.meta.env.DEV ? "Pré-visualização" : "Publicado"} />
        <Info label="Armazenamento" valor="Lovable Cloud (banco de dados online)" />
        <Info label="Último backup manual" valor={ultimo ? new Date(ultimo).toLocaleString("pt-BR") : "Nenhum backup manual baixado"} />
        <div className="sm:col-span-2">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Registros no banco</div>
          <div className="mt-1 flex flex-wrap gap-2 text-sm">{totais.map(([n, q]) => <span key={n} className="rounded-md border border-border px-2 py-1">{n}: <b>{q}</b></span>)}</div>
        </div>
      </div>
      {podeAlterar ? (
        <div className="panel space-y-3 p-5">
          <h2 className="text-xl font-bold uppercase">Ações</h2>
          {locais.length > 0 && (
            <div className="rounded-md border border-warning/50 bg-warning/10 p-3 text-sm">
              <p className="mb-2">Este navegador ainda tem dados da versão anterior: {locais.map((l) => `${l.nome} (${l.qtd})`).join(", ")}.</p>
              <ConfirmDialog
                trigger={<button className="btn-primary h-9 text-xs" disabled={ocupado}><Upload className="h-3.5 w-3.5" /> {ocupado ? "Migrando..." : "Migrar para o banco online"}</button>}
                title="Migrar dados deste navegador?" description="Os registros serão copiados para o banco online. Registros já existentes não são duplicados e nada é apagado deste navegador."
                confirmLabel="Migrar" onConfirm={() => void migrar()}
              />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary h-10" onClick={backup}><Download className="h-4 w-4" /> Baixar cópia dos dados</button>
            <button className="btn-ghost h-10" onClick={exportar}><Download className="h-4 w-4" /> Exportar configurações</button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { lerArquivo(e.target.files?.[0]); e.target.value = ""; }} />
            <button className="btn-ghost h-10" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Importar configurações</button>
            <ConfirmDialog
              trigger={<button className="btn-ghost h-10"><RotateCcw className="h-4 w-4" /> Restaurar todas as configurações</button>}
              title="Restaurar todas as configurações?" description="Todas as seções voltarão ao padrão, incluindo dados da empresa e identidade visual. Os cadastros não são afetados."
              confirmLabel="Restaurar tudo"
              onConfirm={() => { salvarConfig(CONFIG_PADRAO); registrar({ tipo: "Configurações restauradas", alvo: "Todas", secao: "Todas", descricao: "Todas as configurações voltaram ao padrão." }); toast.success("Configurações restauradas."); }}
            />
          </div>
          <p className="text-xs text-muted-foreground">Os dados ficam no banco online do Lovable Cloud, que tem cópias de segurança automáticas da plataforma. A cópia baixada aqui é uma garantia extra guardada por você.</p>
        </div>
      ) : <p className="text-sm text-muted-foreground">Seu perfil não pode executar ações de manutenção.</p>}

      <ResetDados />
      <Modal open={relatorio !== null} onOpenChange={(o) => !o && setRelatorio(null)} title="Resultado da migração">
        <ul className="list-disc space-y-1 pl-5 text-sm">{relatorio?.map((l) => <li key={l}>{l}</li>)}</ul>
        <p className="mt-3 text-xs text-muted-foreground">Usuários antigos não são migrados porque as senhas não podem ser copiadas: cadastre-os novamente em Usuários.</p>
      </Modal>
      <Modal open={importado !== null} onOpenChange={(o) => !o && setImportado(null)} title="Importar configurações?" description="As configurações atuais serão substituídas pelas do arquivo.">
        <div className="flex justify-end gap-2">
          <button className="btn-ghost h-10" onClick={() => setImportado(null)}>Cancelar</button>
          <button className="btn-primary h-10" onClick={() => { salvarConfig(importado!); registrar({ tipo: "Configurações importadas", alvo: "Todas", secao: "Todas", descricao: "Configurações importadas de arquivo." }); setImportado(null); toast.success("Configurações importadas."); }}>Importar</button>
        </div>
      </Modal>
    </div>
  );
}

function useAuditoriaTipo(tipo: string) {
  return useAuditoria().filter((r) => r.tipo === tipo);
}

function Info({ label, valor }: { label: string; valor: string }) {
  return <div><div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div><div className="font-medium">{valor}</div></div>;
}
