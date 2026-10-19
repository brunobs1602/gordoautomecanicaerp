import { Cog } from "lucide-react";

/** Espaço reservado para a logo oficial (substituir pelo arquivo da logo). */
export function LogoSlot({ size = 48 }: { size?: number }) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full border-2 border-dashed border-primary/60 bg-background"
      style={{ width: size, height: size }}
      title="Espaço para a logo"
    >
      <Cog className="text-primary" style={{ width: size * 0.5, height: size * 0.5 }} />
    </div>
  );
}

export function BrandName({ compact = false }: { compact?: boolean }) {
  return (
    <div className="leading-none">
      <div className={`font-display font-extrabold italic text-metal ${compact ? "text-xl" : "text-3xl"}`}>
        GORDO
      </div>
      <div className={`font-display font-bold italic uppercase text-primary ${compact ? "text-[11px]" : "text-sm"}`}>
        Auto Mecânica · ERP
      </div>
    </div>
  );
}
