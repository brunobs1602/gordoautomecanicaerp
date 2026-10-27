import { describe, expect, it } from "vitest";
import { OBS_MAX, validarObs } from "./portal-conta";

describe("observações do cliente", () => {
  it("são opcionais", () => expect(validarObs("")).toBe(""));
  it("aceitam até 1000 caracteres", () => expect(validarObs("a".repeat(1000))).toBe(""));
  it("recusam mais de 1000 caracteres", () => expect(validarObs("a".repeat(OBS_MAX + 1))).not.toBe(""));
});
