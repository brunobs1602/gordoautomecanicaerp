import { describe, expect, it, vi } from "vitest";
import { lerComRecuperacao } from "./leitura";

describe("recuperação de leitura", () => {
  it("repete uma falha temporária e devolve os dados", async () => {
    vi.useFakeTimers();
    try {
      const ler = vi.fn().mockRejectedValueOnce(new Error("Failed to fetch")).mockResolvedValue(["registro"]);
      const resultado = lerComRecuperacao(ler);
      await vi.runAllTimersAsync();
      expect(await resultado).toEqual(["registro"]);
      expect(ler).toHaveBeenCalledTimes(2);
    } finally { vi.useRealTimers(); }
  });
  it("não repete erros de permissão", async () => {
    const ler = vi.fn().mockRejectedValue({ code: "42501", message: "permission denied" });
    await expect(lerComRecuperacao(ler)).rejects.toMatchObject({ code: "42501" });
    expect(ler).toHaveBeenCalledTimes(1);
  });
});