// Disposable browser fixture. Never imported by the shipped composition root.
import type { AccessSnapshot, Identity, IdentityProvider } from "../../src/lib/repositories/contracts";
const user: Identity = { id: "qa-access-user", displayName: "QA Access User", initials: "QA", authorName: "QA Access User", email: "qa@example.test", title: "QA Reviewer" };
let state: AccessSnapshot = { status: "unauthenticated" };
let initialized = false;
let attempt = 0;
let scenario = "";
const listeners = new Set<() => void>();
const publish = (next: AccessSnapshot) => { state = next; listeners.forEach(listener => listener()); };
function snapshot(): AccessSnapshot {
  if (!initialized && typeof window !== "undefined") {
    initialized = true;
    scenario = new URL(window.location.href).searchParams.get("qaState") ?? "";
    if (scenario === "denied") state = { status: "authenticated", access: "denied" };
    if (scenario === "expired") state = { status: "expired" };
    if (scenario === "error") state = { status: "error" };
    if (scenario === "allowed") state = { status: "authenticated", access: "allowed" };
  }
  return state;
}
export const mockIdentity: IdentityProvider = {
  mode: "company", current: () => user, getServerSnapshot: () => user,
  subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); },
  session: {
    getSnapshot: snapshot, getServerSnapshot: () => ({ status: "checking" }),
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); },
    async login() {
      attempt++; publish({ status: "authenticating" });
      await new Promise(resolve => setTimeout(resolve, 1500));
      if (scenario === "reject" && attempt === 1) throw Error("test-only private error must not render");
      publish({ status: "authenticated", access: "allowed" });
    },
  },
  logout: () => publish({ status: "unauthenticated" }),
};
