/** Client-only auth gate: everything under /_authenticated requires a local session. */
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getCurrentUser } from "@/lib/local-db";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: () => {
    const user = getCurrentUser();
    if (!user) throw redirect({ to: "/auth", search: { mode: "login" } });
    return { user };
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
