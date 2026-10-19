import type { AccessSnapshot, Identity, IdentityProfileUpdate, IdentityProvider } from "@/lib/repositories/contracts";
const identity: Identity = { id: "local-user", displayName: "Local User", fullName: "Local User", initials: "LU", authorName: "Local User" };
const key = "lc-library-identity-profile-v1";
const event = "lc-library-identity-change";
let cachedRaw: string | null = null;
let cached: Identity = identity;
function current(): Identity {
  if (typeof window === "undefined") return identity;
  try {
    const raw = localStorage.getItem(key);
    if (raw === cachedRaw) return cached;
    const data = raw ? JSON.parse(raw) : {};
    const fields: Partial<IdentityProfileUpdate> = {};
    for (const field of ["displayName", "fullName", "email", "phone"] as const) {
      if (typeof data[field] === "string") fields[field] = data[field];
    }
    cachedRaw = raw;
    cached = { ...identity, ...fields };
    cached.initials = cached.displayName.trim().split(/\s+/).filter(Boolean).map(part => part[0]).slice(0, 2).join("").toUpperCase() || identity.initials;
    return cached;
  } catch { return cached; }
}
// Local demo session is memory-only. Never remove the saved profile or Library data.
let sessionState: AccessSnapshot | undefined;
const sessionListeners = new Set<() => void>();
function localSessionSnapshot(): AccessSnapshot {
  if (!sessionState) sessionState = typeof window !== "undefined" && ["/login", "/auth"].includes(window.location.pathname)
    ? { status: "unauthenticated" } : { status: "authenticated", access: "allowed" };
  return sessionState;
}
function publishSession(state: AccessSnapshot) {
  sessionState = state;
  sessionListeners.forEach(listener => listener());
}
export const localIdentity: IdentityProvider = {
  mode: "local",
  session: {
    getSnapshot: localSessionSnapshot,
    getServerSnapshot: () => ({ status: "checking" }),
    subscribe(listener) { sessionListeners.add(listener); return () => { sessionListeners.delete(listener); }; },
    async login() {
      publishSession({ status: "authenticating" });
      await new Promise(resolve => setTimeout(resolve, 500));
      publishSession({ status: "authenticated", access: "allowed" });
    },
  },
  logout() { publishSession({ status: "unauthenticated" }); },
  current,
  getServerSnapshot: () => identity,
  subscribe(listener) {
    const storage = (e: StorageEvent) => { if (e.key === key) listener(); };
    window.addEventListener(event, listener);
    window.addEventListener("storage", storage);
    return () => { window.removeEventListener(event, listener); window.removeEventListener("storage", storage); };
  },
  updateProfile(changes) {
    const displayName = changes.displayName.trim();
    if (!displayName) throw new Error("Display name is required.");
    const raw = localStorage.getItem(key);
    // Preserve unknown future fields; only the four editable fields are written.
    const previous = raw ? JSON.parse(raw) : {};
    const next = { ...previous, displayName, fullName: changes.fullName?.trim() ?? "", email: changes.email?.trim() ?? "", phone: changes.phone?.trim() ?? "" };
    localStorage.setItem(key, JSON.stringify(next));
    window.dispatchEvent(new Event(event));
  },
};
