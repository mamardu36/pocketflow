"use client";

import { CategoryIcon } from "@/components/ui/category-icon";
import { useMoney } from "@/hooks/use-app";
import type { BudgetCategory, Transaction } from "@/types";

interface ExpenseItemProps {
  transaction: Transaction;
  category?: BudgetCategory;
  onSelect: (transaction: Transaction) => void;
  subtitle?: string;
}

export function ExpenseItem({ transaction, category, onSelect, subtitle }: ExpenseItemProps) {
  const money = useMoney();
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(transaction)}
        className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CategoryIcon emoji={category?.emoji ?? "📦"} color={category?.color ?? "slate"} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{transaction.description || category?.name}</span>
          <span className="block truncate text-sm text-muted-foreground">{subtitle ?? category?.name}</span>
        </span>
        <span className="tabular shrink-0 font-semibold">{money(transaction.amount)}</span>
      </button>
    </li>
  );
}
