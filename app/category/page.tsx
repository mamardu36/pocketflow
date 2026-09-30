"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { CategorySheet } from "@/components/budget/category-sheet";
import { ExpenseList } from "@/components/expenses/expense-list";
import { useExpenseSheet } from "@/components/expenses/expense-sheet-provider";
import { PageHeader } from "@/components/navigation/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { COLOR_STYLES } from "@/constants/categories";
import { useApp, useDateLocale, useMoney, useT } from "@/hooks/use-app";
import { useMonthView } from "@/hooks/use-month-view";
import { formatMonthLabel } from "@/lib/dates";
import { deleteCategory } from "@/lib/domain/actions";
import { getBudgetKey } from "@/lib/domain/selectors";
import { cn } from "@/lib/utils";
import type { BudgetCategory, MonthlyBudget } from "@/types";

export default function CategoryPage() {
  return (
    <Suspense>
      <CategoryDetail />
    </Suspense>
  );
}

function CategoryDetail() {
  const t = useT();
  const id = useSearchParams().get("id");
  const { data } = useApp();
  const category = id ? data.categories.find((c) => c.id === id) : undefined;
  const budget = category ? data.budgets.find((b) => b.id === category.budgetId) : undefined;

  if (!category || !budget) {
    return (
      <>
        <PageHeader title={t.nav.home} back />
        <EmptyState title={t.category.notFound} />
      </>
    );
  }
  return <CategoryDetailContent category={category} budget={budget} />;
}

function CategoryDetailContent({ category, budget }: { category: BudgetCategory; budget: MonthlyBudget }) {
  const t = useT();
  const money = useMoney();
  const locale = useDateLocale();
  const router = useRouter();
  const confirm = useConfirm();
  const { commit } = useApp();
  const expenseSheet = useExpenseSheet();
  const monthKey = getBudgetKey(budget);
  const view = useMonthView(monthKey);
  const [editing, setEditing] = useState(false);

  const stats = view?.stats.get(category.id);
  const transactions = view?.transactions.filter((tx) => tx.categoryId === category.id) ?? [];
  if (!view || !stats) return null;

  const over = stats.status === "over";
  const isSavings = category.type === "savings";
  const barClass = over ? "bg-danger" : stats.status === "near-limit" ? "bg-warning" : COLOR_STYLES[category.color].bar;

  const remove = async () => {
    const ok = await confirm({
      title: t.category.deleteTitle,
      description: t.category.deleteBody(transactions.length),
      confirmLabel: t.common.delete,
      cancelLabel: t.common.cancel,
      destructive: true,
    });
    if (ok && commit((d) => deleteCategory(d, category.id))) {
      toast.success(t.category.deleted);
      router.replace("/");
    }
  };

  const figures = [
    { label: t.category.budgetLabel, value: money(category.assigned) },
    { label: t.dashboard.spent, value: money(stats.spent) },
    { label: over ? t.category.overLabel : t.category.remaining, value: money(over ? -stats.remaining : stats.remaining), danger: over },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        back
        title={
          <div className="flex min-w-0 items-center gap-3">
            <CategoryIcon emoji={category.emoji} color={category.color} />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold tracking-tight">{category.name}</h1>
              <p className="text-sm text-muted-foreground">
                {t.categoryTypeShort[category.type]} · {formatMonthLabel(monthKey, locale)}
                {category.recurring && ` · ${t.category.recurring}`}
              </p>
            </div>
          </div>
        }
        action={
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => setEditing(true)} aria-label={t.category.editTitle}>
              <Pencil className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={remove} aria-label={t.common.delete} className="text-danger">
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        }
      />

      <Card className="p-5">
        <dl className="grid grid-cols-3 gap-3">
          {figures.map((f) => (
            <div key={f.label}>
              <dt className="text-sm text-muted-foreground">{f.label}</dt>
              <dd className={cn("tabular mt-0.5 text-xl font-semibold", f.danger && "text-danger")}>{f.value}</dd>
            </div>
          ))}
        </dl>
        {!isSavings && (
          <>
            <ProgressBar
              value={stats.ratio}
              barClassName={barClass}
              className="mt-4"
              label={t.category.usedPct(Math.round(stats.ratio * 100), category.name)}
            />
            <p className={cn("mt-2 text-sm", over ? "text-danger" : "text-muted-foreground")}>
              {over ? t.category.over(money(-stats.remaining)) : t.category.usedPct(Math.round(stats.ratio * 100), category.name)}
            </p>
          </>
        )}
        <Button variant="outline" className="mt-4 w-full" onClick={() => setEditing(true)}>
          <Pencil className="h-4 w-4" aria-hidden />
          {t.category.editTitle}
        </Button>
      </Card>

      {!isSavings && (
        <>
          <Button size="lg" className="w-full" onClick={() => expenseSheet.open({ categoryId: category.id, month: monthKey })}>
            <Plus className="h-5 w-5" aria-hidden />
            {t.dashboard.addExpense}
          </Button>
          <section aria-labelledby="category-transactions">
            <h2 id="category-transactions" className="mb-2 px-1 text-base font-semibold">
              {t.category.transactions}
            </h2>
            {transactions.length === 0 ? (
              <EmptyState title={t.category.noTransactions} />
            ) : (
              <Card className="p-2">
                <ExpenseList
                  transactions={transactions}
                  categories={view.categories}
                  onSelect={(tx) => expenseSheet.open({ transaction: tx })}
                  grouped={false}
                />
              </Card>
            )}
          </section>
        </>
      )}

      <CategorySheet
        open={editing}
        onClose={() => setEditing(false)}
        budget={budget}
        category={category}
        onDeleted={() => router.replace("/")}
      />
    </div>
  );
}
