import type { ComponentTagRepository } from "@/lib/repositories/contracts";
import { componentNames } from "@/lib/metadata-values";

const KEY = "lc-library.phase1.component-tags";
const EVENT = "lc-component-tags-changed";
const empty: string[] = [];
let cachedRaw: string | null | undefined;
let cachedNames = empty;
function snapshot() {
  const raw = window.localStorage.getItem(KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try { cachedNames = componentNames(JSON.parse(raw ?? "[]")); } catch { cachedNames = empty; }
  }
  return cachedNames;
}
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(EVENT, listener);
  return () => { window.removeEventListener("storage", listener); window.removeEventListener(EVENT, listener); };
}
export function registerComponentTag(name: string) {
  const trimmed = name.trim();
  if (!trimmed || trimmed.includes(",")) throw new Error("Enter a component name without commas.");
  const stored: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
  if (!Array.isArray(stored)) throw new Error("The component tag inventory could not be read safely.");
  const existing = componentNames(stored).find(item => item.toLocaleLowerCase() === trimmed.toLocaleLowerCase());
  if (existing) return existing;
  window.localStorage.setItem(KEY, JSON.stringify([...stored, trimmed]));
  window.dispatchEvent(new Event(EVENT));
  return trimmed;
}

export const localComponentTags: ComponentTagRepository = { subscribe, getSnapshot: snapshot, getServerSnapshot: () => empty, register: registerComponentTag };
