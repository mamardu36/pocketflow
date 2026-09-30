"use client";

import { useState } from "react";
import { Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useApp, useT } from "@/hooks/use-app";
import { errorMessage } from "@/lib/utils";

/** Offered after sign-in when this device holds guest data. Local data is never deleted. */
export function MigrationDialog() {
  const t = useT();
  const { migration, resolveMigration } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!migration) return null;

  const months = migration.localData.budgets.length;
  const run = async (action: "transfer" | "skip") => {
    setBusy(true);
    setError(null);
    try {
      await resolveMigration(action);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open onClose={() => !busy && run("skip")} title={t.migration.title} variant="dialog" closeLabel={t.common.close}>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Cloud className="h-5 w-5" aria-hidden />
          </span>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>{t.migration.body(months)}</p>
            <p className={migration.cloudHasData ? "font-medium text-warning" : undefined}>
              {migration.cloudHasData ? t.migration.bodyConflict : t.migration.bodyEmpty}
            </p>
            <p>{t.migration.keep}</p>
          </div>
        </div>
        {error && (
          <p role="alert" className="rounded-2xl bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            variant={migration.cloudHasData ? "danger" : "primary"}
            disabled={busy}
            onClick={() => run("transfer")}
            data-autofocus
          >
            {migration.cloudHasData ? t.migration.replace : t.migration.transfer}
          </Button>
          <Button size="lg" variant="ghost" disabled={busy} onClick={() => run("skip")}>
            {t.migration.skip}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
