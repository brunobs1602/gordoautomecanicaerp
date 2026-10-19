import { createFileRoute, redirect } from "@tanstack/react-router";
import { getCurrentUser, hasAdmin } from "@/lib/auth";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: () => {
    if (!hasAdmin()) throw redirect({ to: "/configuracao-inicial" });
    throw redirect({ to: getCurrentUser() ? "/dashboard" : "/login" });
  },
  head: () => ({
    meta: [
      { title: "Gordo Auto Mecânica ERP" },
      { name: "description", content: "Sistema interno de gestão da Gordo Auto Mecânica." },
      { property: "og:title", content: "Gordo Auto Mecânica ERP" },
      { property: "og:description", content: "Sistema interno de gestão da Gordo Auto Mecânica." },
    ],
  }),
  component: () => null,
});
