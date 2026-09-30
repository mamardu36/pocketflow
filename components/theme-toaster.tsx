"use client";

import { Toaster } from "sonner";
import { useApp } from "@/hooks/use-app";

export function ThemeToaster() {
  const theme = useApp().data.preferences.theme;
  return <Toaster position="top-center" theme={theme} richColors={false} closeButton toastOptions={{ className: "!rounded-2xl" }} />;
}
