/**
 * Defensive parsing for data coming from localStorage, imported files or the cloud.
 * Invalid records are dropped instead of crashing the app.
 */
import { CATEGORY_COLORS } from "@/constants/categories";
import { CURRENCY_CODES } from "@/constants/currencies";
import { createDefaultPreferences, createEmptyData } from "@/lib/domain/factories";
import { isValidISODate } from "@/lib/dates";
import type {
  AppData, BudgetCategory, CategoryColor, CategoryType, MonthlyBudget, SavingsGoal, SavingsTransaction,
  Transaction, UserPreferences,
} from "@/types";

type Rec = Record<string, unknown>;

const isRecord = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const int = (v: unknown, fallback = 0): number => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : fallback);
const nullableInt = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null);
const nullableDate = (v: unknown): string | null => (typeof v === "string" && isValidISODate(v) ? v : null);
const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T): T =>
  typeof v === "string" && (options as readonly string[]).includes(v) ? (v as T) : fallback;
const color = (v: unknown): CategoryColor => oneOf(v, CATEGORY_COLORS, "slate");
const stamp = (v: unknown): string => str(v, new Date(0).toISOString());

function list<T>(value: unknown, parse: (r: Rec) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map(parse).filter((x): x is T => x !== null);
}

function parseBudget(r: Rec): MonthlyBudget | null {
  const id = str(r.id), year = int(r.year), month = int(r.month);
  if (!id || year < 1970 || year > 9999 || month < 1 || month > 12) return null;
  return { id, year, month, amount: Math.max(0, int(r.amount)), reviewedAt: typeof r.reviewedAt === "string" ? r.reviewedAt : null, createdAt: stamp(r.createdAt), updatedAt: stamp(r.updatedAt) };
}

function parseCategory(r: Rec): BudgetCategory | null {
  const id = str(r.id), budgetId = str(r.budgetId), name = str(r.name).trim();
  if (!id || !budgetId || !name) return null;
  const type = oneOf<CategoryType>(r.type, ["fixed", "variable", "savings"], "variable");
  return {
    id, budgetId, name, type,
    emoji: str(r.emoji, "📦"),
    color: color(r.color),
    assigned: Math.max(0, int(r.assigned)),
    recurring: r.recurring === true,
    savingsGoalId: type === "savings" && typeof r.savingsGoalId === "string" ? r.savingsGoalId : null,
    sortOrder: int(r.sortOrder),
    createdAt: stamp(r.createdAt), updatedAt: stamp(r.updatedAt),
  };
}

function parseTransaction(r: Rec): Transaction | null {
  const id = str(r.id), budgetId = str(r.budgetId), categoryId = str(r.categoryId), date = str(r.date);
  const amount = int(r.amount);
  if (!id || !budgetId || !categoryId || !isValidISODate(date) || amount <= 0) return null;
  return { id, budgetId, categoryId, amount, date, description: str(r.description), createdAt: stamp(r.createdAt), updatedAt: stamp(r.updatedAt) };
}

function parseGoal(r: Rec): SavingsGoal | null {
  const id = str(r.id), name = str(r.name).trim();
  if (!id || !name) return null;
  const target = nullableInt(r.targetAmount);
  return {
    id, name,
    emoji: str(r.emoji, "🐷"),
    color: color(r.color),
    targetAmount: target && target > 0 ? target : null,
    initialAmount: Math.max(0, int(r.initialAmount)),
    targetDate: nullableDate(r.targetDate),
    sortOrder: int(r.sortOrder),
    createdAt: stamp(r.createdAt), updatedAt: stamp(r.updatedAt),
  };
}

function parseSavingsTransaction(r: Rec): SavingsTransaction | null {
  const id = str(r.id), goalId = str(r.goalId), date = str(r.date), amount = int(r.amount);
  if (!id || !goalId || !isValidISODate(date) || amount === 0) return null;
  return {
    id, goalId, amount, date,
    note: str(r.note),
    source: oneOf(r.source, ["manual", "unused"] as const, "manual"),
    budgetId: typeof r.budgetId === "string" ? r.budgetId : null,
    createdAt: stamp(r.createdAt), updatedAt: stamp(r.updatedAt),
  };
}

function parsePreferences(v: unknown): UserPreferences {
  const defaults = createDefaultPreferences();
  if (!isRecord(v)) return defaults;
  return {
    currency: oneOf(v.currency, CURRENCY_CODES, defaults.currency),
    theme: oneOf(v.theme, ["system", "light", "dark"] as const, defaults.theme),
    language: oneOf(v.language, ["en"] as const, defaults.language),
    updatedAt: str(v.updatedAt, defaults.updatedAt),
  };
}

/** Throws only if the payload isn't an object at all. Also enforces referential integrity. */
export function parseAppData(raw: unknown): AppData {
  const source = isRecord(raw) && isRecord(raw.data) ? raw.data : raw;
  if (!isRecord(source)) throw new Error("This file doesn't contain budget data.");

  const seenMonths = new Set<string>();
  const budgets = list(source.budgets, parseBudget).filter((b) => {
    const key = `${b.year}-${b.month}`;
    if (seenMonths.has(key)) return false;
    seenMonths.add(key);
    return true;
  });
  const budgetIds = new Set(budgets.map((b) => b.id));
  const savingsGoals = list(source.savingsGoals, parseGoal);
  const goalIds = new Set(savingsGoals.map((g) => g.id));
  const categories = list(source.categories, parseCategory)
    .filter((c) => budgetIds.has(c.budgetId))
    .map((c) => (c.savingsGoalId && !goalIds.has(c.savingsGoalId) ? { ...c, savingsGoalId: null } : c));
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const transactions = list(source.transactions, parseTransaction).filter((t) => {
    const category = categoryById.get(t.categoryId);
    return category !== undefined && category.budgetId === t.budgetId && category.type !== "savings";
  });
  const savingsTransactions = list(source.savingsTransactions, parseSavingsTransaction)
    .filter((s) => goalIds.has(s.goalId))
    .map((s) => (s.budgetId && !budgetIds.has(s.budgetId) ? { ...s, budgetId: null } : s));

  return { ...createEmptyData(), budgets, categories, transactions, savingsGoals, savingsTransactions, preferences: parsePreferences(source.preferences) };
}
