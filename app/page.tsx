"use client";

import { Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BudgetAmountSheet } from "@/components/budget/budget-amount-sheet";
import { CategorySection } from "@/components/budget/category-section";
import { CategorySheet } from "@/components/budget/category-sheet";
import { DailyBudgetIndicator } from "@/components/budget/daily-budget-indicator";
import { MonthEndCard } from "@/components/budget/month-summary-card";
import { MonthSelector } from "@/components/budget/month-selector";
import { MonthSetup } from "@/components/budget/month-setup";
import { MonthlyBudgetCard } from "@/components/budget/monthly-budget-card";
import { PreviousMonthBanner } from "@/components/budget/previous-month-banner";
import { useExpenseSheet } from "@/components/expenses/expense-sheet-provider";
import { PageHeader } from "@/components/navigation/page-header";
import { InstallNudge } from "@/components/pwa/install-nudge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CATEGORY_TYPES, ONBOARDING_SUGGESTIONS } from "@/constants/categories";
import { useApp, useT } from "@/hooks/use-app";
import { useMonthView } from "@/hooks/use-month-view";
import { addSuggestedCategories } from "@/lib/domain/actions";
import { localizeName } from "@/lib/i18n";
import type { BudgetCategory, CategoryType } from "@/types";

export default function DashboardPage() {
  const t = useT();
  const { month, commit } = useApp();
  const view = useMonthView();
  const expenseSheet = useExpenseSheet();
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [categorySheet, setCategorySheet] = useState<{ category: BudgetCategory | null; type: CategoryType } | null>(null);

  const canAddExpense = view ? view.categories.some((c) => c.type !== "savings") : false;

  return (
    <div className="space-y-5">
      <PageHeader title={<MonthSelector />} />
      <InstallNudge />

      {!view ? (
        <MonthSetup key={`${month.year}-${month.month}`} monthKey={month} />
      ) : (
        <div key={`${month.year}-${month.month}`} className="space-y-5 animate-month-in">
          <PreviousMonthBanner />
          {view.isPast && !view.budget.reviewedAt && <MonthEndCard view={view} />}
          <MonthlyBudgetCard view={view} onEditBudget={() => setBudgetOpen(true)} />
          <DailyBudgetIndicator view={view} />

          <Button
            size="lg"
            className="w-full text-base"
            onClick={() => (canAddExpense ? expenseSheet.open({ month }) : toast.info(t.expense.noCategories))}
          >
            <Plus className="h-5 w-5" aria-hidden />
            {t.dashboard.addExpense}
          </Button>

          {view.categories.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-5 w-5" />}
              title={t.dashboard.noCategoriesTitle}
              description={t.dashboard.noCategoriesBody}
              action={
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button onClick={() => commit((d) =>
                      addSuggestedCategories(d, view.budget.id, ONBOARDING_SUGGESTIONS.map((s) => ({ ...s, name: localizeName(s.name, t) }))),
                    )}>
                    {t.dashboard.suggested}
                  </Button>
                  <Button variant="outline" onClick={() => setCategorySheet({ category: null, type: "variable" })}>
                    {t.category.add}
                  </Button>
                </div>
              }
            />
          ) : (
            CATEGORY_TYPES.map((type) => (
              <CategorySection
                key={type}
                type={type}
                view={view}
                onAdd={(tp) => setCategorySheet({ category: null, type: tp })}
                onEditSavings={(c) => setCategorySheet({ category: c, type: c.type })}
              />
            ))
          )}

          <BudgetAmountSheet open={budgetOpen} onClose={() => setBudgetOpen(false)} budget={view.budget} />
          <CategorySheet
            open={categorySheet !== null}
            onClose={() => setCategorySheet(null)}
            budget={view.budget}
            category={categorySheet?.category}
            defaultType={categorySheet?.type}
          />
        </div>
      )}
    </div>
  );
}
