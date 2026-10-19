export type ThemeMode = "light" | "dark" | "system";
export const THEME_KEY = "lc-library.theme";
export const THEME_EVENT = "lc-library-theme-change";
export const themeModes: ThemeMode[] = ["light", "dark", "system"];
export function validTheme(value: unknown): ThemeMode { return value === "light" || value === "dark" ? value : "system"; }
export function resolvedTheme(mode: ThemeMode, systemDark: boolean) { return mode === "system" ? systemDark ? "dark" : "light" : mode; }
// Synchronous head bootstrap: runs before body content can paint, with no writes.
export const themeBootstrap = `(()=>{let m="system";try{const v=localStorage.getItem("${THEME_KEY}");if(v==="light"||v==="dark")m=v}catch{}const d=m==="dark"||(m==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";document.documentElement.dataset.themeMode=m})()`;
