/** Máscara monetária brasileira durante a digitação: "1250,5" → "1.250,5". Ponto digitado no fim vira vírgula. */
export function mascaraMoeda(v: string): string {
  let s = v.replace(/\s|R\$/g, "");
  if (!s.includes(",") && /\.\d{0,2}$/.test(s) && !/\.\d{3}/.test(s)) {
    const i = s.lastIndexOf(".");
    s = s.slice(0, i) + "," + s.slice(i + 1);
  }
  s = s.replace(/[^\d,]/g, "");
  const [intRaw = "", ...resto] = s.split(",");
  const temVirgula = resto.length > 0;
  const dec = resto.join("").slice(0, 2);
  let int = intRaw.replace(/^0+(?=\d)/, "").slice(0, 12);
  if (!int && temVirgula) int = "0";
  int = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return temVirgula ? `${int},${dec}` : int;
}

/** Converte texto mascarado ("1.250,50") em número (1250.5). */
export function moedaParaNumero(v: string): number {
  if (!v) return 0;
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
}

/** Número → texto do campo ("1.250,50"); zero vira vazio. */
export const numeroParaMoeda = (n: number) =>
  n ? n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";

/** Próximo código sequencial único: PROD-000001, SERV-000001... */
export function proximoCodigo(prefixo: string, existentes: string[]): string {
  const re = new RegExp(`^${prefixo}-(\\d+)$`, "i");
  const max = existentes.reduce((m, c) => Math.max(m, Number(re.exec(c.trim())?.[1] ?? 0)), 0);
  return `${prefixo}-${String(max + 1).padStart(6, "0")}`;
}
