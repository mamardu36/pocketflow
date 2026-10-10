"use client";

import { Share } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useApp, useT } from "@/hooks/use-app";

/**
 * iPhone has no install button for websites: this explains the 3 steps.
 * An app installed from Safari has its own storage, so the note depends on the mode:
 * guests are warned it starts empty (account first); account holders just sign in again.
 */
export function InstallGuideSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const router = useRouter();
  const { mode, cloudAvailable } = useApp();
  const guest = mode !== "cloud";
  const offerAccount = guest && cloudAvailable;

  return (
    <Sheet open={open} onClose={onClose} title={t.install.iosTitle} closeLabel={t.common.close}>
      <ol className="space-y-3">
        {t.install.iosSteps.map((step, i) => (
          <li key={step} className="flex items-center gap-3">
            <span className="tabular grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold">{i + 1}</span>
            <span className="flex-1">{step}</span>
            {i === 0 && <Share className="h-5 w-5 shrink-0 text-primary" aria-hidden />}
          </li>
        ))}
      </ol>
      <p className={guest ? "mt-5 rounded-2xl bg-warning/10 px-4 py-3 text-sm" : "mt-5 rounded-2xl bg-muted px-4 py-3 text-sm"}>
        {guest ? t.install.iosWarning : t.install.iosCloudNote}
      </p>
      <div className="mt-5 flex flex-col gap-2">
        {offerAccount && (
          <Button size="lg" onClick={() => router.push("/auth")}>
            {t.install.createAccount}
          </Button>
        )}
        <Button size="lg" variant={offerAccount ? "ghost" : "primary"} onClick={onClose}>
          {t.install.iosFresh}
        </Button>
      </div>
    </Sheet>
  );
}
