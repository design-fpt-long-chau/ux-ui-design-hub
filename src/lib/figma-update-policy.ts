import type { FigmaIntegrationFailure } from "@/lib/figma-integration-errors";
import type { FigmaIntegrationAdapter } from "@/lib/repositories/contracts";
import type { FigmaSource, FigmaUpdateCheck } from "@/types/design-library";

export const FIGMA_CHECK_STALE_MS = 5 * 60 * 1000;

const cooldowns = new Map<string, { attempts: number; until: number; rateLimit?: FigmaIntegrationFailure["rateLimit"] }>();

const inFlightChecks = new Map<string, Promise<FigmaUpdateCheck>>();

export function isFigmaCheckStale(lastCheckedAt?: string, now = Date.now()) {
  if (!lastCheckedAt) return true;
  const checkedAt = new Date(lastCheckedAt).getTime();
  return Number.isNaN(checkedAt) || now - checkedAt >= FIGMA_CHECK_STALE_MS;
}

export function requestFigmaUpdateCheck(
  screenId: string,
  source: FigmaSource,
  adapter: FigmaIntegrationAdapter,
  persist: (screenId: string, source: FigmaSource, result: FigmaUpdateCheck) => void,
) {
  const existing = inFlightChecks.get(screenId);
  if (existing) return existing;

  const cooldown = cooldowns.get(screenId);
  if (cooldown && cooldown.until > Date.now()) return Promise.reject(Object.assign(new Error("Figma is temporarily rate limited"), { code: "rate_limited", retryAt: cooldown.until, rateLimit: cooldown.rateLimit }));
  const request = adapter.checkForUpdate(source)
    .catch((cause) => {
      if (cause && typeof cause === "object" && "code" in cause && cause.code === "rate_limited") {
        const attempts = (cooldown?.attempts ?? 0) + 1;
        const retryAfter = "retryAfterMs" in cause && typeof cause.retryAfterMs === "number" && Number.isFinite(cause.retryAfterMs) ? cause.retryAfterMs : undefined;
        const until = "retryAt" in cause && typeof cause.retryAt === "number" && Number.isFinite(cause.retryAt)
          ? cause.retryAt
          : Date.now() + (retryAfter !== undefined ? Math.max(0, retryAfter) : Math.min(300000, 5000 * 2 ** Math.min(attempts - 1, 6)));
        const rateLimit = "rateLimit" in cause ? cause.rateLimit as FigmaIntegrationFailure["rateLimit"] : undefined;
        cooldowns.set(screenId, { attempts, until, rateLimit });
        throw Object.assign(new Error("Figma is temporarily rate limited"), { code: "rate_limited", retryAt: until, rateLimit });
      }
      throw cause;
    })
    .then((result) => {
      cooldowns.delete(screenId);
      persist(screenId, source, result);
      return result;
    })
    .finally(() => {
      if (inFlightChecks.get(screenId) === request) inFlightChecks.delete(screenId);
    });

  inFlightChecks.set(screenId, request);
  return request;
}
