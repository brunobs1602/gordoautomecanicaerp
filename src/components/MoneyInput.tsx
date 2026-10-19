import { useEffect, useState } from "react";
import { mascaraMoeda, moedaParaNumero, numeroParaMoeda } from "@/lib/moeda";

/** Campo monetário no padrão brasileiro (R$ 1.250,50). Entrega sempre um número. */
export function MoneyInput({ label, value, onChange, error, disabled }: {
  label: string; value: number; onChange: (n: number) => void; error?: string | undefined; disabled?: boolean;
}) {
  const [txt, setTxt] = useState(() => numeroParaMoeda(value));
  useEffect(() => {
    if (moedaParaNumero(txt) !== value) setTxt(numeroParaMoeda(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-metal">{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
        <input
          className="field pl-10 text-right tabular-nums"
          inputMode="decimal"
          placeholder="0,00"
          disabled={disabled}
          value={txt}
          onChange={(e) => {
            const m = mascaraMoeda(e.target.value);
            setTxt(m);
            onChange(moedaParaNumero(m));
          }}
          onBlur={() => setTxt(numeroParaMoeda(moedaParaNumero(txt)))}
        />
      </div>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </label>
  );
}
