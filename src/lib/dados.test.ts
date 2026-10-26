import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Uma coleção fora de dados.ts não é registrada na abertura e some após F5.
describe("módulos de dados carregados na abertura", () => {
  it("todo módulo com createCollection é importado em dados.ts", () => {
    const dir = join(__dirname);
    const dados = readFileSync(join(dir, "dados.ts"), "utf8");
    const modulos = readdirSync(dir)
      .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && f !== "store.ts")
      .filter((f) => /createCollection</.test(readFileSync(join(dir, f), "utf8")))
      .map((f) => f.replace(/\.ts$/, ""));
    expect(modulos).toContain("financeiro");
    for (const m of modulos) expect(dados).toContain(`import "./${m}"`);
  });
});
