"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { THEME_EVENT, THEME_KEY, applyTheme, readPref, resolveMode, systemPrefersLight } from "@/lib/theme";

// 클라이언트 이동·설정 변경·OS 테마 변경 때 html 속성을 다시 맞춘다(첫 화면은 layout의 인라인 스크립트가 맞춘다).
// OBO 전용 화면(/test, /challenges/obo)은 라이트 그대로, 나머지는 Abyss(다크) 또는 '해수면'(라이트).
export default function ThemeScope() {
  const pathname = usePathname();

  useEffect(() => {
    const apply = () => applyTheme(document.documentElement, pathname, resolveMode(readPref(), systemPrefersLight()));
    apply();
    const media = window.matchMedia?.("(prefers-color-scheme: light)");
    const onStorage = (e: StorageEvent) => { if (e.key === THEME_KEY) apply(); };
    window.addEventListener(THEME_EVENT, apply);
    window.addEventListener("storage", onStorage);
    media?.addEventListener?.("change", apply);
    return () => {
      window.removeEventListener(THEME_EVENT, apply);
      window.removeEventListener("storage", onStorage);
      media?.removeEventListener?.("change", apply);
    };
  }, [pathname]);

  return null;
}
