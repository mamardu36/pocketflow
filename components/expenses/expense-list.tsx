"use client";

import { ExpenseItem } from "@/components/expenses/expense-item";
import { useDateLocale, useT } from "@/hooks/use-app";
import { daysBetween, formatLongDate, formatShortDate, toISODate } from "@/lib/dates";
import type { BudgetCategory, Transaction } from "@/types";

interface ExpenseListProps {
  transactions: Transaction[];
  categories: BudgetCategory[];
  onSelect: (transaction: Transaction) => void;
  /** Group rows under day headings (Today, Yesterday, …). */
  grouped?: boolean;
}

export function ExpenseList({ transactions, categories, onSelect, grouped = true }: ExpenseListProps) {
  const t = useT();
  const locale = useDateLocale();
  const byId = new Map(categories.map((c) => [c.id, c]));
  const today = toISODate(new Date());

  if (!grouped) {
    return (
      <ul className="space-y-0.5">
        {transactions.map((tx) => (
          <ExpenseItem key={tx.id} transaction={tx} category={byId.get(tx.categoryId)} onSelect={onSelect} subtitle={formatShortDate(tx.date, locale)} />
        ))}
      </ul>
    );
  }

  const groups: { date: string; items: Transaction[] }[] = [];
  for (const tx of transactions) {
    const last = groups[groups.length - 1];
    if (last && last.date === tx.date) last.items.push(tx);
    else groups.push({ date: tx.date, items: [tx] });
  }

  const label = (date: string) => {
    const diff = daysBetween(date, today);
    if (diff === 0) return t.expenses.today;
    if (diff === 1) return t.expenses.yesterday;
    return formatLongDate(date, locale);
  };

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <section key={g.date} aria-label={label(g.date)}>
          <h3 className="mb-1 px-2 text-sm font-medium text-muted-foreground">{label(g.date)}</h3>
          <ul className="space-y-0.5">
            {g.items.map((tx) => (
              <ExpenseItem key={tx.id} transaction={tx} category={byId.get(tx.categoryId)} onSelect={onSelect} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
