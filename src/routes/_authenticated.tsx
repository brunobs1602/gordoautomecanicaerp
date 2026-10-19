import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getCurrentUser, hasAdmin, useCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: () => {
    if (!hasAdmin()) throw redirect({ to: "/configuracao-inicial" });
    if (!getCurrentUser()) throw redirect({ to: "/login" });
  },
  component: Layout,
});

function Layout() {
  const user = useCurrentUser();
  if (!user) return null;
  return (
    <AppShell user={user}>
      <Outlet />
    </AppShell>
  );
}
