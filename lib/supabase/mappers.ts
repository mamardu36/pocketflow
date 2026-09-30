import type {
  BudgetCategory, CategoryColor, CategoryType, CurrencyCode, LanguageCode, MonthlyBudget, SavingsGoal,
  SavingsTransaction, SavingsTransactionSource, ThemePreference, Transaction, UserPreferences,
} from "@/types";

/** Row shapes of the SQL schema in supabase/schema.sql (snake_case). */
export interface BudgetRow { id: string; user_id: string; year: number; month: number; amount: number; reviewed_at: string | null; created_at: string; updated_at: string }
export interface CategoryRow { id: string; user_id: string; budget_id: string; name: string; emoji: string; type: CategoryType; color: CategoryColor; assigned: number; recurring: boolean; savings_goal_id: string | null; sort_order: number; created_at: string; updated_at: string }
export interface TransactionRow { id: string; user_id: string; budget_id: string; category_id: string; amount: number; description: string; date: string; created_at: string; updated_at: string }
export interface GoalRow { id: string; user_id: string; name: string; emoji: string; color: CategoryColor; target_amount: number | null; initial_amount: number; target_date: string | null; sort_order: number; created_at: string; updated_at: string }
export interface SavingsTransactionRow { id: string; user_id: string; goal_id: string; budget_id: string | null; amount: number; note: string; date: string; source: SavingsTransactionSource; created_at: string; updated_at: string }
export interface PreferencesRow { user_id: string; currency: CurrencyCode; theme: ThemePreference; language: LanguageCode; updated_at: string }

export const budgetFromRow = (r: BudgetRow): MonthlyBudget => ({ id: r.id, year: r.year, month: r.month, amount: Number(r.amount), reviewedAt: r.reviewed_at, createdAt: r.created_at, updatedAt: r.updated_at });
export const budgetToRow = (b: MonthlyBudget, userId: string): BudgetRow => ({ id: b.id, user_id: userId, year: b.year, month: b.month, amount: b.amount, reviewed_at: b.reviewedAt, created_at: b.createdAt, updated_at: b.updatedAt });

export const categoryFromRow = (r: CategoryRow): BudgetCategory => ({ id: r.id, budgetId: r.budget_id, name: r.name, emoji: r.emoji, type: r.type, color: r.color, assigned: Number(r.assigned), recurring: r.recurring, savingsGoalId: r.savings_goal_id, sortOrder: r.sort_order, createdAt: r.created_at, updatedAt: r.updated_at });
export const categoryToRow = (c: BudgetCategory, userId: string): CategoryRow => ({ id: c.id, user_id: userId, budget_id: c.budgetId, name: c.name, emoji: c.emoji, type: c.type, color: c.color, assigned: c.assigned, recurring: c.recurring, savings_goal_id: c.savingsGoalId, sort_order: c.sortOrder, created_at: c.createdAt, updated_at: c.updatedAt });

export const transactionFromRow = (r: TransactionRow): Transaction => ({ id: r.id, budgetId: r.budget_id, categoryId: r.category_id, amount: Number(r.amount), description: r.description, date: r.date, createdAt: r.created_at, updatedAt: r.updated_at });
export const transactionToRow = (t: Transaction, userId: string): TransactionRow => ({ id: t.id, user_id: userId, budget_id: t.budgetId, category_id: t.categoryId, amount: t.amount, description: t.description, date: t.date, created_at: t.createdAt, updated_at: t.updatedAt });

export const goalFromRow = (r: GoalRow): SavingsGoal => ({ id: r.id, name: r.name, emoji: r.emoji, color: r.color, targetAmount: r.target_amount === null ? null : Number(r.target_amount), initialAmount: Number(r.initial_amount), targetDate: r.target_date, sortOrder: r.sort_order, createdAt: r.created_at, updatedAt: r.updated_at });
export const goalToRow = (g: SavingsGoal, userId: string): GoalRow => ({ id: g.id, user_id: userId, name: g.name, emoji: g.emoji, color: g.color, target_amount: g.targetAmount, initial_amount: g.initialAmount, target_date: g.targetDate, sort_order: g.sortOrder, created_at: g.createdAt, updated_at: g.updatedAt });

export const savingsTxFromRow = (r: SavingsTransactionRow): SavingsTransaction => ({ id: r.id, goalId: r.goal_id, budgetId: r.budget_id, amount: Number(r.amount), note: r.note, date: r.date, source: r.source, createdAt: r.created_at, updatedAt: r.updated_at });
export const savingsTxToRow = (s: SavingsTransaction, userId: string): SavingsTransactionRow => ({ id: s.id, user_id: userId, goal_id: s.goalId, budget_id: s.budgetId, amount: s.amount, note: s.note, date: s.date, source: s.source, created_at: s.createdAt, updated_at: s.updatedAt });

export const preferencesFromRow = (r: PreferencesRow): UserPreferences => ({ currency: r.currency, theme: r.theme, language: r.language, updatedAt: r.updated_at });
export const preferencesToRow = (p: UserPreferences, userId: string): PreferencesRow => ({ user_id: userId, currency: p.currency, theme: p.theme, language: p.language, updated_at: p.updatedAt });
