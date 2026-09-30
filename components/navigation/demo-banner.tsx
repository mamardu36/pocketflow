"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useApp, useT } from "@/hooks/use-app";

export function DemoBanner() {
  const { mode, startDemo, leave } = useApp();
  const t = useT();
  const router = useRouter();
  if (mode !== "demo") return null;
  return (
    <div className="mb-4 flex items-center gap-2 rounded-2xl bg-warning/10 px-3 py-2 text-sm text-foreground">
      <span className="rounded-full bg-warning/20 px-2 py-0.5 text-xs font-semibold">{t.demo.badge}</span>
      <span className="min-w-0 flex-1 truncate text-muted-foreground">{t.demo.banner}</span>
      <button
        type="button"
        onClick={async () => {
          await startDemo();
          toast.success(t.demo.resetDone);
        }}
        className="grid h-8 w-8 place-items-center rounded-full hover:bg-warning/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={t.demo.reset}
        title={t.demo.reset}
      >
        <RotateCcw className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => {
          leave();
          router.replace("/welcome");
        }}
        className="rounded-full px-2 py-1 font-medium hover:bg-warning/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {t.demo.exit}
      </button>
    </div>
  );
}
