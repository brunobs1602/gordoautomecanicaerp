import { ErroConexao } from "@/components/ErroConexao";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { carregarSistema, precisaConfiguracaoInicial } from "@/lib/auth";

export const Route = createFileRoute("/")({
  ssr: false,
  errorComponent: ErroConexao,
  beforeLoad: async () => {
    if (await precisaConfiguracaoInicial()) throw redirect({ to: "/configuracao-inicial" });
    const u = await carregarSistema().catch(() => null);
    throw redirect({ to: u ? "/dashboard" : "/login" });
  },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Mecavon" },
      { name: "description", content: "Mecavon — sistema de gestão para oficinas mecânicas." },
      { property: "og:title", content: "Mecavon" },
      { property: "og:description", content: "Mecavon — sistema de gestão para oficinas mecânicas." },
    ],
  }),
  component: () => null,
});
