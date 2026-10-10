"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { APP_CONFIG } from "@/config/app";
import { useApp, useT } from "@/hooks/use-app";

export function PrivacyContent() {
  const t = useT();
  const { mode } = useApp();
  return (
    <article className="mx-auto max-w-2xl px-5 pb-16 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <Link
        href={mode ? "/settings" : "/welcome"}
        aria-label={t.common.back}
        className="-ml-2 grid h-11 w-11 place-items-center rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <div className="mt-4 flex items-center gap-2 text-sm font-semibold">
        <Logo className="h-7 w-7" />
        {APP_CONFIG.name}
      </div>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">{t.privacy.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t.privacy.updated}</p>
      <p className="mt-6 text-lg">{t.privacy.intro}</p>
      {t.privacy.sections.map((s) => (
        <section key={s.title} className="mt-7">
          <h2 className="text-base font-semibold">{s.title}</h2>
          <p className="mt-1.5 leading-relaxed text-muted-foreground">{s.body}</p>
        </section>
      ))}
      {APP_CONFIG.contactEmail && (
        <p className="mt-8 rounded-2xl bg-muted px-4 py-3">
          {t.privacy.contact("")}
          <a href={`mailto:${APP_CONFIG.contactEmail}`} className="font-medium text-primary underline-offset-2 hover:underline">
            {APP_CONFIG.contactEmail}
          </a>
        </p>
      )}
    </article>
  );
}
