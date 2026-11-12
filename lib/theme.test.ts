import { describe, expect, it } from "vitest";
import { applyTheme, parsePref, resolveMode, themeBootScript } from "./theme";

describe("theme preference", () => {
  it("defaults to dark for missing or unknown values", () => {
    expect(parsePref(null)).toBe("dark");
    expect(parsePref("blue")).toBe("dark");
    expect(parsePref("light")).toBe("light");
    expect(parsePref("system")).toBe("system");
  });

  it("follows the OS only for system", () => {
    expect(resolveMode("system", true)).toBe("light");
    expect(resolveMode("system", false)).toBe("dark");
    expect(resolveMode("light", false)).toBe("light");
    expect(resolveMode("dark", true)).toBe("dark");
  });

  it("sets data-mode only for light and leaves OBO pages untouched by the theme", () => {
    const attrs = new Map<string, string>();
    const root = {
      setAttribute: (k: string, v: string) => attrs.set(k, v),
      removeAttribute: (k: string) => attrs.delete(k),
      getAttribute: (k: string) => attrs.get(k) ?? null,
      hasAttribute: (k: string) => attrs.has(k),
    } as unknown as HTMLElement;
    applyTheme(root, "/ranking", "light");
    expect(root.getAttribute("data-theme")).toBe("abyss");
    expect(root.getAttribute("data-mode")).toBe("light");
    applyTheme(root, "/ranking", "dark");
    expect(root.hasAttribute("data-mode")).toBe(false);
    applyTheme(root, "/challenges/obo?id=1", "light");
    expect(root.hasAttribute("data-theme")).toBe(false);
    expect(root.hasAttribute("data-mode")).toBe(false);
  });

  it("boot script uses the same storage key and OBO paths", () => {
    expect(themeBootScript).toContain("diveon:theme");
    expect(themeBootScript).toContain("/challenges/obo");
    expect(themeBootScript).toContain("prefers-color-scheme: light");
  });
});
