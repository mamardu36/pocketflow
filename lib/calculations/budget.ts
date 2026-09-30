import { compareMonthKeys, daysInMonth, getCurrentMonthKey } from "@/lib/dates";
import type { BudgetCategory, Cents, MonthKey, MonthlyBudget, SavingsTransaction, Transaction } from "@/types";

export const NEAR_LIMIT_RATIO = 0.85;

export function sumCents(values: readonly Cents[]): Cents {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

export function calculateAssignedMoney(categories: readonly Pick<BudgetCategory, "assigned">[]): Cents {
  return sumCents(categories.map((c) => c.assigned));
}

/** leftToAssign = monthlyBudget − totalAssigned (negative means over-assigned). */
export function calculateUnassignedMoney(monthlyBudget: Cents, categories: readonly Pick<BudgetCategory, "assigned">[]): Cents {
  return monthlyBudget - calculateAssignedMoney(categories);
}

export function calculateCategorySpent(categoryId: string, transactions: readonly Transaction[]): Cents {
  return sumCents(transactions.filter((t) => t.categoryId === categoryId).map((t) => t.amount));
}

/** Negative when the category is over budget. */
export function calculateCategoryRemaining(category: Pick<BudgetCategory, "id" | "assigned">, transactions: readonly Transaction[]): Cents {
  return category.assigned - calculateCategorySpent(category.id, transactions);
}

export function calculateUsageRatio(spent: Cents, assigned: Cents): number {
  if (assigned <= 0) return spent > 0 ? 1 : 0;
  return spent / assigned;
}

export type CategoryStatus = "untouched" | "on-track" | "near-limit" | "over";

export function getCategoryStatus(assigned: Cents, spent: Cents): CategoryStatus {
  if (spent > assigned) return "over";
  if (spent === 0) return "untouched";
  return calculateUsageRatio(spent, assigned) >= NEAR_LIMIT_RATIO ? "near-limit" : "on-track";
}

export function calculateMonthlySpent(transactions: readonly Transaction[]): Cents {
  return sumCents(transactions.map((t) => t.amount));
}

/** Days left including today. Past months → 0, future months → all days. */
export function calculateRemainingDays(key: MonthKey, today: Date = new Date()): number {
  const cmp = compareMonthKeys(key, getCurrentMonthKey(today));
  if (cmp < 0) return 0;
  if (cmp > 0) return daysInMonth(key);
  return daysInMonth(key) - today.getDate() + 1;
}

/**
 * Money still available for day-to-day spending: variable categories only.
 * Fixed costs are already reserved, savings are set aside, unassigned money isn't budgeted yet.
 * Overspending in one variable category reduces what's left in the others.
 */
export function calculateRemainingVariableMoney(categories: readonly BudgetCategory[], transactions: readonly Transaction[]): Cents {
  const variable = categories.filter((c) => c.type === "variable");
  const ids = new Set(variable.map((c) => c.id));
  const spent = sumCents(transactions.filter((t) => ids.has(t.categoryId)).map((t) => t.amount));
  return Math.max(0, calculateAssignedMoney(variable) - spent);
}

/** remainingVariableMoney / remainingDays, rounded down to the cent. */
export function calculateDailyAllowance(remainingVariableMoney: Cents, remainingDays: number): Cents {
  if (remainingDays <= 0 || remainingVariableMoney <= 0) return 0;
  return Math.floor(remainingVariableMoney / remainingDays);
}

export function calculateSavedFromBudget(categories: readonly BudgetCategory[]): Cents {
  return calculateAssignedMoney(categories.filter((c) => c.type === "savings"));
}

export interface MonthSummary {
  budget: Cents;
  assigned: Cents;
  unassigned: Cents;
  overAssignedBy: Cents;
  spent: Cents;
  /** Savings allocations from this month's budget. */
  savedFromBudget: Cents;
  /** Unused money moved to savings at month end. */
  movedToSavings: Cents;
  saved: Cents;
  /** budget − spent − saved, never negative. */
  unused: Cents;
  overspentBy: Cents;
}

export function calculateMonthSummary(
  budget: MonthlyBudget,
  categories: readonly BudgetCategory[],
  transactions: readonly Transaction[],
  savingsTransactions: readonly SavingsTransaction[],
): MonthSummary {
  const assigned = calculateAssignedMoney(categories);
  const unassigned = budget.amount - assigned;
  const spent = calculateMonthlySpent(transactions);
  const savedFromBudget = calculateSavedFromBudget(categories);
  const movedToSavings = sumCents(
    savingsTransactions.filter((s) => s.budgetId === budget.id && s.source === "unused").map((s) => s.amount),
  );
  const saved = savedFromBudget + movedToSavings;
  const balance = budget.amount - spent - saved;
  return {
    budget: budget.amount,
    assigned,
    unassigned,
    overAssignedBy: Math.max(0, -unassigned),
    spent,
    savedFromBudget,
    movedToSavings,
    saved,
    unused: Math.max(0, balance),
    overspentBy: Math.max(0, -balance),
  };
}

export interface SpendingComparison {
  current: Cents;
  previous: Cents;
  difference: Cents;
}

/** Compares spending so far with the same period of the previous month. */
export function compareSpendingToPreviousMonth(
  current: readonly Transaction[],
  previous: readonly Transaction[],
  dayOfMonth: number,
): SpendingComparison {
  const day = (iso: string) => Number(iso.slice(8, 10));
  const cur = sumCents(current.filter((t) => day(t.date) <= dayOfMonth).map((t) => t.amount));
  const prev = sumCents(previous.filter((t) => day(t.date) <= dayOfMonth).map((t) => t.amount));
  return { current: cur, previous: prev, difference: cur - prev };
}
