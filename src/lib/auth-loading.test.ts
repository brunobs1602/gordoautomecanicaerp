import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ user: vi.fn(), profile: vi.fn(), signOut: vi.fn(), perfis: vi.fn(), colecoes: vi.fn(), configurar: vi.fn(), limpar: vi.fn(), definir: vi.fn(), get: vi.fn(), rows: [] as unknown[] }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  auth: { getUser: m.user, signOut: m.signOut },
  from: () => ({ select: () => ({ eq: () => ({ abortSignal: () => ({ maybeSingle: m.profile }) }) }) }),
} }));
vi.mock("./permissoes", () => ({ ADMIN_ID: "admin", carregarPerfis: m.perfis, getPerfis: () => [{ id: "admin", ativo: true }] }));
vi.mock("./leituras-permitidas", () => ({ podeLerColecao: () => true }));
vi.mock("./config", () => ({ getConfig: () => ({ seguranca: {} }), validarSenha: () => "" }));
vi.mock("./auditoria", () => ({ registrar: vi.fn() }));
vi.mock("./usuarios.functions", () => ({ criarUsuario: vi.fn(), excluirUsuario: vi.fn(), redefinirSenha: vi.fn(), salvarUsuario: vi.fn() }));
vi.mock("./sessao", () => ({ definirSessao: m.definir, getSessao: m.get, useSessao: vi.fn() }));
vi.mock("./store", () => ({
  createCollection: () => ({ get: () => m.rows, use: () => [], definir: (rows: unknown[]) => { m.rows = rows; } }),
  enfileirar: vi.fn(), limparColecoes: m.limpar, carregarColecoes: m.colecoes, configurarLeituras: m.configurar,
  aguardarGravacoes: vi.fn(), mensagemErro: (_e: unknown, fallback: string) => fallback,
}));
import { carregarSistema, encerrarSessaoLocal } from "./auth";

beforeEach(() => {
  encerrarSessaoLocal(); vi.clearAllMocks(); m.rows = [];
  m.user.mockResolvedValue({ data: { user: { id: "u" } }, error: null });
  m.profile.mockResolvedValue({ data: { id: "u", nome: "Usuário", email: "", ativo: true, criado_em: "", user_perfis: { perfil_id: "admin" } }, error: null });
  m.perfis.mockResolvedValue(undefined); m.colecoes.mockResolvedValue(undefined); m.get.mockReturnValue({ id: "u" });
});

describe("primeiro carregamento autenticado", () => {
  it("aguarda identificação e permissões antes dos dados e da sessão visível", async () => {
    await carregarSistema();
    expect(m.profile.mock.invocationCallOrder[0]).toBeLessThan(m.perfis.mock.invocationCallOrder[0] ?? 0);
    expect(m.perfis.mock.invocationCallOrder[0]).toBeLessThan(m.colecoes.mock.invocationCallOrder[0] ?? 0);
    expect(m.colecoes.mock.invocationCallOrder[0]).toBeLessThan(m.definir.mock.invocationCallOrder[0] ?? 0);
    expect(m.definir).toHaveBeenCalledWith(expect.objectContaining({ id: "u", role: "admin" }));
  });
  it("falha de consulta de perfil não desconecta o usuário e permite nova tentativa", async () => {
    m.profile.mockResolvedValueOnce({ data: null, error: { code: "42501", message: "permission denied" } });
    await expect(carregarSistema()).rejects.toThrow();
    expect(m.signOut).not.toHaveBeenCalled();
    expect(m.colecoes).not.toHaveBeenCalled();
    await expect(carregarSistema()).resolves.toEqual({ id: "u" });
  });
  it("não guarda uma sessão ausente para sempre", async () => {
    m.user.mockResolvedValueOnce({ data: { user: null }, error: null });
    expect(await carregarSistema()).toBeNull();
    expect(await carregarSistema()).toEqual({ id: "u" });
    expect(m.user).toHaveBeenCalledTimes(2);
  });
  it("não publica a sessão se faltar uma coleção e recupera na próxima tentativa", async () => {
    m.colecoes.mockRejectedValueOnce(new Error("Falha"));
    await expect(carregarSistema()).rejects.toThrow();
    expect(m.definir).not.toHaveBeenCalled();
    expect(await carregarSistema()).toEqual({ id: "u" });
  });
});