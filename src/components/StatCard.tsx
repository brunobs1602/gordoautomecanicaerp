import type { LucideIcon } from "lucide-react";
import { useConfig } from "@/lib/config";

export function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  const estilo = useConfig().visual.estiloCards;
  const extra = estilo === "contorno" ? "border-primary/60" : estilo === "destaque" ? "border-t-4 border-t-primary" : "";
  return (
    <div className={`panel relative overflow-hidden p-5 ${extra}`}>
      <div className="absolute inset-x-0 top-0 racing-line" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-4xl font-bold">{value}</p>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-red-gradient shadow-red">
          <Icon className="h-5 w-5 text-primary-foreground" />
        </div>
      </div>
    </div>
  );
}
