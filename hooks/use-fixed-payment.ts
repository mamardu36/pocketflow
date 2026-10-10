"use client";

import { useCallback } from "react";
import { useMoney, useT } from "@/hooks/use-app";
import { useUndoable } from "@/hooks/use-undoable";
import { defaultDateForMonth } from "@/lib/dates";
import { markFixedPaid, markFixedUnpaid } from "@/lib/domain/actions";
import type { BudgetCategory, MonthKey } from "@/types";

/** Ticks / unticks the "Paid" box of a fixed expense, with an Undo in the notification. */
export function useFixedPayment() {
  const t = useT();
  const money = useMoney();
  const run = useUndoable();
  return useCallback(
    (category: BudgetCategory, month: MonthKey, spent: number, paid: boolean) => {
      if (paid) {
        run((d) => markFixedUnpaid(d, category.id), t.category.unpaidToast(category.name));
      } else {
        const rest = category.assigned - spent;
        run((d) => markFixedPaid(d, category.id, defaultDateForMonth(month)), t.category.paidToast(category.name, money(rest)));
      }
    },
    [run, t, money],
  );
}
