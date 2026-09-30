import { createMonthBudget } from "@/lib/domain/actions";
import { createEmptyData, newSavingsGoal, newTransaction } from "@/lib/domain/factories";
import { findBudget } from "@/lib/domain/selectors";
import { addMonths, daysInMonth, getCurrentMonthKey } from "@/lib/dates";
import type { AppData, CategoryDraft, MonthKey } from "@/types";

type Spend = [category: string, description: string, amount: number, day: number];

function buildMonth(data: AppData, key: MonthKey, amount: number, categories: CategoryDraft[], spends: Spend[], maxDay: number): AppData {
  // Seed directly, independent of any previous month.
  const seeded = createMonthBudget({ ...data, budgets: [], categories: [] }, { key, amount, reuseAmounts: true, seedCategories: categories });
  const budget = findBudget(seeded, key)!;
  const cats = seeded.categories;
  const pad = (n: number) => String(n).padStart(2, "0");
  const transactions = spends.map(([name, description, cents, day]) => {
    const category = cats.find((c) => c.name === name)!;
    const d = Math.min(day, maxDay);
    return newTransaction(budget.id, { categoryId: category.id, description, amount: cents, date: `${key.year}-${pad(key.month)}-${pad(d)}` });
  });
  return {
    ...data,
    budgets: [...data.budgets, budget],
    categories: [...data.categories, ...cats],
    transactions: [...data.transactions, ...transactions],
  };
}

/** Realistic student month: €1,000 budget, €30 left to assign. */
export function buildDemoData(today: Date = new Date()): AppData {
  const current = getCurrentMonthKey(today);
  const previous = addMonths(current, -1);

  const emergency = newSavingsGoal({ name: "Emergency fund", emoji: "🛟", color: "teal", targetAmount: 100000, initialAmount: 30000, targetDate: null }, 0);
  const holidays = newSavingsGoal({ name: "Summer holidays", emoji: "🏖️", color: "amber", targetAmount: 80000, initialAmount: 11000, targetDate: `${current.year + 1}-07-01` }, 1);

  const categories = (savings: number, groceries: number, goingOut: number): CategoryDraft[] => [
    { name: "Rent", emoji: "🏠", type: "fixed", color: "slate", assigned: 55000, recurring: true },
    { name: "Phone", emoji: "📱", type: "fixed", color: "sky", assigned: 2000, recurring: true },
    { name: "Groceries", emoji: "🛒", type: "variable", color: "emerald", assigned: groceries, recurring: false },
    { name: "Transport", emoji: "🚌", type: "variable", color: "sky", assigned: 5000, recurring: false },
    { name: "Going out", emoji: "🍻", type: "variable", color: "amber", assigned: goingOut, recurring: false },
    { name: "Entertainment", emoji: "🎬", type: "variable", color: "violet", assigned: 3000, recurring: false },
    { name: "Summer holidays", emoji: "🏖️", type: "savings", color: "amber", assigned: savings, recurring: false, savingsGoalId: holidays.id },
  ];

  let data: AppData = { ...createEmptyData(), savingsGoals: [emergency, holidays] };

  data = buildMonth(data, previous, 90000, categories(3000, 17000, 6000), [
    ["Rent", "Rent", 55000, 1], ["Phone", "Phone plan", 2000, 3], ["Groceries", "Lidl", 4210, 4],
    ["Groceries", "Carrefour", 5630, 12], ["Groceries", "Market", 2380, 19], ["Groceries", "Carrefour", 3900, 26],
    ["Transport", "Train ticket", 2400, 8], ["Going out", "Bar", 1800, 10], ["Going out", "Concert", 3500, 21],
    ["Entertainment", "Cinema", 1250, 15],
  ], daysInMonth(previous));

  data = buildMonth(data, current, 100000, categories(7000, 18000, 7000), [
    ["Rent", "Rent", 55000, 1], ["Phone", "Phone plan", 2000, 2], ["Groceries", "Carrefour", 3250, 3],
    ["Transport", "Bus", 200, 4], ["Going out", "Restaurant", 1600, 5], ["Entertainment", "Cinema", 1250, 6],
  ], today.getDate());

  return data;
}
