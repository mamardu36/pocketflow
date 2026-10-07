"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useApp, useT } from "@/hooks/use-app";
import { buildUndo } from "@/lib/domain/undo";
import type { AppData } from "@/types";

const UNDO_WINDOW_MS = 6000;

/**
 * Deletes immediately and shows a toast with an "Undo" button, instead of asking for confirmation first.
 * Returns false if the deletion couldn't be applied.
 */
export function useUndoableDelete() {
  const { commit } = useApp();
  const t = useT();
  return useCallback(
    (updater: (data: AppData) => AppData, message: string): boolean => {
      const snapshot: { prev?: AppData; next?: AppData } = {};
      const ok = commit((d) => {
        const next = updater(d);
        snapshot.prev = d;
        snapshot.next = next;
        return next;
      });
      if (!ok || !snapshot.prev || !snapshot.next) return false;
      const undo = buildUndo(snapshot.prev, snapshot.next);
      toast.success(message, {
        duration: UNDO_WINDOW_MS,
        action: { label: t.common.undo, onClick: () => void commit(undo) },
      });
      return true;
    },
    [commit, t],
  );
}
