"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// OBO 전용 화면(/test, /challenges/obo)은 라이트 그대로, 나머지는 Abyss 테마.
const LIGHT_PREFIXES = ["/test", "/challenges/obo"];

export default function ThemeScope() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const isLight = LIGHT_PREFIXES.some((p) => pathname?.startsWith(p));
    if (isLight) root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", "abyss");
  }, [pathname]);

  return null;
}
