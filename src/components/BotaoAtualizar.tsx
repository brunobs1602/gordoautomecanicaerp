import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { atualizarDoBanco } from "@/lib/store";

/** Relê os dados do banco para mostrar o que outros usuários cadastraram. */
export function BotaoAtualizar() {
  const [carregando, setCarregando] = useState(false);
  return (
    <button
      type="button"
      className="btn-ghost"
      disabled={carregando}
      title="Atualizar lista"
      onClick={async () => {
        setCarregando(true);
        try {
          await atualizarDoBanco();
          toast.success("Lista atualizada.");
        } catch {
          toast.error("Falha de conexão. Não foi possível atualizar.");
        } finally {
          setCarregando(false);
        }
      }}
    >
      <RefreshCw className={`h-4 w-4 ${carregando ? "animate-spin" : ""}`} /> Atualizar
    </button>
  );
}
