import type { PreferenceStore } from "@/lib/repositories/contracts";
import { THEME_KEY, validTheme } from "@/lib/theme";
export const localPreferences: PreferenceStore = {
  readTheme() { try { return validTheme(localStorage.getItem(THEME_KEY)); } catch { return "system"; } },
  writeTheme(mode) { localStorage.setItem(THEME_KEY, mode); },
};
