import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ScanSearch,
  BrainCircuit,
  Image as ImageIcon,
  Sparkles,
  LineChart,
  Languages,
  ShieldCheck,
  ArrowRight,
  Moon,
  Sun,
  Github,
  Mail,
  Menu,
  X,
} from "lucide-react";
import { toast } from "sonner";

import heroImage from "@/assets/hero-truthguard.jpg";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TruthGuard AI — Fake News Detection with Naïve Bayes" },
      {
        name: "description",
        content:
          "Detect fake news in seconds. TruthGuard AI pairs a Naïve Bayes + TF-IDF classifier with AI explanations, OCR and analytics.",
      },
      { property: "og:title", content: "TruthGuard AI — Fake News Detection with Naïve Bayes" },
      {
        property: "og:description",
        content:
          "Detect fake news in seconds. TruthGuard AI pairs a Naïve Bayes + TF-IDF classifier with AI explanations, OCR and analytics.",
      },
    ],
  }),
  component: Landing,
});

const SECTIONS = [
  { id: "about", key: "nav.about" },
  { id: "features", key: "nav.features" },
  { id: "how", key: "nav.how" },
  { id: "team", key: "nav.team" },
  { id: "contact", key: "nav.contact" },
] as const;

const TEAM = [
  { name: "Aarav Sharma", role: "ML Engineer — Naïve Bayes pipeline", initials: "AS" },
  { name: "Isha Verma", role: "Frontend & UX", initials: "IV" },
  { name: "Rohan Patel", role: "Backend & Data", initials: "RP" },
  { name: "Neha Gupta", role: "AI explanations & OCR", initials: "NG" },
];

