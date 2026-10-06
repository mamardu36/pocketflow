import { APP_CONFIG } from "@/config/app";
import { createId, nowISO } from "@/lib/utils";
import type {
  AppData, BudgetCategory, CategoryDraft, LanguageCode, MonthKey, MonthlyBudget, SavingsGoal, SavingsGoalDraft,
  SavingsTransaction, Transaction, TransactionDraft, UserPreferences,
} from "@/types";

export function createDefaultPreferences(language: LanguageCode = APP_CONFIG.defaultLanguage): UserPreferences {
  return { currency: APP_CONFIG.defaultCurrency, theme: "system", language, updatedAt: nowISO() };
}

export function createEmptyData(language?: LanguageCode): AppData {
  return { version: 1, budgets: [], categories: [], transactions: [], savingsGoals: [], savingsTransactions: [], preferences: createDefaultPreferences(language) };
}

export function newBudget(key: MonthKey, amount: number): MonthlyBudget {
  const now = nowISO();
  return { id: createId(), year: key.year, month: key.month, amount, reviewedAt: null, createdAt: now, updatedAt: now };
}

export function newCategory(budgetId: string, draft: CategoryDraft, sortOrder: number): BudgetCategory {
  const now = nowISO();
  return {
    id: createId(),
    budgetId,
    name: draft.name.trim(),
    emoji: draft.emoji,
    type: draft.type,
    color: draft.color,
    assigned: draft.assigned,
    recurring: draft.recurring,
    savingsGoalId: draft.type === "savings" ? draft.savingsGoalId ?? null : null,
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };
}

export function newTransaction(budgetId: string, draft: TransactionDraft): Transaction {
  const now = nowISO();
  return { id: createId(), budgetId, ...draft, description: draft.description.trim(), createdAt: now, updatedAt: now };
}

export function newSavingsGoal(draft: SavingsGoalDraft, sortOrder: number): SavingsGoal {
  const now = nowISO();
  return { id: createId(), ...draft, name: draft.name.trim(), sortOrder, createdAt: now, updatedAt: now };
}

export function newSavingsTransaction(
  input: Pick<SavingsTransaction, "goalId" | "amount" | "date" | "note" | "source" | "budgetId">,
): SavingsTransaction {
  const now = nowISO();
  return { id: createId(), ...input, note: input.note.trim(), createdAt: now, updatedAt: now };
}
