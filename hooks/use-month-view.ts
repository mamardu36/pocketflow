"use client";

import { useMemo } from "react";
import { useApp } from "@/hooks/use-app";
import { buildMonthView, type MonthView } from "@/lib/domain/selectors";
import type { MonthKey } from "@/types";

/** Derived data for a month (defaults to the selected month). Recomputed only when data changes. */
export function useMonthView(key?: MonthKey): MonthView | null {
  const { data, month } = useApp();
  const target = key ?? month;
  return useMemo(() => buildMonthView(data, target), [data, target.year, target.month]); // eslint-disable-line react-hooks/exhaustive-deps
}
