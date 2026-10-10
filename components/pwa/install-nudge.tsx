"use client";

import { ShieldCheck, Smartphone, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { InstallGuideSheet } from "@/components/pwa/install-guide-sheet";
import { Button } from "@/components/ui/button";
import { useApp, useT } from "@/hooks/use-app";
import { useInstallOffer } from "@/hooks/use-install-offer";
import { STORAGE_KEYS, safeGet, safeSet } from "@/lib/storage/keys";

const DAY = 24 * 60 * 60 * 1000;
/** Guests: data can be lost, so the card comes back after 3 days. Accounts: it's only a convenience. */
const SNOOZE = { guest: 3 * DAY, cloud: 30 * DAY };

/**
 * Dashboard card.
 * - Guest, where data can be erased: "Keep your budget safe" (account first on iPhone).
 * - Account, on a phone: a lighter "Install PocketFlow".
 * Always available afterwards in Settings → Install the app.
 */
export function InstallNudge() {
  const t = useT();
  const router = useRouter();
  const { mode, cloudAvailable } = useApp();
  const offer = useInstallOffer();
  const [snoozed, setSnoozed] = useState(true);

  const kind = mode === "guest" ? "guest" : mode === "cloud" ? "cloud" : null;
  const key = kind === "cloud" ? STORAGE_KEYS.installNudgeDismissedCloud : STORAGE_KEYS.installNudgeDismissed;

  useEffect(() => {
    if (!kind) return;
    setSnoozed(Date.now() - Number(safeGet(key) ?? 0) < SNOOZE[kind]);
  }, [kind, key]);

  if (!kind || !offer.ready || snoozed) return null;
  if (kind === "guest" && (!offer.atRisk || (!offer.canInstall && !cloudAvailable))) return null;
  if (kind === "cloud" && (!offer.onPhone || !offer.canInstall)) return null;

  const snooze = () => {
    try {
      safeSet(key, String(Date.now()));
    } catch {
      /* ignore */
    }
    setSnoozed(true);
  };
  const createAccount = () => router.push("/auth");

  let actions: ReactNode;
  if (kind === "cloud") {
    actions = (
      <Button size="sm" onClick={offer.install}>
        {t.install.install}
      </Button>
    );
  } else if (offer.ios && cloudAvailable) {
    // iPhone: the installed app doesn't see Safari's data, so the account is the safe path.
    actions = (
      <>
        <Button size="sm" onClick={createAccount}>
          {t.install.createAccount}
        </Button>
        <Button size="sm" variant="ghost" onClick={offer.install}>
          {t.install.install}
        </Button>
      </>
    );
  } else {
    actions = (
      <>
        {offer.canInstall && (
          <Button size="sm" onClick={offer.install}>
            {t.install.install}
          </Button>
        )}
        {cloudAvailable && (
          <Button size="sm" variant={offer.canInstall ? "ghost" : "primary"} onClick={createAccount}>
            {t.install.createAccount}
          </Button>
        )}
      </>
    );
  }

  const title = kind === "cloud" ? t.install.cloudTitle : t.install.title;
  const body = kind === "cloud" ? t.install.cloudBody : offer.ios ? t.install.bodyIos : t.install.body;

  return (
    <>
      <section aria-labelledby="install-nudge-title" className="relative rounded-3xl border border-border bg-card p-4 pr-12 shadow-soft animate-fade-in">
        <button
          type="button"
          onClick={snooze}
          aria-label={t.install.later}
          className="absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary" aria-hidden>
            {kind === "cloud" ? <Smartphone className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <h2 id="install-nudge-title" className="font-semibold">
              {title}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{body}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 pl-[52px]">{actions}</div>
      </section>
      <InstallGuideSheet open={offer.guideOpen} onClose={offer.closeGuide} />
    </>
  );
}
