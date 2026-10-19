import type { AccessSnapshot, IdentityProvider } from "@/lib/repositories/contracts";

const local: AccessSnapshot = { status: "authenticated", access: "allowed" };
const failure: AccessSnapshot = { status: "error" };
const checking: AccessSnapshot = { status: "checking" };
const entry: AccessSnapshot = { status: "unauthenticated" };
const pending: AccessSnapshot = { status: "authenticating" };

/** Allow only Library destinations; do not reflect OAuth callbacks or arbitrary URLs. */
export function safeReturnPath(value: string | null | undefined): string {
  if (!value || value.length > 2048 || /[\\\s\u0000-\u001f]/.test(value) || !value.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const url = new URL(value, "https://library.invalid");
    if (url.origin !== "https://library.invalid" || /%2f|%5c|%2e/i.test(url.pathname) || !/^\/(?:$|screens(?:\/[^/]+){0,3}\/?$|flows(?:\/[^/]+)?\/?$|manage\/screens\/(?:new|[^/]+\/edit)\/?$|profile\/?$|settings\/?$|components\/?$)/.test(url.pathname)) return "/";
    const query = new URLSearchParams();
    for (const key of ["view", "platform", "businessUnitId", "screenGroupId", "flowId", "status", "q"]) {
      const item = url.searchParams.get(key);
      if (item && item.length <= 256 && !/[\u0000-\u001f]/.test(item)) query.set(key, item);
    }
    return url.pathname + (query.size ? `?${query}` : "");
  } catch { return "/"; }
}

/** In-memory UI orchestration. No token, identity or browser persistence writes. */
export function createAccessController(provider: IdentityProvider) {
  let override: AccessSnapshot | undefined;
  let operation: Promise<void> | undefined;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach(listener => listener());
  const company = provider.mode === "company";
  const sessionEnabled = company || (provider.mode === "local" && Boolean(provider.session));
  const read = (): AccessSnapshot => {
    if (!sessionEnabled) return local;
    if (override) return override;
    try {
      if (!provider.session || !provider.logout) return failure;
      const snapshot = provider.session.getSnapshot();
      if (!snapshot || !["checking", "unauthenticated", "authenticating", "expired", "error", "authenticated"].includes(snapshot.status)) return failure;
      if (snapshot.status === "authenticated" && (!["allowed", "denied"].includes(snapshot.access) || !provider.current().id)) return failure;
      return snapshot;
    } catch { return failure; }
  };
  const run = (action: () => void | Promise<void>, logout: boolean) => {
    if (operation) return operation;
    override = pending; emit();
    operation = Promise.resolve().then(action).then(() => {
      override = logout ? entry : undefined;
      if (!logout && ["unauthenticated", "checking"].includes(read().status)) override = failure;
    }).catch(() => { override = failure; }).finally(() => { operation = undefined; emit(); });
    return operation;
  };
  return {
    company,
    getSnapshot: read,
    // Never server-render company Library content without a verified session.
    getServerSnapshot: () => sessionEnabled ? checking : local,
    subscribe(listener: () => void) {
      listeners.add(listener);
      let unsubscribe: (() => void) | undefined;
      try {
        if (sessionEnabled) unsubscribe = provider.session?.subscribe(() => {
          if (!operation) override = undefined;
          emit();
        });
      } catch { override = failure; listener(); }
      return () => { listeners.delete(listener); unsubscribe?.(); };
    },
    login(returnTo: string) {
      if (!sessionEnabled) return Promise.resolve();
      return run(() => {
        if (!provider.session || !provider.logout) throw new Error("Adapter unavailable");
        return provider.session.login({ returnTo: safeReturnPath(returnTo) });
      }, false);
    },
    logout() {
      if (!sessionEnabled) return Promise.resolve(provider.logout?.());
      return run(() => {
        if (!provider.logout) throw new Error("Adapter unavailable");
        return provider.logout();
      }, true);
    },
    backToEntry() { if (!operation) { override = entry; emit(); } },
  };
}
