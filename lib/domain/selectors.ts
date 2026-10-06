import {
  calculateCategorySpent, calculateDailyAllowance, calculateMonthProgress, calculateMonthSummary, calculateMonthlySpent,
  calculateRemainingDays,
  calculateRemainingVariableMoney, calculateUsageRatio, compareSpendingToPreviousMonth, getCategoryStatus,
  type CategoryStatus, type MonthSummary, type SpendingComparison,
} from "@/lib/calculations/budget";
import { CATEGORY_TYPES } from "@/constants/categories";
import { addMonths, compareMonthKeys, getCurrentMonthKey, isSameMonth } from "@/lib/dates";
import type { AppData, BudgetCategory, Cents, MonthKey, MonthlyBudget, Transaction } from "@/types";

export function findBudget(data: AppData, key: MonthKey): MonthlyBudget | null {
  return data.budgets.find((b) => b.year === key.year && b.month === key.month) ?? null;
}

export function getBudgetKey(budget: MonthlyBudget): MonthKey {
  return { year: budget.year, month: budget.month };
}

export function sortCategories(categories: BudgetCategory[]): BudgetCategory[] {
  return [...categories].sort(
    (a, b) => CATEGORY_TYPES.indexOf(a.type) - CATEGORY_TYPES.indexOf(b.type) || a.sortOrder - b.sortOrder,
  );
}

export function getCategoriesForBudget(data: AppData, budgetId: string): BudgetCategory[] {
  return sortCategories(data.categories.filter((c) => c.budgetId === budgetId));
}

export function sortTransactions(list: Transaction[], order: "newest" | "oldest" = "newest"): Transaction[] {
  const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  return order === "newest" ? sorted : sorted.reverse();
}

export function getTransactionsForBudget(data: AppData, budgetId: string): Transaction[] {
  return sortTransactions(data.transactions.filter((t) => t.budgetId === budgetId));
}

/** The month whose categories seed a new month: latest earlier month, else the latest one. */
export function findTemplateBudget(data: AppData, key: MonthKey): MonthlyBudget | null {
  const sorted = [...data.budgets].sort((a, b) => compareMonthKeys(getBudgetKey(b), getBudgetKey(a)));
  return sorted.find((b) => compareMonthKeys(getBudgetKey(b), key) < 0) ?? sorted[0] ?? null;
}

export function hasUserData(data: AppData | null | undefined): boolean {
  return Boolean(data && (data.budgets.length > 0 || data.savingsGoals.length > 0));
}

export interface CategoryStats {
  spent: Cents;
  remaining: Cents;
  ratio: number;
  status: CategoryStatus;
}

export interface MonthView {
  key: MonthKey;
  budget: MonthlyBudget;
  categories: BudgetCategory[];
  transactions: Transaction[];
  stats: Map<string, CategoryStats>;
  summary: MonthSummary;
  isCurrent: boolean;
  isPast: boolean;
  remainingDays: number;
  remainingVariable: Cents;
  dailyAllowance: Cents;
  comparison: SpendingComparison | null;
  /** 0 → 1, share of the month elapsed. */
  monthProgress: number;
}

export function getCategoryStats(category: BudgetCategory, transactions: Transaction[]): CategoryStats {
  const spent = calculateCategorySpent(category.id, transactions);
  return {
    spent,
    remaining: category.assigned - spent,
    ratio: calculateUsageRatio(spent, category.assigned),
    status: getCategoryStatus(category.assigned, spent),
  };
}

export function buildMonthView(data: AppData, key: MonthKey, today: Date = new Date()): MonthView | null {
  const budget = findBudget(data, key);
  if (!budget) return null;
  const categories = getCategoriesForBudget(data, budget.id);
  const transactions = getTransactionsForBudget(data, budget.id);
  const stats = new Map(categories.map((c) => [c.id, getCategoryStats(c, transactions)]));
  const current = getCurrentMonthKey(today);
  const isCurrent = isSameMonth(key, current);
  const remainingDays = calculateRemainingDays(key, today);
  const remainingVariable = calculateRemainingVariableMoney(categories, transactions);

  let comparison: SpendingComparison | null = null;
  if (isCurrent) {
    const previous = findBudget(data, addMonths(key, -1));
    if (previous) {
      const prevTx = data.transactions.filter((t) => t.budgetId === previous.id);
      if (prevTx.length > 0) comparison = compareSpendingToPreviousMonth(transactions, prevTx, today.getDate());
    }
  }

  return {
    key,
    budget,
    categories,
    transactions,
    stats,
    summary: calculateMonthSummary(budget, categories, transactions, data.savingsTransactions),
    isCurrent,
    isPast: compareMonthKeys(key, current) < 0,
    remainingDays,
    remainingVariable,
    dailyAllowance: calculateDailyAllowance(remainingVariable, remainingDays),
    comparison,
    monthProgress: calculateMonthProgress(key, today),
  };
}

export interface MonthRecap {
  /** Category with the highest spending (fixed or variable). */
  top: { category: BudgetCategory; spent: Cents } | null;
  /** Full-month spending vs. the previous month; only for completed months. */
  previous: { key: MonthKey; difference: Cents } | null;
}

export function buildMonthRecap(data: AppData, view: MonthView): MonthRecap {
  let top: MonthRecap["top"] = null;
  for (const category of view.categories) {
    if (category.type === "savings") continue;
    const spent = view.stats.get(category.id)?.spent ?? 0;
    if (spent > 0 && (!top || spent > top.spent)) top = { category, spent };
  }

  let previous: MonthRecap["previous"] = null;
  if (view.isPast) {
    const key = addMonths(view.key, -1);
    const budget = findBudget(data, key);
    if (budget) {
      const prevSpent = calculateMonthlySpent(data.transactions.filter((t) => t.budgetId === budget.id));
      previous = { key, difference: view.summary.spent - prevSpent };
    }
  }
  return { top, previous };
}
