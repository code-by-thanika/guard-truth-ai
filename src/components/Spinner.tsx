/** Branded loading spinner used across TruthGuard AI. */
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block size-5 animate-spin rounded-full border-2 border-primary/25 border-t-primary",
        className,
      )}
    />
  );
}

export function LoadingBlock({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
      <Spinner className="size-8" />
      {label ? <p className="text-sm">{label}</p> : null}
    </div>
  );
}
