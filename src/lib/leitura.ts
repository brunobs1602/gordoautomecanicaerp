/** Recuperação limitada a falhas transitórias; permissões e validações não são repetidas. */
export async function lerComRecuperacao<T>(ler: (signal: AbortSignal) => PromiseLike<T>): Promise<T> {
  for (let tentativa = 0; ; tentativa++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      return await ler(controller.signal);
    } catch (erro) {
      const e = erro as { code?: string; message?: string; name?: string; status?: number };
      const transitorio = /fetch|network|timeout|abort|connection/i.test(`${e.message ?? ""} ${e.name ?? ""}`) || (e.status ?? 0) >= 500;
      if (!transitorio || tentativa >= 2) throw erro;
      await new Promise((resolve) => setTimeout(resolve, 400 * (tentativa + 1)));
    } finally {
      clearTimeout(timer);
    }
  }
}