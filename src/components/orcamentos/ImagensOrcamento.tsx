import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useAcesso } from "@/lib/acesso";
import { useCurrentUser } from "@/lib/auth";
import { agoraISO } from "@/lib/store";
import { definirImagens, getOrcamentos, podeEditar, type Orcamento } from "@/lib/orcamentos";
import { enviarImagemOrcamento, removerArquivoOrcamento, urlImagemOrcamento } from "@/lib/portal";
import { ConfirmDialog } from "@/components/ConfirmDialog";

function Miniatura({ caminho, onAbrir }: { caminho: string; onAbrir: (u: string) => void }) {
  const [url, setUrl] = useState("");
  useEffect(() => { let vivo = true; void urlImagemOrcamento(caminho).then((u) => vivo && setUrl(u)); return () => { vivo = false; }; }, [caminho]);
  if (!url) return <div className="aspect-square animate-pulse rounded-md bg-muted" />;
  return (
    <button type="button" onClick={() => onAbrir(url)} className="block aspect-square w-full overflow-hidden rounded-md border border-border">
      <img src={url} alt="Foto do problema" className="h-full w-full object-cover" loading="lazy" />
    </button>
  );
}

/** Fotos dos problemas encontrados no veículo (comprimidas antes do envio, armazenamento privado). */
export function ImagensOrcamento({ o }: { o: Orcamento }) {
  const { pode } = useAcesso();
  const user = useCurrentUser();
  const input = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(0);
  const [aberta, setAberta] = useState("");
  const imagens = o.imagens ?? [];
  const editavel = o.tipo === "orcamento" && podeEditar(o.status) && pode("orcamentos", "editar");

  const enviar = async (files: FileList | null) => {
    if (!files?.length) return;
    const lista = Array.from(files).slice(0, 10);
    setEnviando(lista.length);
    const novas = [];
    for (const f of lista) {
      try {
        const r = await enviarImagemOrcamento(o.id, f);
        novas.push({ ...r, criadoEm: agoraISO(), usuario: user?.name ?? "—" });
      } catch (e) { toast.error(`${f.name}: ${(e as Error).message}`); }
      setEnviando((n) => n - 1);
    }
    if (novas.length) {
      const atual = getOrcamentos().find((x) => x.id === o.id)?.imagens ?? [];
      definirImagens(o.id, [...atual, ...novas], user?.name ?? "—", `${novas.length} foto(s) anexada(s)`);
      toast.success(`${novas.length} foto(s) anexada(s).`);
    }
    if (input.current) input.current.value = "";
  };

  const remover = async (caminho: string) => {
    try {
      const atual = getOrcamentos().find((x) => x.id === o.id)?.imagens ?? [];
      definirImagens(o.id, atual.filter((i) => i.caminho !== caminho), user?.name ?? "—", "Foto removida");
      await removerArquivoOrcamento(caminho);
      toast.success("Foto removida.");
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <section className="panel p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold uppercase text-metal">Fotos dos problemas</h2>
        {editavel && (
          <>
            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple className="hidden" onChange={(e) => void enviar(e.target.files)} />
            <button type="button" className="btn-ghost h-10" disabled={enviando > 0} onClick={() => input.current?.click()}>
              {enviando > 0 ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} {enviando > 0 ? `Enviando (${enviando})...` : "Anexar fotos"}
            </button>
          </>
        )}
      </div>
      {imagens.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma foto anexada.{editavel && " JPG, PNG, WEBP ou HEIC, até 15 MB; as fotos são reduzidas automaticamente."}</p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {imagens.map((im) => (
            <div key={im.caminho} className="relative">
              <Miniatura caminho={im.caminho} onAbrir={setAberta} />
              {editavel && (
                <ConfirmDialog
                  trigger={<button type="button" aria-label="Remover foto" className="absolute right-1 top-1 rounded-full bg-background/90 p-1.5 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>}
                  title="Remover foto?" description="A foto será apagada deste orçamento." confirmLabel="Remover" onConfirm={() => void remover(im.caminho)}
                />
              )}
            </div>
          ))}
        </div>
      )}
      {aberta && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/90 p-4" onClick={() => setAberta("")}>
          <button className="absolute right-4 top-4 rounded-full bg-card p-2" aria-label="Fechar"><X className="h-5 w-5" /></button>
          <img src={aberta} alt="Foto ampliada" className="max-h-full max-w-full rounded-md object-contain" />
        </div>
      )}
    </section>
  );
}
