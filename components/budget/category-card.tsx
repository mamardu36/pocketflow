"use client";

import { Circle, CircleCheck } from "lucide-react";
import Link from "next/link";
import { CategoryIcon } from "@/components/ui/category-icon";
import { ProgressBar } from "@/components/ui/progress-bar";
import { COLOR_STYLES } from "@/constants/categories";
import { useMoney, useT } from "@/hooks/use-app";
import { isSpendingAheadOfPace } from "@/lib/calculations/budget";
import { isFixedPaid } from "@/lib/domain/actions";
import type { CategoryStats } from "@/lib/domain/selectors";
import { cn } from "@/lib/utils";
import type { BudgetCategory } from "@/types";

interface CategoryCardProps {
  category: BudgetCategory;
  stats: CategoryStats;
  goalName?: string | null;
  goalBalance?: number | null;
  /** Share of the month elapsed, to flag categories spent faster than the calendar. */
  monthProgress?: number;
  onEditSavings?: (category: BudgetCategory) => void;
  /** Fixed expenses: tick/untick "Paid". Receives the current state. */
  onTogglePaid?: (paid: boolean) => void;
}

const cardClass =
  "block w-full rounded-3xl border border-border bg-card p-4 text-left shadow-soft transition hover:border-foreground/15 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function CategoryCard({
  category, stats, goalName, goalBalance, onEditSavings, onTogglePaid, monthProgress = 0,
}: CategoryCardProps) {
  const t = useT();
  const money = useMoney();
  const over = stats.status === "over";

  if (category.type === "savings") {
    return (
      <button type="button" onClick={() => onEditSavings?.(category)} className={cardClass} aria-label={t.category.open(category.name)}>
        <div className="flex items-center gap-3">
          <CategoryIcon emoji={category.emoji} color={category.color} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{category.name}</p>
            <p className="truncate text-sm text-muted-foreground">{goalName ? t.category.toGoal(goalName) : t.category.unlinked}</p>
          </div>
          <div className="text-right">
            <p className="tabular font-semibold text-positive">{money(category.assigned, { signed: true })}</p>
            {goalBalance != null && <p className="tabular text-sm text-muted-foreground">{money(goalBalance)}</p>}
          </div>
        </div>
      </button>
    );
  }

  const barClass = over ? "bg-danger" : stats.status === "near-limit" ? "bg-warning" : COLOR_STYLES[category.color].bar;

  if (category.type === "fixed") {
    const paid = isFixedPaid(category, stats.spent);
    const partial = !paid && !over && stats.spent > 0;
    const subtitle = over
      ? t.category.over(money(-stats.remaining))
      : partial
        ? t.category.leftToPay(money(stats.remaining))
        : category.recurring
          ? t.category.recurring
          : t.categoryTypeShort.fixed;
    return (
      // The whole card opens the category; the "Paid" box sits on top and works on its own.
      <div className={cn(cardClass, "relative")}>
        <Link
          href={`/category?id=${category.id}`}
          aria-label={t.category.open(category.name)}
          className="absolute inset-0 rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="pointer-events-none relative flex items-center gap-3">
          <CategoryIcon emoji={category.emoji} color={category.color} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{category.name}</p>
            <p className={cn("truncate text-sm", over ? "text-danger" : "text-muted-foreground")}>{subtitle}</p>
          </div>
          <p className={cn("tabular font-semibold", paid && "text-muted-foreground")}>
            {money(category.assigned)}
          </p>
          {category.assigned > 0 && onTogglePaid && (
            <button
              type="button"
              role="checkbox"
              aria-checked={paid}
              aria-label={t.category.markPaid(category.name)}
              onClick={() => onTogglePaid(paid)}
              className={cn(
                "pointer-events-auto flex h-10 shrink-0 items-center gap-1.5 rounded-full border pl-2.5 pr-3.5 text-sm font-medium transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                paid
                  ? "border-transparent bg-positive/15 text-positive"
                  : "border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground",
              )}
            >
              {paid ? <CircleCheck className="h-5 w-5" aria-hidden /> : <Circle className="h-5 w-5" aria-hidden />}
              {t.category.paid}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Link href={`/category?id=${category.id}`} className={cardClass} aria-label={t.category.open(category.name)}>
      <div className="flex items-center gap-3">
        <CategoryIcon emoji={category.emoji} color={category.color} />
        <p className="min-w-0 flex-1 truncate font-medium">{category.name}</p>
        <div className="text-right">
          <p className={cn("tabular font-semibold", over && "text-danger")}>
            {over ? t.category.over(money(-stats.remaining)) : t.category.left(money(stats.remaining))}
          </p>
          <p className="tabular text-sm text-muted-foreground">{t.category.of(money(category.assigned))}</p>
        </div>
      </div>
      <ProgressBar value={stats.ratio} barClassName={barClass} className="mt-3" label={t.category.usedPct(Math.round(stats.ratio * 100), category.name)} />
      {isSpendingAheadOfPace(stats.spent, category.assigned, monthProgress) ? (
        <p className="tabular mt-2 text-xs font-medium text-warning">
          {t.category.pace(Math.round(stats.ratio * 100), Math.round(monthProgress * 100))}
        </p>
      ) : (
        <p className="tabular mt-2 text-xs text-muted-foreground">{t.category.spent(money(stats.spent))}</p>
      )}
    </Link>
  );
}
