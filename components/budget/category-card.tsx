"use client";

import Link from "next/link";
import { CategoryIcon } from "@/components/ui/category-icon";
import { ProgressBar } from "@/components/ui/progress-bar";
import { COLOR_STYLES } from "@/constants/categories";
import { useMoney, useT } from "@/hooks/use-app";
import type { CategoryStats } from "@/lib/domain/selectors";
import { cn } from "@/lib/utils";
import type { BudgetCategory } from "@/types";

interface CategoryCardProps {
  category: BudgetCategory;
  stats: CategoryStats;
  goalName?: string | null;
  goalBalance?: number | null;
  onEditSavings?: (category: BudgetCategory) => void;
}

const cardClass =
  "block w-full rounded-3xl border border-border bg-card p-4 text-left shadow-soft transition hover:border-foreground/15 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function CategoryCard({ category, stats, goalName, goalBalance, onEditSavings }: CategoryCardProps) {
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
    const paid = category.assigned > 0 && stats.spent >= category.assigned;
    return (
      <Link href={`/category?id=${category.id}`} className={cardClass} aria-label={t.category.open(category.name)}>
        <div className="flex items-center gap-3">
          <CategoryIcon emoji={category.emoji} color={category.color} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{category.name}</p>
            <p className="truncate text-sm text-muted-foreground">{category.recurring ? t.category.recurring : t.categoryTypeShort.fixed}</p>
          </div>
          <div className="text-right">
            <p className="tabular font-semibold">{money(category.assigned)}</p>
            <p className={cn("text-sm", over ? "text-danger" : paid ? "text-positive" : "text-muted-foreground")}>
              {over ? t.category.over(money(-stats.remaining)) : paid ? t.category.paid : t.category.reserved(money(stats.remaining))}
            </p>
          </div>
        </div>
      </Link>
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
      <p className="tabular mt-2 text-xs text-muted-foreground">{t.category.spent(money(stats.spent))}</p>
    </Link>
  );
}
