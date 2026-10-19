import type { Identity, IdentityProvider, AccessSnapshot } from "@/lib/repositories/contracts";
const unavailable: AccessSnapshot = { status: "error" };
const unknown: Identity = { id: "", displayName: "", initials: "?", authorName: "" };
// Fail closed until FPT supplies a real adapter. No mock login or fake session.
export const unconfiguredIdentity: IdentityProvider = {
  mode: "company",
  current: () => unknown,
  session: {
    getSnapshot: () => unavailable,
    getServerSnapshot: () => unavailable,
    subscribe: () => () => {},
    login: () => { throw new Error("Company adapter not configured"); },
  },
  logout: () => { throw new Error("Company adapter not configured"); },
};
