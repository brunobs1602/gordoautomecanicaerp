/** Gera UUID v4 usando apenas aleatoriedade criptograficamente segura. */
export function uuid(): string {
  const crypto = globalThis.crypto;
  if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();
  if (typeof crypto?.getRandomValues !== "function") {
    throw new Error("Não foi possível gerar um UUID seguro: as APIs criptográficas não estão disponíveis. Verifique o ambiente e, no navegador, utilize um contexto seguro (HTTPS ou localhost).");
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40; // Versão 4.
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // Variante RFC 4122 (bits 10).
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
