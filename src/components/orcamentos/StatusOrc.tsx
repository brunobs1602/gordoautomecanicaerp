import { STATUS_LABEL, type Status } from "@/lib/orcamentos";

const COR: Record<Status, string> = {
  rascunho: "bg-muted text-muted-foreground",
  aguardando: "bg-warning/15 text-warning",
  aprovado: "bg-success/15 text-success",
  recusado: "bg-destructive/15 text-destructive",
  reaberto: "bg-info/15 text-info",
  cancelado: "bg-muted text-muted-foreground line-through",
  convertido: "bg-primary/15 text-primary",
};

export function StatusOrc({ status }: { status: Status }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${COR[status]}`}>{STATUS_LABEL[status]}</span>;
}