function Landing() {
  const { t, language, setLanguage } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const { user } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!sent) return;
    const id = setTimeout(() => setSent(false), 4000);
    return () => clearTimeout(id);
  }, [sent]);

  const features = [
    { icon: BrainCircuit, title: "Naïve Bayes + TF-IDF", body: "A multinomial classifier trained on the Kaggle Fake/True corpus with Laplace smoothing." },
    { icon: Sparkles, title: "AI explanations", body: "Every verdict comes with a plain-language reason, summary, suspicious claims and fact-check tips." },
    { icon: ImageIcon, title: "Image OCR", body: "Upload a screenshot or a photo of a clipping and the text is read out automatically." },
    { icon: LineChart, title: "Dashboards", body: "Track fake vs real verdicts, weekly activity, confidence trends and model accuracy." },
    { icon: Languages, title: "English & हिंदी", body: "The whole interface, plus AI explanations, switch language instantly." },
    { icon: ShieldCheck, title: "Admin retraining", body: "Admins upload fresh datasets and retrain the model with live accuracy metrics." },
  ];

  const steps = [
    "Input — type, paste, upload a .txt file or scan an image.",
    "OCR — image text is extracted before analysis.",
    "Clean — lowercase, strip URLs, punctuation and stopwords.",
    "Vectorise — TF-IDF weights over the trained vocabulary.",
    "Classify — Multinomial Naïve Bayes returns FAKE or REAL.",
    "Explain — AI adds the why, a summary and verification tips.",
    "Store — the prediction lands in your searchable history.",
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 grid-backdrop" />

      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center px-4 sm:px-6">
          <Logo />
          <nav className="ml-10 hidden items-center gap-1 md:flex">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
              >
                {t(s.key)}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="font-semibold"
              onClick={() => setLanguage(language === "en" ? "hi" : "en")}
            >
              {language === "en" ? "EN" : "हिं"}
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            {user ? (
              <Button variant="hero" size="sm" asChild>
                <Link to="/dashboard">{t("nav.dashboard")}</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                  <Link to="/auth" search={{ mode: "login" }}>{t("nav.signIn")}</Link>
                </Button>
                <Button variant="hero" size="sm" asChild>
                  <Link to="/auth" search={{ mode: "register" }}>
                    {t("nav.getStarted")}
                  </Link>
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menu"
            >
              {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </Button>
          </div>
        </div>
        {menuOpen && (
          <nav className="animate-fade-in grid border-t border-border/60 bg-background/95 px-4 py-3 md:hidden">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              >
                {t(s.key)}
              </a>
            ))}
          </nav>
        )}
      </header>

      {/* Hero */}
      <section className="mx-auto grid w-full max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary">
            <BrainCircuit className="size-3.5" />
            {t("hero.badge")}
          </span>
          <h1 className="font-display mt-6 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            {t("hero.title")}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("hero.subtitle")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="hero" size="lg" asChild>
              <Link to={user ? "/detect" : "/auth"} search={user ? undefined : { mode: "login" }}>
                {t("hero.cta")}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button variant="glass" size="lg" asChild>
              <a href="#how">{t("hero.secondary")}</a>
            </Button>
          </div>
          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4">
            {[
              { v: "94%+", k: t("hero.stat1") },
              { v: "<1s", k: t("hero.stat2") },
              { v: "4", k: t("hero.stat3") },
            ].map((s) => (
              <div key={s.k} className="glass-card px-4 py-3">
                <dt className="font-display text-2xl font-bold text-gradient">{s.v}</dt>
                <dd className="mt-0.5 text-xs text-muted-foreground">{s.k}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="animate-fade-up relative [animation-delay:120ms]">
          <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-primary/20 blur-3xl" />
          <img
            src={heroImage}
            alt="Illustration of a glowing shield filtering fake news articles into data particles"
            width={1600}
            height={1200}
            className="animate-float w-full rounded-3xl border border-border/60 shadow-elevated"
          />
        </div>
      </section>

      {/* About */}
      <section id="about" className="mx-auto w-full max-w-5xl scroll-mt-20 px-4 py-16 sm:px-6">
        <div className="glass-card p-8 text-center sm:p-12">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t("about.title")}
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
            {t("about.body")}
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t("features.title")}
          </h2>
          <p className="mt-3 text-muted-foreground">{t("features.subtitle")}</p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <article key={f.title} className="glass-card hover-lift p-6">
              <span className="gradient-accent flex size-11 items-center justify-center rounded-2xl shadow-glow">
                <f.icon className="size-5 text-primary-foreground" />
              </span>
              <h3 className="font-display mt-5 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto w-full max-w-4xl scroll-mt-20 px-4 py-16 sm:px-6">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t("how.title")}
          </h2>
          <p className="mt-3 text-muted-foreground">{t("how.subtitle")}</p>
        </div>
        <ol className="mt-12 space-y-3">
          {steps.map((step, i) => (
            <li key={step} className="glass-card hover-lift flex items-start gap-4 p-5">
              <span className="gradient-accent flex size-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-primary-foreground">
                {i + 1}
              </span>
              <p className="pt-1 text-sm leading-relaxed text-foreground/90">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Team */}
      <section id="team" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t("team.title")}
          </h2>
          <p className="mt-3 text-muted-foreground">{t("team.subtitle")}</p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM.map((m) => (
            <article key={m.name} className="glass-card hover-lift p-6 text-center">
              <span className="gradient-accent font-display mx-auto flex size-16 items-center justify-center rounded-full text-xl font-bold text-primary-foreground shadow-glow">
                {m.initials}
              </span>
              <h3 className="mt-4 font-semibold">{m.name}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{m.role}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="mx-auto w-full max-w-3xl scroll-mt-20 px-4 py-16 sm:px-6">
        <div className="glass-card p-8 sm:p-10">
          <h2 className="font-display text-3xl font-bold tracking-tight">{t("contact.title")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("contact.subtitle")}</p>
          <form
            className="mt-8 grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
              toast.success(t("contact.sent"));
              (e.target as HTMLFormElement).reset();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Input required maxLength={100} name="name" placeholder={t("contact.name")} />
              <Input
                required
                type="email"
                maxLength={255}
                name="email"
                placeholder={t("contact.email")}
              />
            </div>
            <Textarea
              required
              maxLength={1000}
              name="message"
              rows={5}
              placeholder={t("contact.message")}
            />
            <Button type="submit" variant="hero" size="lg" className="justify-self-start">
              <Mail className="size-4" />
              {sent ? t("contact.sent") : t("contact.send")}
            </Button>
          </form>
        </div>
      </section>

      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <Logo />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} TruthGuard AI — Naïve Bayes fake news detection.
          </p>
          <div className="flex items-center gap-2 text-muted-foreground">
            <ScanSearch className="size-4" />
            <Github className="size-4" />
          </div>
        </div>
      </footer>
    </div>
  );
}
