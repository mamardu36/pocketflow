"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AddExpenseForm } from "@/components/expenses/add-expense-form";
import { Sheet } from "@/components/ui/sheet";
import { useApp, useT } from "@/hooks/use-app";
import type { MonthKey, Transaction } from "@/types";

export interface ExpenseSheetOptions {
  categoryId?: string;
  transaction?: Transaction;
  month?: MonthKey;
}

interface ExpenseSheetContextValue {
  open: (options?: ExpenseSheetOptions) => void;
}

const ExpenseSheetContext = createContext<ExpenseSheetContextValue | null>(null);

/** One global "Add expense" sheet, reachable from any screen. */
export function ExpenseSheetProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const { data, month } = useApp();
  const [state, setState] = useState<{ options: ExpenseSheetOptions; nonce: number } | null>(null);

  const open = useCallback((options: ExpenseSheetOptions = {}) => setState({ options, nonce: Date.now() }), []);
  const close = () => setState(null);

  const tx = state?.options.transaction;
  const txBudget = tx ? data.budgets.find((b) => b.id === tx.budgetId) : null;
  const targetMonth: MonthKey = txBudget ? { year: txBudget.year, month: txBudget.month } : state?.options.month ?? month;

  return (
    <ExpenseSheetContext.Provider value={{ open }}>
      {children}
      <Sheet open={state !== null} onClose={close} title={tx ? t.expense.edit : t.expense.add} closeLabel={t.common.close}>
        {state && (
          <AddExpenseForm
            key={state.nonce}
            month={targetMonth}
            transaction={tx}
            defaultCategoryId={state.options.categoryId}
            onDone={close}
          />
        )}
      </Sheet>
    </ExpenseSheetContext.Provider>
  );
}

export function useExpenseSheet(): ExpenseSheetContextValue {
  const ctx = useContext(ExpenseSheetContext);
  if (!ctx) throw new Error("useExpenseSheet must be used inside <ExpenseSheetProvider>");
  return ctx;
}
