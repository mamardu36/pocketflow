import { addCategory, addTransaction, createMonthBudget } from "@/lib/domain/actions";
import { createEmptyData } from "@/lib/domain/factories";
import { findBudget } from "@/lib/domain/selectors";
import type { AppData, BudgetCategory, CategoryDraft, MonthKey, Transaction } from "@/types";

export const SEPT_2026: MonthKey = { year: 2026, month: 9 };

export function draft(name: string, type: CategoryDraft["type"], assigned: number, extra: Partial<CategoryDraft> = {}): CategoryDraft {
  return { name, emoji: "📦", type, color: "slate", assigned, recurring: type === "fixed", ...extra };
}

export function category(id: string, type: BudgetCategory["type"], assigned: number): BudgetCategory {
  return {
    id, budgetId: "b1", name: id, emoji: "📦", type, color: "slate", assigned,
    recurring: false, savingsGoalId: null, sortOrder: 0, createdAt: "", updatedAt: "",
  };
}

export function tx(categoryId: string, amount: number, date = "2026-09-10"): Transaction {
  return { id: `${categoryId}-${amount}-${date}`, budgetId: "b1", categoryId, amount, description: "", date, createdAt: "", updatedAt: "" };
}

/** A month with the spec's example: €1,000 split into Rent/Groceries/Transport/Going out/Savings. */
export function sampleMonth(key: MonthKey = SEPT_2026): AppData {
  return createMonthBudget(createEmptyData(), {
    key,
    amount: 100000,
    reuseAmounts: true,
    seedCategories: [
      draft("Rent", "fixed", 60000),
      draft("Groceries", "variable", 20000),
      draft("Transport", "variable", 5000),
      draft("Going out", "variable", 5000),
      draft("Savings", "savings", 5000),
    ],
  });
}

export function categoryByName(data: AppData, key: MonthKey, name: string): BudgetCategory {
  const budget = findBudget(data, key)!;
  return data.categories.find((c) => c.budgetId === budget.id && c.name === name)!;
}

export function spend(data: AppData, key: MonthKey, name: string, amount: number, date: string): AppData {
  return addTransaction(data, { categoryId: categoryByName(data, key, name).id, amount, description: name, date });
}

export { addCategory };
