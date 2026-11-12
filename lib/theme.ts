// 화면 테마(설정 > 테마 및 외관). 기기마다 저장한다(localStorage). 저장값이 없으면 지금처럼 다크.
// html[data-theme="abyss"]는 그대로 두고, 라이트일 때만 data-mode="light"를 붙인다(app/globals.css).
export type ThemePref = "light" | "dark" | "system";
export type ThemeMode = "light" | "dark";

export const THEME_KEY = "diveon:theme";
export const THEME_EVENT = "diveon:theme-changed";
export const LIGHT_ONLY_PREFIXES = ["/test", "/challenges/obo"]; // OBO 화면(다른 팀원 담당)은 원래 라이트

export function parsePref(value: string | null | undefined): ThemePref {
  return value === "light" || value === "system" || value === "dark" ? value : "dark";
}

export function resolveMode(pref: ThemePref, systemPrefersLight: boolean): ThemeMode {
  if (pref === "system") return systemPrefersLight ? "light" : "dark";
  return pref;
}

export function readPref(): ThemePref {
  try { return parsePref(localStorage.getItem(THEME_KEY)); } catch { return "dark"; }
}

export function systemPrefersLight(): boolean {
  try { return window.matchMedia("(prefers-color-scheme: light)").matches; } catch { return false; }
}

// 경로에 맞춰 html 속성을 정한다. OBO 화면은 테마 속성을 지워 원래 라이트를 쓴다.
export function applyTheme(root: HTMLElement, pathname: string | null | undefined, mode: ThemeMode) {
  if (LIGHT_ONLY_PREFIXES.some((p) => pathname?.startsWith(p))) {
    root.removeAttribute("data-theme");
    root.removeAttribute("data-mode");
    return;
  }
  root.setAttribute("data-theme", "abyss");
  if (mode === "light") root.setAttribute("data-mode", "light");
  else root.removeAttribute("data-mode");
}

export function savePref(pref: ThemePref) {
  try { localStorage.setItem(THEME_KEY, pref); } catch { /* 저장이 막힌 브라우저: 이번 방문에만 적용 */ }
  window.dispatchEvent(new Event(THEME_EVENT));
}

// 첫 화면을 그리기 전에 실행하는 인라인 스크립트(app/layout.tsx). 위 함수들과 같은 규칙.
export const themeBootScript = `(function(){try{var r=document.documentElement,p=location.pathname;if(p.indexOf('/test')===0||p.indexOf('/challenges/obo')===0){r.removeAttribute('data-theme');r.removeAttribute('data-mode');return;}var t=null;try{t=localStorage.getItem('${THEME_KEY}');}catch(e){}var light=t==='light'||(t==='system'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches);if(light)r.setAttribute('data-mode','light');else r.removeAttribute('data-mode');}catch(e){}})();`;
