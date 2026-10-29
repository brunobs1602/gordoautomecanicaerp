import { webcrypto } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { uuid } from "./uuid";

const formatoV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

afterEach(() => vi.unstubAllGlobals());

describe("uuid", () => {
  it("prioriza randomUUID e preserva seu receptor", () => {
    const esperado = "12345678-1234-4234-8234-123456789abc";
    const crypto = {
      randomUUID: vi.fn(function (this: unknown) {
        expect(this).toBe(crypto);
        return esperado;
      }),
      getRandomValues: vi.fn(),
    };
    vi.stubGlobal("crypto", crypto);
    expect(uuid()).toBe(esperado);
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1);
    expect(crypto.getRandomValues).not.toHaveBeenCalled();
  });

  it("gera UUIDs v4 com a implementação criptográfica nativa", () => {
    vi.stubGlobal("crypto", webcrypto);
    for (let i = 0; i < 32; i++) expect(uuid()).toMatch(formatoV4);
  });

  it.each([0x00, 0xff, 0x35, 0x80])("configura versão e variante no fallback (byte %i)", (valor) => {
    const crypto = {
      getRandomValues: vi.fn(function (this: unknown, bytes: Uint8Array) {
        expect(this).toBe(crypto);
        expect(bytes).toBeInstanceOf(Uint8Array);
        expect(bytes).toHaveLength(16);
        bytes.fill(valor);
        return bytes;
      }),
    };
    vi.stubGlobal("crypto", crypto);
    const id = uuid();
    expect(id).toMatch(formatoV4);
    const bytes = id.replace(/-/g, "").match(/../g)!.map((hex) => parseInt(hex, 16));
    expect(bytes[6]! >> 4).toBe(4);
    expect(bytes[8]! >> 6).toBe(2);
    // Os demais bits e bytes fornecidos pela fonte criptográfica são preservados.
    expect(bytes[6]! & 0x0f).toBe(valor & 0x0f);
    expect(bytes[8]! & 0x3f).toBe(valor & 0x3f);
    bytes.forEach((byte, i) => {
      if (i !== 6 && i !== 8) expect(byte).toBe(valor);
    });
    expect(crypto.getRandomValues).toHaveBeenCalledTimes(1);
  });

  it("usa getRandomValues real quando randomUUID não existe", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: (bytes: Uint8Array) => webcrypto.getRandomValues(bytes),
    });
    for (let i = 0; i < 32; i++) expect(uuid()).toMatch(formatoV4);
  });

  it.each([undefined, {}, { randomUUID: undefined, getRandomValues: undefined }])(
    "falha explicitamente quando não há fonte criptográfica (%j)",
    (crypto) => {
      vi.stubGlobal("crypto", crypto);
      expect(uuid).toThrow(/UUID seguro.*APIs criptográficas.*contexto seguro/);
    },
  );

  it("não oculta erros da fonte criptográfica", () => {
    const erro = new Error("Fonte criptográfica indisponível");
    vi.stubGlobal("crypto", { getRandomValues: () => { throw erro; } });
    expect(uuid).toThrow(erro);
  });
});
