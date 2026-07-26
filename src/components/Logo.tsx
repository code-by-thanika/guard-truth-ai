/** TruthGuard AI wordmark. */
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="gradient-accent flex size-9 items-center justify-center rounded-xl shadow-glow">
        <ShieldCheck className="size-5 text-primary-foreground" />
      </span>
      {!compact && (
        <span className="font-display text-lg font-bold tracking-tight">
          Truth<span className="text-gradient">Guard</span>
          <span className="ml-1 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            AI
          </span>
        </span>
      )}
    </span>
  );
}
