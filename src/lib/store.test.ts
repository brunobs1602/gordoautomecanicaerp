import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (table: string) => ({
  select: () => ({ order: () => ({ range: (start: number, end: number) => ({ abortSignal: () => mock.read(table, start, end) }) }) }),
  upsert: (rows: unknown) => mock.write(table, rows),
}) } }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
import { aguardarGravacoes, atualizarDoBanco, configurarLeituras, createCollection, limparColecoes } from "./store";

beforeEach(() => { limparColecoes(); configurarLeituras(() => true); mock.read.mockReset(); mock.write.mockReset(); mock.write.mockResolvedValue({ error: null }); });

describe("leituras e cache", () => {
  it("deduplica consultas simultâneas à mesma coleção", async () => {
    const c = createCollection<{ id: string }>("clientes");
    let resolve: (v: unknown) => void = () => undefined;
    mock.read.mockImplementation(() => new Promise((r) => { resolve = r; }));
    const a = c.carregar(), b = c.carregar();
    expect(a).toBe(b);
    resolve({ data: [{ id: "1", data: {} }], error: null });
    await a;
    expect(mock.read).toHaveBeenCalledTimes(1);
    expect(c.get().map((x) => x.id)).toEqual(["1"]);
  });
  it("carrega 1.201 registros sem truncar ao limite do serviço", async () => {
    const c = createCollection<{ id: string }>("clientes");
    const rows = Array.from({ length: 1201 }, (_, i) => ({ id: String(i), data: {} }));
    mock.read.mockImplementation((_t, start, end) => Promise.resolve({ data: rows.slice(start, end + 1), error: null }));
    await c.carregar();
    expect(c.get()).toHaveLength(1201);
    expect(mock.read.mock.calls.map((x) => x.slice(1))).toEqual([[0,499],[500,999],[1000,1499]]);
  });
  it("não restaura dados antigos depois de encerrar a sessão", async () => {
    const c = createCollection<{ id: string }>("clientes");
    let resolve: (v: unknown) => void = () => undefined;
    mock.read.mockImplementation(() => new Promise((r) => { resolve = r; }));
    const load = c.carregar();
    limparColecoes();
    resolve({ data: [{ id: "outro-usuario", data: {} }], error: null });
    await load;
    expect(c.get()).toEqual([]);
  });
  it("atualiza só coleções afetadas", async () => {
    createCollection("clientes"); createCollection("veiculos");
    mock.read.mockResolvedValue({ data: [], error: null });
    await atualizarDoBanco(["clientes"]);
    expect(mock.read.mock.calls.map((x) => x[0])).toEqual(["clientes"]);
  });
  it("uma leitura antiga não apaga a inclusão otimista", async () => {
    const c = createCollection<{ id: string; nome: string }>("clientes");
    let resolve: (v: unknown) => void = () => undefined;
    mock.read.mockImplementationOnce(() => new Promise((r) => { resolve = r; }))
      .mockResolvedValue({ data: [{ id: "novo", data: { nome: "Salvo" } }], error: null });
    const load = c.carregar();
    c.save([{ id: "novo", nome: "Salvo" }]);
    resolve({ data: [], error: null });
    await load; await aguardarGravacoes();
    expect(c.get()).toEqual([{ id: "novo", nome: "Salvo" }]);
    expect(mock.read).toHaveBeenCalledTimes(2);
  });
});