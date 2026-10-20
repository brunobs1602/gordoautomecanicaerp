import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Modal } from "@/components/Modal";
import { resetarDadosOperacionais, type ResultadoReset } from "@/lib/usuarios.functions";
import { aguardarGravacoes, carregarColecoes } from "@/lib/store";
import { carregarAuditoria } from "@/lib/auditoria";
import { CONFIG_PADRAO, salvarConfig } from "@/lib/config";
import { registrar } from "@/lib/auditoria";
import { useClientes } from "@/lib/clientes";
import { useVeiculos } from "@/lib/veiculos";
import { useProdutos } from "@/lib/produtos";
import { useServicos } from "@/lib/servicos";
import { useOrcamentos } from "@/lib/orcamentos";
import { useCurrentUser } from "@/lib/auth";

const FRASE = "RESETAR DADOS";
const PRESERVADOS = ["Usuários e contas de acesso", "Perfis de acesso e permissões", "Marcas de veículos", "Categorias de produtos e de serviços", "Histórico de alterações", "Configurações de segurança"];

export function ResetDados() {
  const user = useCurrentUser();
  const clientes = useClientes(), veiculos = useVeiculos(), produtos = useProdutos(), servicos = useServicos(), orcs = useOrcamentos();
  const executar = useServerFn(resetarDadosOperacionais);
  const [etapa, setEtapa] = useState<0 | 1 | 2>(0);
  const [frase, setFrase] = useState("");
  const [senha, setSenha] = useState("");
  const [restaurarConfig, setRestaurarConfig] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState<ResultadoReset | null>(null);

  // Impede sair da página no meio da limpeza.
  useEffect(() => {
    if (!ocupado) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [ocupado]);

  if (user?.role !== "admin") return null;

  const nOrc = orcs.filter((o) => o.tipo !== "os").length;
  const nOs = orcs.filter((o) => o.tipo === "os").length;
  const contagem: [string, number][] = [
    ["Clientes", clientes.length], ["Veículos", veiculos.length], ["Produtos", produtos.length], ["Serviços", servicos.length],
    ["Orçamentos", nOrc], ["Ordens de serviço", nOs], ["Registros de estoque", produtos.length], ["Anexos", 0],
  ];

  const abrir = () => { setEtapa(1); setFrase(""); setSenha(""); setErro(""); setRestaurarConfig(false); };
  const fechar = () => { if (!ocupado) setEtapa(0); };

  const rodar = async () => {
    if (ocupado) return;
    setOcupado(true);
    setErro("");
    try {
      await aguardarGravacoes();
      const r = await executar({ data: { senha, frase: FRASE as "RESETAR DADOS" } });
      if (restaurarConfig) {
        salvarConfig(CONFIG_PADRAO);
        registrar({ tipo: "Configurações restauradas", alvo: "Todas", secao: "Todas", descricao: "Configurações voltaram ao padrão durante o reset de dados." });
      }
      await carregarColecoes();
      await carregarAuditoria().catch(() => undefined);
      setResultado(r);
      setEtapa(0);
    } catch (e) {
      setErro((e as Error).message || "A limpeza não foi concluída. Nenhum dado foi apagado.");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="panel space-y-3 border-destructive/40 p-5">
      <h2 className="text-xl font-bold uppercase">Limpar dados de teste</h2>
      <p className="text-sm text-muted-foreground">Apaga clientes, veículos, produtos, serviços, orçamentos e OS cadastrados durante os testes, para começar o uso oficial. Somente administradores veem esta opção.</p>
      <button className="btn-ghost h-10 hover:text-destructive" onClick={abrir}><Trash2 className="h-4 w-4" /> Limpar dados de teste</button>

      <Modal open={etapa > 0} onOpenChange={(o) => !o && fechar()} title="Limpar dados de teste">
        {etapa === 1 ? (
          <div className="space-y-4 text-sm">
            <div className="flex gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
              <p>Esta ação excluirá os dados operacionais selecionados e não poderá ser desfeita facilmente. Usuários, perfis, permissões, marcas e categorias serão preservados.</p>
            </div>
            <div>
              <div className="mb-1 font-semibold">Serão excluídos</div>
              <div className="grid grid-cols-2 gap-1.5">{contagem.map(([n, q]) => <span key={n} className="rounded-md border border-border px-2 py-1">{n}: <b>{q}</b></span>)}</div>
            </div>
            <div>
              <div className="mb-1 font-semibold">Serão preservados</div>
              <ul className="list-disc pl-5 text-muted-foreground">{PRESERVADOS.map((p) => <li key={p}>{p}</li>)}</ul>
            </div>
            <label className="flex items-start gap-2">
              <input type="checkbox" className="mt-1" checked={restaurarConfig} onChange={(e) => setRestaurarConfig(e.target.checked)} />
              <span>Também restaurar as configurações da empresa, identidade visual e documentos para o padrão (se desmarcado, ficam como estão).</span>
            </label>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost h-10" onClick={fechar}>Cancelar</button>
              <button className="btn-primary h-10" onClick={() => setEtapa(2)}>Continuar</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            <label className="block space-y-1.5">
              <span className="font-medium text-metal">Digite <b>{FRASE}</b> para confirmar</span>
              <input className="field" value={frase} onChange={(e) => setFrase(e.target.value)} disabled={ocupado} autoComplete="off" />
            </label>
            <label className="block space-y-1.5">
              <span className="font-medium text-metal">Sua senha de administrador</span>
              <input className="field" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} disabled={ocupado} autoComplete="current-password" />
            </label>
            {erro && <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-destructive">{erro}</div>}
            {ocupado && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Limpando os dados... não feche esta página.</div>}
            <div className="flex justify-end gap-2">
              <button className="btn-ghost h-10" onClick={() => setEtapa(1)} disabled={ocupado}>Voltar</button>
              <button className="btn-primary h-10" disabled={ocupado || frase !== FRASE || !senha} onClick={() => void rodar()}>
                {ocupado ? "Limpando..." : "Apagar dados de teste"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={resultado !== null} onOpenChange={(o) => !o && setResultado(null)} title="Reset concluído com sucesso">
        {resultado && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-success"><CheckCircle2 className="h-5 w-5" /> Os dados de teste foram removidos.</div>
            <ul className="grid grid-cols-2 gap-1.5">
              {([["Clientes", resultado.clientes], ["Veículos", resultado.veiculos], ["Produtos", resultado.produtos], ["Serviços", resultado.servicos], ["Orçamentos", resultado.orcamentos], ["Ordens de serviço", resultado.ordens], ["Registros de estoque", resultado.estoque]] as const).map(([n, q]) => (
                <li key={n} className="rounded-md border border-border px-2 py-1">{n} removidos: <b>{q}</b></li>
              ))}
            </ul>
            <p><b>Preservados:</b> {PRESERVADOS.join(", ")}.</p>
            <p><b>Responsável:</b> {user.name} · <b>Data:</b> {new Date(resultado.data).toLocaleString("pt-BR")}</p>
            <p className="text-xs text-muted-foreground">A operação foi registrada no histórico. Não há botão para desfazer: a recuperação só é possível pela cópia dos dados baixada antes, em "Baixar cópia dos dados".</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
