"use client";

import { CloudOff } from "lucide-react";
import { useApp, useT } from "@/hooks/use-app";

/** Shown only while some changes exist only on this device. Disappears by itself once synced. */
export function SyncBanner() {
  const { syncPending } = useApp();
  const t = useT();
  if (!syncPending) return null;
  return (
    <div role="status" className="mb-4 flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground animate-fade-in">
      <CloudOff className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0 truncate">{t.sync.pending}</span>
    </div>
  );
}
