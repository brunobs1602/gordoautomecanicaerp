import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useAcesso } from "@/lib/acesso";
import { garantirHistoricoFin, useCadastrosFin, useHistoricoFin } from "@/lib/financeiro";
import { codigoDoc, useOrcamentos } from "@/lib/orcamentos";
import { moeda } from "@/lib/store";
import { Campo, FiltroPeriodo, Vazio, dataHora, intervalo, type Periodo } from "./ui";

export function HistoricoFin() {
  const hist = useHistoricoFin();
  const cads = useCadastrosFin();
  const orcs = useOrcamentos();
  const [erro, setErro] = useState("");
  useEffect(() => { garantirHistoricoFin().catch(() => setErro("Não foi possível carregar o histórico.")); }, []);
  const [p, setP] = useState<Periodo>("mes");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [tipo, setTipo] = useState("");
  const [ini, fim] = intervalo(p, de, ate);
  const tipos = [...new Set(hist.map((h) => h.tipo))].sort();
  const nome = (id: string | null) => cads.find((c) => c.id === id)?.nome ?? "";
  const lista = hist.filter((h) => h.data.slice(0, 10) >= ini && h.data.slice(0, 10) <= fim && (!tipo || h.tipo === tipo)).sort((a, b) => b.data.localeCompare(a.data));
  return (
    <>
      <PageHeader title="Histórico financeiro" subtitle="Registro permanente de todas as movimentações. Não pode ser apagado." />
      <div className="panel mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <FiltroPeriodo p={p} setP={setP} de={de} setDe={setDe} ate={ate} setAte={setAte} />
        <Campo label="Tipo"><select className="field" value={tipo} onChange={(e) => setTipo(e.target.value)}><option value="">Todos</option>{tipos.map((t) => <option key={t}>{t}</option>)}</select></Campo>
      </div>
      {erro ? <Vazio>{erro}</Vazio> : lista.length === 0 ? <Vazio>Nenhum registro no período.</Vazio> : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground"><th className="p-3">Data e hora</th><th className="p-3">Usuário</th><th className="p-3">Tipo</th><th className="p-3 text-right">Valor</th><th className="p-3">Conta / forma</th><th className="p-3">Documento</th><th className="p-3">Status</th><th className="p-3">Observação</th></tr></thead>
            <tbody>{lista.map((h) => {
              const o = orcs.find((x) => x.id === h.documentoId);
              return (
                <tr key={h.id} className="border-b border-border/60 last:border-0">
                  <td className="p-3 whitespace-nowrap">{dataHora(h.data)}</td><td className="p-3">{h.usuarioNome || "—"}</td><td className="p-3 font-medium">{h.tipo}</td>
                  <td className="p-3 text-right">{h.valor != null ? moeda(h.valor) : "—"}</td>
                  <td className="p-3 text-muted-foreground">{[nome(h.contaId), nome(h.formaId)].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="p-3 font-mono text-xs">{o ? codigoDoc(o) : "—"}</td>
                  <td className="p-3 text-xs">{h.statusAnterior || h.statusNovo ? `${h.statusAnterior ?? "—"} → ${h.statusNovo ?? "—"}` : "—"}</td>
                  <td className="p-3 text-xs">{h.observacao}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function ConfigFin() {
  const { pode } = useAcesso();
  const cads = useCadastrosFin();
  const conta = (t: string) => cads.filter((c) => c.tipo === t && c.ativo).length;
  return (
    <>
      <PageHeader title="Configurações financeiras" subtitle="Para começar, cadastre uma forma de pagamento. Os demais cadastros são opcionais." />
      <div className="panel mb-4 space-y-3 p-5 text-sm">
        <h3 className="font-display text-lg font-bold uppercase">Receber pelas ordens de serviço</h3>
        <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
          <li>Cadastre as formas aceitas pela oficina. Informe apenas o nome e o tipo; a conta pode ficar automática.</li>
          <li>Ao finalizar a OS, informe se o cliente já pagou, escolha a forma e confirme o valor. Maquininha, bandeira e chave Pix não são obrigatórias.</li>
          <li>Se o cliente ainda não pagou, o saldo fica em Contas a receber, sem entrada no caixa. Confirme o recebimento quando ele acontecer.</li>
        </ol>
        <Link to="/financeiro/$secao" params={{ secao: "formas" }} className="btn-ghost h-10">Cadastrar ou revisar formas de pagamento</Link>
        <p className="text-muted-foreground">Prefere tratar o pagamento depois? Em Configurações → Financeiro básico, desative “Registrar pagamento ao finalizar a OS”. A OS concluída terá o botão “Registrar pagamento / saldo”, sem marcar o valor como recebido automaticamente.</p>
        <p className="text-xs text-muted-foreground">A conta automática usa a conta padrão da forma, a única conta ativa ou o Caixa da oficina. Se necessário, esse caixa é criado sem saldo inicial. Para controlar taxas de cartão, mantenha os cadastros adicionais já disponíveis.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="panel p-5 text-sm">
          <h3 className="mb-2 font-display text-lg font-bold uppercase">Resumo</h3>
          <ul className="space-y-1 text-muted-foreground">
            <li>{conta("conta")} conta(s) bancária(s) ativa(s)</li><li>{conta("forma")} forma(s) de pagamento</li>
            <li>{conta("maquininha")} maquininha(s) · {conta("taxa")} taxa(s)</li><li>{conta("pix")} chave(s) Pix</li>
            <li>{conta("categoria")} categoria(s) · {conta("centro")} centro(s) de custo</li>
          </ul>
        </div>
        <div className="panel p-5 text-sm">
          <h3 className="mb-2 font-display text-lg font-bold uppercase">Regras gerais</h3>
          <p className="mb-3 text-muted-foreground">Prazo de alerta de vencimento, condições de pagamento padrão e abertura da etapa de pagamento ao finalizar a OS ficam em Configurações → Financeiro básico.</p>
          {pode("configuracoes") && <Link to="/configuracoes" className="btn-ghost h-10"><Settings className="h-4 w-4" /> Abrir configurações</Link>}
        </div>
        <div className="panel p-5 text-sm md:col-span-2">
          <h3 className="mb-2 font-display text-lg font-bold uppercase">Segurança</h3>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Pagamentos confirmados não são apagados nem editados: use estorno com justificativa.</li>
            <li>Contas são canceladas, nunca excluídas; contas bancárias e cadastros são inativados.</li>
            <li>Valores acima do total só são aceitos com confirmação de administrador.</li>
            <li>Não são guardados números completos de cartão nem senhas/tokens de maquininhas.</li>
            <li>Pix: estrutura pronta para QR Code e confirmação automática, sem integração bancária externa nesta etapa.</li>
            <li>As permissões (visualizar, criar, editar, registrar pagamentos, cancelar, estornar, exportar, configurar) são definidas em Perfis de acesso → Financeiro.</li>
          </ul>
        </div>
      </div>
    </>
  );
}
