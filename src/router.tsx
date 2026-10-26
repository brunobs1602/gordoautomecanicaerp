import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Baixa o código da próxima tela ao passar o mouse/tocar no link: troca de página instantânea.
    defaultPreload: "intent",
    defaultPreloadDelay: 50,
    // Evita "piscar" a tela de carregamento em transições rápidas.
    defaultPendingMs: 400,
    defaultPendingMinMs: 200,
  });

  return router;
};
