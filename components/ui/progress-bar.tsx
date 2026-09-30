import { cn } from "@/lib/utils";

interface ProgressBarProps {
  /** 0..1 (clamped). */
  value: number;
  barClassName?: string;
  className?: string;
  label: string;
}

export function ProgressBar({ value, barClassName, className, label }: ProgressBarProps) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-500 ease-out", barClassName ?? "bg-primary")} style={{ width: `${pct}%` }} />
    </div>
  );
}
