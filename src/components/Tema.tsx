import { useEffect } from "react";
import { CONFIG_PADRAO, useConfig, type Config, type Valor } from "@/lib/config";

const CLARO: Record<string, string> = {
  "--background": "#f4f4f5", "--foreground": "#1a1b1e", "--card": "#ffffff", "--card-foreground": "#1a1b1e",
  "--popover": "#ffffff", "--popover-foreground": "#1a1b1e", "--secondary": "#e7e7ea", "--secondary-foreground": "#1a1b1e",
  "--muted": "#ececef", "--muted-foreground": "#5d6068", "--accent": "#e4e4e8", "--accent-foreground": "#1a1b1e",
  "--border": "#d4d4d8", "--input": "#d4d4d8", "--metal": "#3f4148", "--sidebar": "#1d1e22", "--sidebar-border": "#2b2c31",
};

/** Mapeia as cores escolhidas nas configurações para os tokens de tema. */
export function variaveisTema(v: Config["visual"], padrao: Config["visual"] = CONFIG_PADRAO.visual): Record<string, string> {
  const vv = v as Record<string, Valor>;
  const pp = padrao as Record<string, Valor>;
  const out: Record<string, string> = v.tema === "claro" ? { ...CLARO } : {};
  const map: [string, string[]][] = [
    ["primaria", ["--primary", "--primary-glow", "--ring", "--sidebar-primary", "--sidebar-ring"]],
    ["secundaria", ["--secondary"]],
    ["destaque", ["--accent", "--sidebar-accent"]],
    ["fundo", ["--background"]],
    ["texto", ["--foreground", "--card-foreground"]],
    ["sucesso", ["--success"]],
    ["alerta", ["--warning"]],
    ["erro", ["--destructive"]],
  ];
  for (const [k, vars] of map) if (vv[k] !== pp[k]) vars.forEach((x) => (out[x] = String(vv[k])));
  if (v.arredondamento !== padrao.arredondamento) out["--radius"] = `${Number(v.arredondamento) || 0}px`;
  return out;
}

/** Aplica a identidade visual salva em todo o sistema. */
export function AplicarTema() {
  const cfg = useConfig();
  useEffect(() => {
    const root = document.documentElement;
    const vars = variaveisTema(cfg.visual);
    const aplicadas = Object.keys(vars);
    aplicadas.forEach((k) => root.style.setProperty(k, vars[k]!));
    root.style.fontSize = `${Number(cfg.visual.fonte) || 16}px`;
    root.dataset["densidade"] = String(cfg.visual.densidade);
    const fav = String(cfg.empresa.favicon || "");
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (fav) {
      if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
      link.href = fav;
    }
    return () => aplicadas.forEach((k) => root.style.removeProperty(k));
  }, [cfg]);
  return null;
}
