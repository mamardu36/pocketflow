"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { MonthRecap } from "@/components/budget/month-recap";
import { MonthEndCard, MonthStats } from "@/components/budget/month-summary-card";
import { ExpenseList } from "@/components/expenses/expense-list";
import { useExpenseSheet } from "@/components/expenses/expense-sheet-provider";
import { PageHeader } from "@/components/navigation/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { EmptyState } from "@/components/ui/empty-state";
import { CATEGORY_TYPES } from "@/constants/categories";
import { useApp, useDateLocale, useMoney, useT } from "@/hooks/use-app";
import { useMonthView } from "@/hooks/use-month-view";
import { formatMonthLabel } from "@/lib/dates";
import type { MonthView } from "@/lib/domain/selectors";
import { cn } from "@/lib/utils";
import type { MonthKey } from "@/types";

function parseKey(y: string | null, m: string | null): MonthKey | null {
  const year = Number(y);
  const month = Number(m);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12 || year < 1970 || year > 9999) return null;
  return { year, month };
}

export default function MonthPage() {
  return (
    <Suspense>
      <MonthDetail />
    </Suspense>
  );
}

function MonthDetail() {
  const params = useSearchParams();
  const key = parseKey(params.get("y"), params.get("m"));
  return key ? <MonthDetailContent monthKey={key} /> : <NotFound />;
}

function NotFound() {
  const t = useT();
  return (
    <>
      <PageHeader title={t.history.title} back />
      <EmptyState title={t.history.notFound} />
    </>
  );
}

function MonthDetailContent({ monthKey }: { monthKey: MonthKey }) {
  const t = useT();
  const locale = useDateLocale();
  const router = useRouter();
  const { setMonth } = useApp();
  const view = useMonthView(monthKey);
  const expenseSheet = useExpenseSheet();
  const title = formatMonthLabel(monthKey, locale);

  const openInBudget = () => {
    setMonth(monthKey);
    router.push("/");
  };

  if (!view) {
    return (
      <>
        <PageHeader title={title} back />
        <EmptyState title={t.history.notFound} action={<Button onClick={openInBudget}>{t.history.openMonth}</Button>} />
      </>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={title}
        back
        action={
          <Button size="sm" variant="secondary" onClick={openInBudget}>
            {t.history.openMonth}
          </Button>
        }
      />
      <MonthStats view={view} />
      <MonthRecap view={view} className="px-1" />
      <MonthEndCard view={view} />
      <CategoryBreakdown view={view} />
      <section aria-labelledby="month-transactions">
        <h2 id="month-transactions" className="mb-2 px-1 text-base font-semibold">
          {t.history.transactions}
        </h2>
        {view.transactions.length === 0 ? (
          <EmptyState title={t.expenses.emptyTitle} />
        ) : (
          <Card className="p-2">
            <ExpenseList transactions={view.transactions} categories={view.categories} onSelect={(tx) => expenseSheet.open({ transaction: tx })} />
          </Card>
        )}
      </section>
    </div>
  );
}

function CategoryBreakdown({ view }: { view: MonthView }) {
  const t = useT();
  const money = useMoney();
  const s = view.summary;
  return (
    <section aria-labelledby="month-categories" className="space-y-3">
      <div className="flex items-baseline justify-between px-1">
        <h2 id="month-categories" className="text-base font-semibold">
          {t.history.categories}
        </h2>
        <p className="tabular text-sm text-muted-foreground">
          {t.history.assigned} {money(s.assigned)} / {money(s.budget)}
        </p>
      </div>
      {CATEGORY_TYPES.map((type) => {
        const items = view.categories.filter((c) => c.type === type);
        if (items.length === 0) return null;
        return (
          <Card key={type} className="p-0">
            <p className="border-b border-border px-4 py-2.5 text-sm font-medium text-muted-foreground">{t.categoryTypes[type]}</p>
            <ul className="divide-y divide-border">
              {items.map((c) => {
                const st = view.stats.get(c.id)!;
                return (
                  <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                    <CategoryIcon emoji={c.emoji} color={c.color} size="sm" />
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    <span className="tabular text-right text-sm">
                      {type === "savings" ? (
                        <span className="font-medium text-positive">{money(c.assigned, { signed: true })}</span>
                      ) : (
                        <>
                          <span className={cn("font-medium", st.status === "over" && "text-danger")}>{money(st.spent)}</span>
                          <span className="text-muted-foreground"> / {money(c.assigned)}</span>
                        </>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}
    </section>
  );
}
