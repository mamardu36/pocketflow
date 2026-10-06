"use client";

import { useApp, useDateLocale, useMoney, useT } from "@/hooks/use-app";
import { formatMonthLabel } from "@/lib/dates";
import { buildMonthRecap, type MonthView } from "@/lib/domain/selectors";
import { cn } from "@/lib/utils";

/** Two plain sentences: where most money went, and how the month compares with the previous one. */
export function MonthRecap({ view, className }: { view: MonthView; className?: string }) {
  const t = useT();
  const money = useMoney();
  const locale = useDateLocale();
  const { data } = useApp();
  const { top, previous } = buildMonthRecap(data, view);

  const lines: { text: string; tone?: "positive" | "danger" }[] = [];
  if (top) lines.push({ text: t.history.topCategory(`${top.category.emoji} ${top.category.name}`, money(top.spent)) });
  if (previous) {
    const label = formatMonthLabel(previous.key, locale, false);
    const amount = money(Math.abs(previous.difference));
    if (previous.difference < 0) lines.push({ text: t.history.lessThan(amount, label), tone: "positive" });
    else if (previous.difference > 0) lines.push({ text: t.history.moreThan(amount, label), tone: "danger" });
    else lines.push({ text: t.history.sameAs(label) });
  }
  if (lines.length === 0) return null;

  return (
    <div className={cn("space-y-0.5 text-sm", className)}>
      {lines.map((l) => (
        <p
          key={l.text}
          className={cn(l.tone === "positive" ? "text-positive" : l.tone === "danger" ? "text-danger" : "text-muted-foreground")}
        >
          {l.text}
        </p>
      ))}
    </div>
  );
}
