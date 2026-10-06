/** All money values are integer cents (e.g. €32.50 → 3250). */
export type Cents = number;

export type CategoryType = "fixed" | "variable" | "savings";
export type CurrencyCode = "EUR" | "USD" | "GBP" | "CHF" | "CAD";
export type ThemePreference = "system" | "light" | "dark";
export type LanguageCode = "en" | "fr";
export type AppMode = "guest" | "demo" | "cloud";
export type CategoryColor = "slate" | "sky" | "emerald" | "amber" | "rose" | "violet" | "teal" | "orange";

/** month is 1–12. Never derive logic from month names. */
export interface MonthKey {
  year: number;
  month: number;
}

interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
}

export interface MonthlyBudget extends Timestamps {
  id: string;
  year: number;
  month: number;
  amount: Cents;
  /** Set once the user has reviewed the month-end summary. */
  reviewedAt: string | null;
}

/** Categories are month-scoped so past months keep their exact allocations forever. */
export interface BudgetCategory extends Timestamps {
  id: string;
  budgetId: string;
  name: string;
  emoji: string;
  type: CategoryType;
  color: CategoryColor;
  assigned: Cents;
  recurring: boolean;
  /** Only for `savings` categories: the goal this monthly allocation feeds. */
  savingsGoalId: string | null;
  sortOrder: number;
}

export interface Transaction extends Timestamps {
  id: string;
  budgetId: string;
  categoryId: string;
  amount: Cents;
  description: string;
  /** Local calendar date, YYYY-MM-DD (timezone-safe). */
  date: string;
}

export interface SavingsGoal extends Timestamps {
  id: string;
  name: string;
  emoji: string;
  color: CategoryColor;
  targetAmount: Cents | null;
  /** Money already saved before using the app. */
  initialAmount: Cents;
  targetDate: string | null;
  sortOrder: number;
}

/** Manual deposits (+), withdrawals (−) and "move unused money" transfers. */
export type SavingsTransactionSource = "manual" | "unused";

export interface SavingsTransaction extends Timestamps {
  id: string;
  goalId: string;
  amount: Cents;
  date: string;
  note: string;
  source: SavingsTransactionSource;
  budgetId: string | null;
}

export interface UserPreferences {
  currency: CurrencyCode;
  theme: ThemePreference;
  language: LanguageCode;
  updatedAt: string;
}

export interface AppData {
  version: 1;
  budgets: MonthlyBudget[];
  categories: BudgetCategory[];
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
  savingsTransactions: SavingsTransaction[];
  preferences: UserPreferences;
}

export type CategoryDraft = Pick<BudgetCategory, "name" | "emoji" | "type" | "color" | "assigned" | "recurring"> & {
  savingsGoalId?: string | null;
};

export type TransactionDraft = Pick<Transaction, "categoryId" | "amount" | "description" | "date">;

export type SavingsGoalDraft = Pick<SavingsGoal, "name" | "emoji" | "color" | "targetAmount" | "initialAmount" | "targetDate">;
