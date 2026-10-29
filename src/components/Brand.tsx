import { Cog } from "lucide-react";
import { useConfig } from "@/lib/config";
import { useImagem } from "@/lib/arquivos";

/** Logo da empresa (configurável em Configurações). Mostra uma engrenagem quando não há logo. */
export function LogoSlot({ size = 48, docs = false }: { size?: number; docs?: boolean }) {
  const cfg = useConfig();
  const src = useImagem(String((docs && cfg.empresa.logoDocs) || cfg.empresa.logo || ""));
  if (src) return <img src={src} alt="Logo da empresa" className="shrink-0 rounded-full object-contain" style={{ width: size, height: size }} />;
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full border-2 border-dashed border-primary/60 bg-background"
      style={{ width: size, height: size }}
      title="Envie a logo em Configurações"
    >
      <Cog className="text-primary" style={{ width: size * 0.5, height: size * 0.5 }} />
    </div>
  );
}

export function BrandName({ compact = false }: { compact?: boolean }) {
  return (
    <div className="leading-none">
      <div className={`font-display font-extrabold italic text-metal ${compact ? "text-xl" : "text-3xl"}`}>
        MECAVON
      </div>
      <div className={`font-display font-bold italic uppercase text-primary ${compact ? "text-[11px]" : "text-sm"}`}>
        Gestão de oficinas · ERP
      </div>
    </div>
  );
}
