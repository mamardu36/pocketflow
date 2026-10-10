"use client";

import { Check, FlaskConical } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { APP_CONFIG } from "@/config/app";
import { useApp, useMoney, useT } from "@/hooks/use-app";
import { localizeName } from "@/lib/i18n";
import { STORAGE_KEYS, safeGet } from "@/lib/storage/keys";

export function WelcomeScreen() {
  const t = useT();
  const router = useRouter();
  const { startGuest, startDemo } = useApp();
  const [busy, setBusy] = useState(false);

  // If this browser already holds guest data (e.g. after signing out), resume it instead of onboarding again.
  const getStarted = async () => {
    if (safeGet(STORAGE_KEYS.guestData)) {
      setBusy(true);
      await startGuest();
      router.replace("/");
    } else {
      router.push("/onboarding");
    }
  };

  const tryDemo = async () => {
    setBusy(true);
    await startDemo();
    router.replace("/");
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))]">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Logo className="h-8 w-8" />
        {APP_CONFIG.name}
      </div>

      <div className="flex flex-1 flex-col justify-center py-8 animate-fade-in">
        <AllocationPreview />
        <h1 className="mt-8 text-4xl font-semibold leading-tight tracking-tight">{t.welcome.title}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{t.welcome.tagline}</p>
        <ul className="mt-5 space-y-2 text-[15px]">
          {t.welcome.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2.5">
        <Button size="lg" className="w-full" onClick={getStarted} disabled={busy}>
          {t.welcome.getStarted}
        </Button>
        <Link href="/auth" className={buttonClasses("outline", "lg", "w-full")}>
          {t.welcome.haveAccount}
        </Link>
        <p className="pt-1 text-center text-xs text-muted-foreground">{t.welcome.noAccount}</p>
        <button
          type="button"
          onClick={tryDemo}
          disabled={busy}
          className="mx-auto flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <FlaskConical className="h-4 w-4" aria-hidden />
          {t.welcome.tryDemo}
        </button>
        <p className="text-center">
          <Link href="/privacy" className="text-xs text-muted-foreground underline-offset-2 hover:underline">
            {t.settings.privacy}
          </Link>
        </p>
      </div>
    </div>
  );
}

/** Decorative illustration of the core idea: one amount split into categories. */
function AllocationPreview() {
  const t = useT();
  const money = useMoney();
  const segments = [
    { w: "55%", c: "bg-slate-400 dark:bg-slate-500" },
    { w: "18%", c: "bg-emerald-500" },
    { w: "7%", c: "bg-amber-500" },
    { w: "5%", c: "bg-sky-500" },
    { w: "7%", c: "bg-teal-500" },
  ];
  return (
    <div aria-hidden className="rounded-4xl bg-hero p-5 text-hero-foreground shadow-lift">
      <p className="text-sm text-hero-muted">{t.dashboard.leftToAssign}</p>
      <p className="tabular mt-1 text-4xl font-semibold tracking-tight">{money(8000)}</p>
      <div className="mt-5 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-white/10">
        {segments.map((s, i) => (
          <span key={i} className={`${s.c} h-full`} style={{ width: s.w }} />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-hero-muted">
        <span>🏠 {localizeName("Rent", t)}</span>
        <span>🛒 {localizeName("Groceries", t)}</span>
        <span>🐷 {localizeName("Savings", t)}</span>
      </div>
    </div>
  );
}
