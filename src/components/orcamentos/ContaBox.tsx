import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { UserRound } from "lucide-react";
import { cadastrarContaPortal } from "@/lib/portal.functions";
import { entrarCliente, minhaConta, vincularLink, type ContaCliente } from "@/lib/portal-conta";
import { Field, FormError } from "@/components/AuthCard";

/** No link do orçamento: o cliente pode seguir sem conta ou criar uma para guardar o histórico. */
export function ContaBox({ token }: { token: string }) {
  const [estado, setEstado] = useState<"carregando" | "sem" | "conta" | "outro">("carregando");
  const [conta, setConta] = useState<ContaCliente | null>(null);
  const [aviso, setAviso] = useState("");
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [existe, setExiste] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    void minhaConta().then(async (c) => {
      if (!c) return setEstado("sem");
      if ("erro" in c) { setAviso("Seu acesso ao portal está desativado. Fale com a oficina."); return setEstado("outro"); }
      try { await vincularLink(token); setConta(c); setEstado("conta"); }
      catch (e) { setAviso((e as Error).message); setEstado("outro"); }
    }).catch(() => setEstado("sem"));
  }, [token]);

  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(""); setExiste(false);
    if (senha.length < 8) return setErro("A senha deve ter pelo menos 8 caracteres.");
    setOcupado(true);
    try {
      const r = await cadastrarContaPortal({ data: { token, nome, email, senha } });
      if (!r.ok) { setErro(r.mensagem); setExiste(!!r.existe); return; }
      const c = await entrarCliente(email, senha);
      setConta(c); setEstado("conta"); setAberto(false);
    } catch (x) { setErro((x as Error).message); }
    finally { setOcupado(false); }
  };

  if (estado === "carregando") return null;
  if (estado === "outro") return aviso ? <div className="panel p-4 text-sm text-muted-foreground">{aviso}</div> : null;
  if (estado === "conta") return (
    <div className="panel flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
      <span><UserRound className="mr-1 inline h-4 w-4" /> Conectado como {conta?.nome || conta?.email}</span>
      <Link to="/cliente" className="btn-ghost h-9">Ver todos os meus orçamentos</Link>
    </div>
  );
  return (
    <section className="panel p-4 text-sm sm:p-5">
      <h2 className="mb-1 text-base font-bold uppercase text-metal">Guarde seu histórico</h2>
      <p className="mb-3 text-muted-foreground">Você pode responder sem cadastro. Se preferir, crie uma conta para ver todos os seus orçamentos depois.</p>
      {!aberto ? (
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary h-10" onClick={() => setAberto(true)}>Criar minha conta</button>
          <Link to="/cliente/entrar" search={{ voltar: `/portal/${token}` }} className="btn-ghost h-10">Já tenho conta</Link>
        </div>
      ) : (
        <form onSubmit={criar} className="space-y-3" noValidate>
          <FormError message={erro} />
          {existe && <Link to="/cliente/entrar" search={{ voltar: `/portal/${token}` }} className="block text-sm underline">Entrar ou recuperar a senha</Link>}
          <Field label="Nome" autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} />
          <Field label="E-mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Field label="Senha (mínimo 8 caracteres)" type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
          <div className="flex gap-2">
            <button className="btn-primary h-10" disabled={ocupado}>{ocupado ? "Criando..." : "Criar conta"}</button>
            <button type="button" className="btn-ghost h-10" onClick={() => setAberto(false)}>Cancelar</button>
          </div>
        </form>
      )}
    </section>
  );
}
