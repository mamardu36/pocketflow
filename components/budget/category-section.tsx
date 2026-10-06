"use client";

import { Plus } from "lucide-react";
import { CategoryCard } from "@/components/budget/category-card";
import { useApp, useMoney, useT } from "@/hooks/use-app";
import { calculateAssignedMoney } from "@/lib/calculations/budget";
import { calculateGoalBalance } from "@/lib/calculations/savings";
import type { MonthView } from "@/lib/domain/selectors";
import type { BudgetCategory, CategoryType } from "@/types";

interface CategorySectionProps {
  type: CategoryType;
  view: MonthView;
  onAdd: (type: CategoryType) => void;
  onEditSavings: (category: BudgetCategory) => void;
}

export function CategorySection({ type, view, onAdd, onEditSavings }: CategorySectionProps) {
  const t = useT();
  const money = useMoney();
  const { data } = useApp();
  const items = view.categories.filter((c) => c.type === type);
  const title = t.categoryTypes[type];

  return (
    <section aria-label={title}>
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-base font-semibold">
          {title}
          {items.length > 0 && <span className="tabular ml-2 font-normal text-muted-foreground">{money(calculateAssignedMoney(items))}</span>}
        </h2>
        <button
          type="button"
          onClick={() => onAdd(type)}
          aria-label={t.category.addTo(title)}
          className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
      {items.length === 0 ? (
        <button
          type="button"
          onClick={() => onAdd(type)}
          className="w-full rounded-3xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t.category.add}
        </button>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {items.map((c) => {
            const goal = c.savingsGoalId ? data.savingsGoals.find((g) => g.id === c.savingsGoalId) : null;
            return (
              <CategoryCard
                key={c.id}
                category={c}
                stats={view.stats.get(c.id)!}
                goalName={goal?.name ?? null}
                goalBalance={goal ? calculateGoalBalance(goal, data) : null}
                onEditSavings={onEditSavings}
                monthProgress={view.monthProgress}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
