import type { CategoryColor, CategoryType } from "@/types";

export const CATEGORY_TYPES: CategoryType[] = ["fixed", "variable", "savings"];

export const CATEGORY_COLORS: CategoryColor[] = ["slate", "sky", "emerald", "amber", "rose", "violet", "teal", "orange"];

/** Full class strings (not interpolated) so Tailwind can detect them. */
export const COLOR_STYLES: Record<CategoryColor, { tile: string; bar: string; swatch: string }> = {
  slate: { tile: "bg-slate-500/10 text-slate-700 dark:bg-slate-400/15 dark:text-slate-200", bar: "bg-slate-500 dark:bg-slate-400", swatch: "bg-slate-500" },
  sky: { tile: "bg-sky-500/10 text-sky-700 dark:bg-sky-400/15 dark:text-sky-200", bar: "bg-sky-500 dark:bg-sky-400", swatch: "bg-sky-500" },
  emerald: { tile: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200", bar: "bg-emerald-600 dark:bg-emerald-400", swatch: "bg-emerald-600" },
  amber: { tile: "bg-amber-500/10 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200", bar: "bg-amber-500 dark:bg-amber-400", swatch: "bg-amber-500" },
  rose: { tile: "bg-rose-500/10 text-rose-700 dark:bg-rose-400/15 dark:text-rose-200", bar: "bg-rose-400 dark:bg-rose-300", swatch: "bg-rose-400" },
  violet: { tile: "bg-violet-500/10 text-violet-700 dark:bg-violet-400/15 dark:text-violet-200", bar: "bg-violet-500 dark:bg-violet-400", swatch: "bg-violet-500" },
  teal: { tile: "bg-teal-500/10 text-teal-700 dark:bg-teal-400/15 dark:text-teal-200", bar: "bg-teal-600 dark:bg-teal-400", swatch: "bg-teal-600" },
  orange: { tile: "bg-orange-500/10 text-orange-700 dark:bg-orange-400/15 dark:text-orange-200", bar: "bg-orange-500 dark:bg-orange-400", swatch: "bg-orange-500" },
};

export interface CategoryTemplate {
  name: string;
  emoji: string;
  type: CategoryType;
  color: CategoryColor;
  recurring: boolean;
}

export const DEFAULT_CATEGORIES: CategoryTemplate[] = [
  { name: "Rent", emoji: "🏠", type: "fixed", color: "slate", recurring: true },
  { name: "Phone", emoji: "📱", type: "fixed", color: "sky", recurring: true },
  { name: "Internet", emoji: "🌐", type: "fixed", color: "sky", recurring: true },
  { name: "Subscriptions", emoji: "📺", type: "fixed", color: "violet", recurring: true },
  { name: "Insurance", emoji: "🛡️", type: "fixed", color: "slate", recurring: true },
  { name: "Groceries", emoji: "🛒", type: "variable", color: "emerald", recurring: false },
  { name: "Transport", emoji: "🚌", type: "variable", color: "sky", recurring: false },
  { name: "Going out", emoji: "🍻", type: "variable", color: "amber", recurring: false },
  { name: "Restaurants", emoji: "🍽️", type: "variable", color: "orange", recurring: false },
  { name: "Shopping", emoji: "🛍️", type: "variable", color: "rose", recurring: false },
  { name: "Sport", emoji: "🏋️", type: "variable", color: "teal", recurring: false },
  { name: "Entertainment", emoji: "🎬", type: "variable", color: "violet", recurring: false },
  { name: "Other", emoji: "📦", type: "variable", color: "slate", recurring: false },
];

export const DEFAULT_SAVINGS_GOALS = [
  { name: "Emergency fund", emoji: "🛟", color: "teal" as CategoryColor },
  { name: "Holidays", emoji: "🏖️", color: "amber" as CategoryColor },
  { name: "Projects", emoji: "💻", color: "violet" as CategoryColor },
];

/** Suggested in onboarding — kept short on purpose. */
export const ONBOARDING_SUGGESTIONS: CategoryTemplate[] = [
  DEFAULT_CATEGORIES[0],
  DEFAULT_CATEGORIES[5],
  DEFAULT_CATEGORIES[6],
  DEFAULT_CATEGORIES[7],
  { name: "Savings", emoji: "🐷", type: "savings", color: "teal", recurring: false },
];

export const EMOJI_OPTIONS = [
  "🏠", "📱", "🌐", "📺", "🛡️", "🎓", "🚆", "🚌", "🛒", "🍽️", "🍻", "☕",
  "🛍️", "🏋️", "🎬", "🎮", "🎵", "📚", "💊", "✂️", "🎁", "🐶", "⚡", "🧾",
  "📦", "🐷", "🛟", "🏖️", "💻", "🚗", "🏡", "✈️",
];
