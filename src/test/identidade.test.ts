import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const src = join(__dirname, "..");
const ler = (arquivo: string) => readFileSync(join(src, arquivo), "utf8");
const antigo = /gordo|auto\s*mec[aâ]nica/i;

function paginas(dir = join(src, "routes")): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = join(dir, entrada.name);
    if (entrada.isDirectory()) return paginas(caminho);
    return entrada.name.endsWith(".tsx") ? [caminho] : [];
  });
}

describe("identidade Mecavon", () => {
  it("usa Mecavon nos títulos das páginas sem a marca antiga", () => {
    const titulos = paginas().flatMap((arquivo) => {
      const texto = readFileSync(arquivo, "utf8");
      return [...texto.matchAll(/\{\s*title:\s*(["'`])([^\n]*?)\1\s*\}/g)]
        .map((match) => ({ arquivo, titulo: match[2]! }));
    });
    expect(titulos.length).toBeGreaterThan(30);
    for (const { arquivo, titulo } of titulos) {
      expect(titulo, arquivo).toContain("Mecavon");
      expect(titulo, arquivo).not.toMatch(antigo);
    }
  });

  it("não mantém o nome antigo em metadados ou na marca compartilhada", () => {
    for (const arquivo of paginas()) {
      const texto = readFileSync(arquivo, "utf8");
      const metadados = texto.match(/\{\s*(?:name|property):[^\n]*content:[^\n]*\}/g) ?? [];
      for (const meta of metadados) expect(meta, arquivo).not.toMatch(antigo);
    }
    const marca = ler("components/Brand.tsx");
    expect(marca).toContain("MECAVON");
    expect(marca).not.toMatch(antigo);
    expect(ler("routes/__root.tsx")).toContain("Mecavon — sistema de gestão para oficinas mecânicas.");
  });

  it("preserva a origem dos logotipos e do nome comercial da oficina", () => {
    const marca = ler("components/Brand.tsx");
    expect(marca).toContain("cfg.empresa.logoDocs");
    expect(marca).toContain("cfg.empresa.logo");
    expect(marca).toContain("useImagem");
    expect(ler("routes/_authenticated/dashboard.tsx")).toContain("useConfig().empresa.nomeFantasia");
    expect(ler("routes/portal.$token.tsx")).toContain("{d.empresa.nome}");
  });

  it("nomeia novos downloads sem perder as chaves de dados legados", () => {
    const manutencao = ler("routes/_authenticated/configuracoes.tsx");
    expect(manutencao).toContain("mecavon-backup-${hoje}.json");
    expect(manutencao).toContain("mecavon-configuracoes-${hoje}.json");
    for (const tabela of ["clientes", "veiculos", "produtos", "servicos", "orcamentos"]) {
      expect(manutencao).toContain(`chave: "gordo.${tabela}"`);
    }
  });
});
