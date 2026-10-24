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
      { title: "Gordo Auto Mecânica ERP" },
      { name: "description", content: "Sistema interno de gestão da Gordo Auto Mecânica." },
      { property: "og:title", content: "Gordo Auto Mecânica ERP" },
      { property: "og:description", content: "Sistema interno de gestão da Gordo Auto Mecânica." },
    ],
  }),
  component: () => null,
});
