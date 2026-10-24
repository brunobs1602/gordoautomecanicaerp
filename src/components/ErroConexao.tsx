import { useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

/** Tela amigável quando o sistema não consegue falar com o servidor. */
export function ErroConexao({ error }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="panel max-w-md p-8 text-center">
        <h1 className="mb-2 text-2xl font-bold uppercase">Não foi possível conectar</h1>
        <p className="mb-4 text-sm text-muted-foreground">{error instanceof Error && error.message ? error.message : "Falha de conexão."}</p>
        <Button className="btn-primary" onClick={() => void router.invalidate()}>Tentar novamente</Button>
      </div>
    </div>
  );
}
