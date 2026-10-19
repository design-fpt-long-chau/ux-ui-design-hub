import { businessUnits as seeds } from "@/data/design-library";
import type { BusinessUnit } from "@/types/design-library";

// Additive storage only. Existing Library keys and seed identities are unchanged.
export const BUSINESS_UNITS_KEY = "lc-library.phase1.business-unit-overrides";
export const BUSINESS_UNITS_EVENT = "lc-library-inventory-change";
export type UnitState = { overrides: BusinessUnit[]; deletedIds: string[] };
let rawCache: string | null | undefined;
let cache: BusinessUnit[] = seeds;
export function readUnitState(): UnitState {
  const raw = typeof window === "undefined" ? null : window.localStorage.getItem(BUSINESS_UNITS_KEY);
  if (!raw) return { overrides: [], deletedIds: [] };
  const value = JSON.parse(raw);
  if (!value || !Array.isArray(value.overrides) || !Array.isArray(value.deletedIds)) throw new Error("Product data is unreadable. No changes were made.");
  return value;
}
export function getBusinessUnits(): BusinessUnit[] {
  if (typeof window === "undefined") return seeds;
  const raw = window.localStorage.getItem(BUSINESS_UNITS_KEY);
  if (raw === rawCache) return cache;
  const state = readUnitState();
  cache = [...new Map([...seeds, ...state.overrides].map(unit => [unit.id, unit])).values()].filter(unit => !state.deletedIds.includes(unit.id));
  rawCache = raw;
  return cache;
}
export function validateProductName(name: string, id?: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Enter a product name.");
  if (trimmed.length > 80) throw new Error("Product name must be 80 characters or fewer.");
  if (getBusinessUnits().some(unit => unit.id !== id && unit.name.trim().toLocaleLowerCase() === trimmed.toLocaleLowerCase())) throw new Error("This product already exists.");
  return trimmed;
}
export { seeds as seededBusinessUnits };
