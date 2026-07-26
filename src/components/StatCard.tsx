/** Reusable stat tile for the dashboard and admin analytics. */
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "primary" | "destructive" | "success" | "warning";
  className?: string;
}) {
  const tones = {
    primary: "bg-primary/12 text-primary",
    destructive: "bg-destructive/12 text-destructive",
    success: "bg-success/12 text-success",
    warning: "bg-warning/15 text-warning",
  } as const;

  return (
    <div className={cn("glass-card hover-lift p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="font-display mt-2 text-3xl font-bold">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <span className={cn("flex size-11 items-center justify-center rounded-2xl", tones[tone])}>
          <Icon className="size-5" />
        </span>
      </div>
    </div>
  );
}
