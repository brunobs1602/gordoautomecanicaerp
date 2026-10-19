export function StatusBadge({ ativo }: { ativo: boolean }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${ativo ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
      {ativo ? "Ativo" : "Inativo"}
    </span>
  );
}

export function TipoBadge({ tipo }: { tipo: "PF" | "PJ" }) {
  return (
    <span className="inline-block rounded border border-border px-2 py-0.5 text-[11px] font-semibold uppercase text-metal">
      {tipo === "PF" ? "Física" : "Jurídica"}
    </span>
  );
}
