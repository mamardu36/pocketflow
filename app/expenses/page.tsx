"use client";

import { ArrowUpDown, Plus, ReceiptText, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MonthSelector } from "@/components/budget/month-selector";
import { ExpenseList } from "@/components/expenses/expense-list";
import { useExpenseSheet } from "@/components/expenses/expense-sheet-provider";
import { PageHeader } from "@/components/navigation/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { useApp, useMoney, useT } from "@/hooks/use-app";
import { useMonthView } from "@/hooks/use-month-view";
import { calculateMonthlySpent } from "@/lib/calculations/budget";
import { sortTransactions } from "@/lib/domain/selectors";

export default function ExpensesPage() {
  const t = useT();
  const money = useMoney();
  const { month } = useApp();
  const view = useMonthView();
  const expenseSheet = useExpenseSheet();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [order, setOrder] = useState<"newest" | "oldest">("newest");

  const categories = view?.categories.filter((c) => c.type !== "savings") ?? [];
  const filtered = useMemo(() => {
    if (!view) return [];
    const q = query.trim().toLowerCase();
    const names = new Map(view.categories.map((c) => [c.id, c.name.toLowerCase()]));
    const list = view.transactions.filter(
      (tx) =>
        (categoryId === "all" || tx.categoryId === categoryId) &&
        (!q || tx.description.toLowerCase().includes(q) || names.get(tx.categoryId)?.includes(q)),
    );
    return sortTransactions(list, order);
  }, [view, query, categoryId, order]);

  const total = view ? calculateMonthlySpent(view.transactions) : 0;
  const isFiltered = query.trim() !== "" || categoryId !== "all";
  const addExpense = () => (categories.length > 0 ? expenseSheet.open({ month }) : toast.info(view ? t.expense.noCategories : t.expense.noBudget));

  return (
    <div className="space-y-5">
      <PageHeader title={<MonthSelector />} />

      <Card key={`${month.year}-${month.month}`} className="flex items-end justify-between gap-4 p-5 animate-month-in">
        <div>
          <p className="text-sm text-muted-foreground">{t.expenses.total}</p>
          <p className="tabular mt-1 text-3xl font-semibold tracking-tight">{money(total)}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t.expenses.count(view?.transactions.length ?? 0)}</p>
        </div>
        <Button onClick={addExpense} aria-label={t.dashboard.addExpense}>
          <Plus className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">{t.dashboard.addExpense}</span>
        </Button>
      </Card>

      {view && view.transactions.length > 0 && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.expenses.search}
              aria-label={t.expenses.search}
              className="pl-11"
            />
          </div>
          <div className="flex gap-2">
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label={t.expenses.filter} className="flex-1">
              <option value="all">{t.expenses.allCategories}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </Select>
            <Button
              variant="outline"
              className="h-12 shrink-0"
              onClick={() => setOrder((o) => (o === "newest" ? "oldest" : "newest"))}
              aria-label={`${t.expenses.sort}: ${order === "newest" ? t.expenses.newest : t.expenses.oldest}`}
            >
              <ArrowUpDown className="h-4 w-4" aria-hidden />
              <span className="text-sm">{order === "newest" ? t.expenses.newest : t.expenses.oldest}</span>
            </Button>
          </div>
        </div>
      )}

      {!view || view.transactions.length === 0 ? (
        <EmptyState
          icon={<ReceiptText className="h-5 w-5" />}
          title={t.expenses.emptyTitle}
          description={view ? t.expenses.emptyBody : t.expense.noBudget}
          action={view ? <Button onClick={addExpense}>{t.dashboard.addExpense}</Button> : undefined}
        />
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{isFiltered ? t.expenses.noResults : t.expenses.emptyTitle}</p>
      ) : (
        <ExpenseList transactions={filtered} categories={view.categories} onSelect={(tx) => expenseSheet.open({ transaction: tx })} />
      )}
    </div>
  );
}
