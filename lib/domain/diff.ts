import type { AppData, BudgetCategory, MonthlyBudget, SavingsGoal, SavingsTransaction, Transaction } from "@/types";

export interface CollectionChanges<T> {
  upserts: T[];
  deletes: string[];
}

export interface DataChanges {
  budgets: CollectionChanges<MonthlyBudget>;
  categories: CollectionChanges<BudgetCategory>;
  transactions: CollectionChanges<Transaction>;
  savingsGoals: CollectionChanges<SavingsGoal>;
  savingsTransactions: CollectionChanges<SavingsTransaction>;
  preferencesChanged: boolean;
}

/** Records are flat objects: compare field by field. */
function sameRecord(a: object | undefined, b: object): boolean {
  if (a === b) return true;
  if (!a) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => (a as Record<string, unknown>)[k] === (b as Record<string, unknown>)[k]);
}

/**
 * Fast path: actions keep references for untouched records.
 * Field comparison covers states rebuilt from storage (e.g. server copy vs. offline cache).
 */
function diffCollection<T extends { id: string }>(prev: readonly T[], next: readonly T[]): CollectionChanges<T> {
  const prevById = new Map(prev.map((item) => [item.id, item]));
  const nextIds = new Set(next.map((item) => item.id));
  return {
    upserts: next.filter((item) => !sameRecord(prevById.get(item.id), item)),
    deletes: prev.filter((item) => !nextIds.has(item.id)).map((item) => item.id),
  };
}

export function diffData(prev: AppData, next: AppData): DataChanges {
  return {
    budgets: diffCollection(prev.budgets, next.budgets),
    categories: diffCollection(prev.categories, next.categories),
    transactions: diffCollection(prev.transactions, next.transactions),
    savingsGoals: diffCollection(prev.savingsGoals, next.savingsGoals),
    savingsTransactions: diffCollection(prev.savingsTransactions, next.savingsTransactions),
    preferencesChanged: !sameRecord(prev.preferences, next.preferences),
  };
}
