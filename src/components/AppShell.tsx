/** Authenticated app shell: top navigation, theme/language switch, sign out. */
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type ReactNode } from "react";
import { LayoutDashboard, ScanSearch, History, Bot, User, Shield, Moon, Sun, LogOut, Menu, X } from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getMyRole } from "@/lib/admin.functions";
import { authErrorMessage } from "@/lib/auth-errors";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const NAV: Array<{ to: string; key: TranslationKey; icon: typeof LayoutDashboard }> = [
  { to: "/dashboard", key: "nav.dashboard", icon: LayoutDashboard },
  { to: "/detect", key: "nav.detect", icon: ScanSearch },
  { to: "/history", key: "nav.history", icon: History },
  { to: "/assistant", key: "nav.assistant", icon: Bot },
  { to: "/profile", key: "nav.profile", icon: User },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { t, language, setLanguage } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const fetchRole = useServerFn(getMyRole);
  const { data: role } = useQuery({
    queryKey: ["my-role"],
    queryFn: () => fetchRole(),
    staleTime: 60_000,
  });

  async function handleSignOut() {
    try {
      setOpen(false);
      await queryClient.cancelQueries();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      queryClient.clear();
      navigate({ to: "/auth", search: { mode: "login" }, replace: true });
    } catch (error) {
      toast.error(authErrorMessage(error));
    }
  }

  const items = role?.isAdmin
    ? [...NAV, { to: "/admin", key: "nav.admin" as TranslationKey, icon: Shield }]
    : NAV;

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 -z-10 grid-backdrop opacity-60" />
      <div className="pointer-events-none absolute -left-32 top-[-8rem] -z-10 size-[26rem] rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-40 -z-10 size-[22rem] rounded-full bg-primary-glow/15 blur-3xl" />

      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link to="/dashboard" className="shrink-0">
            <Logo />
          </Link>

          <nav className="ml-4 hidden items-center gap-1 lg:flex">
            {items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground data-[status=active]:bg-accent data-[status=active]:text-accent-foreground"
              >
                <span className="flex items-center gap-2">
                  <item.icon className="size-4" />
                  {t(item.key)}
                </span>
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === "en" ? "hi" : "en")}
              aria-label="Switch language"
              className="font-semibold"
            >
              {language === "en" ? "EN" : "हिं"}
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label={t("nav.signOut")} className="hidden sm:inline-flex">
              <LogOut className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Menu"
            >
              {open ? <X className="size-4" /> : <Menu className="size-4" />}
            </Button>
          </div>
        </div>

        {open && (
          <div className="animate-fade-in border-t border-border/60 bg-background/95 px-4 py-3 lg:hidden">
            <nav className="grid gap-1">
              {items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent/60 hover:text-foreground data-[status=active]:bg-accent data-[status=active]:text-accent-foreground"
                >
                  <item.icon className="size-4" />
                  {t(item.key)}
                </Link>
              ))}
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="justify-start gap-3 px-3 py-2.5 text-left text-sm font-medium text-destructive hover:bg-destructive/10"
              >
                <LogOut className="size-4" />
                {t("nav.signOut")}
              </Button>
            </nav>
          </div>
        )}
      </header>

      <main className={cn("mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:py-10")}>{children}</main>
    </div>
  );
}
