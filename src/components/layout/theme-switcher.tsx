"use client";
import { repositories } from "@/lib/repositories/provider";
import { Check, ChevronDown, Moon, Sun } from "lucide-react";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { THEME_EVENT, THEME_KEY, themeModes, validTheme, resolvedTheme, type ThemeMode } from "@/lib/theme";

const readSaved = repositories.preferences.readTheme;
function apply(mode: ThemeMode) {
  document.documentElement.dataset.themeMode = mode;
  document.documentElement.dataset.theme = resolvedTheme(mode, matchMedia("(prefers-color-scheme: dark)").matches);
  window.dispatchEvent(new Event(THEME_EVENT));
}
const snapshot = () => validTheme(document.documentElement.dataset.themeMode);
const serverSnapshot = () => "system" as const;
function subscribe(callback: () => void) { window.addEventListener(THEME_EVENT, callback); return () => window.removeEventListener(THEME_EVENT, callback); }
export function ThemeObserver() {
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const osChange = () => { if (snapshot() === "system") apply("system"); };
    const storageChange = (event: StorageEvent) => { if (event.key === THEME_KEY || event.key === null) apply(readSaved()); };
    media.addEventListener("change", osChange);
    window.addEventListener("storage", storageChange);
    // Bootstrap already applied the preference before hydration.
    return () => { media.removeEventListener("change", osChange); window.removeEventListener("storage", storageChange); };
  }, []);
  return null;
}
export function ThemeSwitcher({ collapsed = false, align = "start" }: { collapsed?: boolean; align?: "start" | "end" }) {
  const mode = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const options = useRef<Array<HTMLButtonElement | null>>([]);
  const id = useId();
  useEffect(() => { if (open) options.current[themeModes.indexOf(mode)]?.focus(); }, [open, mode]);
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  const choose = (next: ThemeMode) => {
    apply(next);
    try { repositories.preferences.writeTheme(next); setError(""); setOpen(false); trigger.current?.focus(); }
    catch { setError("Theme applied for this session. Browser storage could not save it."); }
  };
  return <div ref={root} data-drop-exclusion className="relative shrink-0" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
    <button ref={trigger} type="button" aria-label="Theme" title="Theme" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(value => !value)} onKeyDown={event => { if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); } }} className={`${collapsed ? "w-9 px-0" : "px-2.5"} inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white text-slate-600 transition-colors motion-duration-fast motion-ease hover:border-slate-300 hover:bg-slate-100 focus-visible:bg-slate-100`}><Sun aria-hidden size={17} className="theme-sun"/><Moon aria-hidden size={17} className="theme-moon"/>{!collapsed && <><span className="text-xs font-medium">Theme</span><ChevronDown aria-hidden size={12}/></>}</button>
    {open && <div id={id} role="menu" aria-label="Color theme" className={`motion-popover absolute ${align === "end" ? "right-0" : "left-0"} bottom-full z-[100] mb-2 w-40 rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl`} onKeyDown={event => {
      const index = options.current.findIndex(option => option === document.activeElement);
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) { event.preventDefault(); const next = event.key === "Home" ? 0 : event.key === "End" ? 2 : (index + (event.key === "ArrowDown" ? 1 : -1) + 3) % 3; options.current[next]?.focus(); }
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
    }}>
      {themeModes.map((value,index) => <button ref={node => { options.current[index] = node; }} key={value} role="menuitemradio" aria-checked={mode === value} type="button" onClick={() => choose(value)} className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 focus-visible:bg-blue-50"><span>{value[0].toUpperCase() + value.slice(1)}</span>{mode === value && <Check aria-hidden size={14}/>}</button>)}
      {error && <p role="alert" className="p-2 text-xs text-red-600">{error}</p>}
    </div>}
  </div>;
}
