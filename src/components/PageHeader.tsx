import type { ReactNode } from "react";
import { Wrench } from "lucide-react";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold uppercase sm:text-4xl">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        <div className="racing-line mt-2 w-24" />
      </div>
      {action}
    </div>
  );
}

export function Placeholder({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <div className="panel flex flex-col items-center justify-center gap-3 p-12 text-center">
        <Wrench className="h-10 w-10 text-primary" />
        <h2 className="text-2xl font-bold uppercase">Módulo em desenvolvimento</h2>
        <p className="text-sm text-muted-foreground">Esta área estará disponível em breve.</p>
      </div>
    </>
  );
}
