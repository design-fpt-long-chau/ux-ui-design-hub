import { parseFigmaFrame } from "@/lib/figma-source";
import type { FigmaIntegrationFailure, FigmaIntegrationFailureCode } from "@/lib/figma-integration-errors";
import type { FigmaIntegrationAdapter } from "@/lib/repositories/contracts";
import type { FigmaFrameIdentity, FigmaResolvedFrame } from "@/types/design-library";

type ApiError = { code?: string; message?: string; retryAfterMs?: number; rateLimit?: FigmaIntegrationFailure["rateLimit"] };

function integrationError(code: FigmaIntegrationFailureCode, message: string) {
  return Object.assign(new Error(message), { code });
}

async function responseError(response: Response) {
  const body = await response.json().catch(() => ({})) as ApiError;
  if (response.status === 429) return Object.assign(integrationError("rate_limited", "Figma is temporarily rate limited"), { retryAfterMs: body.retryAfterMs, rateLimit: body.rateLimit });
  switch (body.code) {
    case "invalid": return integrationError("invalid", "Invalid Figma frame identity.");
    case "not_configured": return integrationError("not_configured", "Figma connection is not configured");
    case "no_access": return integrationError("no_access", "No access to this Figma frame.");
    case "not_found": return integrationError("not_found", "The exact Figma frame was not found.");
    case "rate_limited": return integrationError("rate_limited", "Figma API rate limit reached.");
    case "api_unavailable": return integrationError("api_unavailable", "Figma API is unavailable.");
    case "preview_unavailable": return integrationError("preview_unavailable", "The Figma preview is unavailable.");
    default: return integrationError("api_unavailable", "Figma API is unavailable.");
  }
}

// Source selection and update checks share the same server-side Figma quota.
// Keep cooldown transient; never write integration failures into Library data.
let rateLimit: { until: number; attempts: number; error: Error } | undefined;
async function request(url: string) {
  if (rateLimit && rateLimit.until > Date.now()) throw rateLimit.error;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const error = await responseError(response);
    if (error.code === "rate_limited") {
      const attempts = (rateLimit?.attempts ?? 0) + 1;
      const delay = "retryAfterMs" in error && typeof error.retryAfterMs === "number" && Number.isFinite(error.retryAfterMs)
        ? Math.max(0, error.retryAfterMs) : Math.min(300000, 5000 * 2 ** Math.min(attempts - 1, 6));
      const until = Date.now() + delay;
      rateLimit = { until, attempts, error: Object.assign(error, { retryAt: until }) };
    }
    throw error;
  }
  if (rateLimit && rateLimit.until <= Date.now()) rateLimit = undefined;
  return response;
}

async function previewDataUrl(response: Response) {
  const blob = await response.blob();
  if (blob.type !== "image/png" || !blob.size) throw integrationError("preview_unavailable", "The Figma preview is unavailable.");
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(integrationError("preview_unavailable", "The Figma preview is unavailable."));
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(integrationError("preview_unavailable", "The Figma preview is unavailable."));
    reader.readAsDataURL(blob);
  });
}

// Transient exact-frame cache: no Library persistence or cross-identity reuse.
const frameCache = new Map<string, { expires: number; value: Promise<unknown> }>();
function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  for (const [cachedKey, entry] of frameCache) {
    if (entry.expires <= Date.now()) frameCache.delete(cachedKey);
  }
  const hit = frameCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as Promise<T>;
  const value = load().catch(error => { if (frameCache.get(key)?.value === value) frameCache.delete(key); throw error; });
  frameCache.set(key, { expires: Date.now() + 300000, value });
  return value;
}

export const localFigmaIntegration: FigmaIntegrationAdapter = {
  parseFrameUrl: parseFigmaFrame,
  async resolveFrame(input: FigmaFrameIdentity) {
    const metadata = await cached(`node:${input.fileKey}:${input.nodeId}`, async () => {
    const query = new URLSearchParams({ fileKey: input.fileKey, nodeId: input.nodeId });
    const response = await request(`/api/figma/frame?${query}`);
    const metadata = await response.json() as Pick<FigmaResolvedFrame, "name" | "fileName" | "width" | "height" | "fingerprint">;
    return metadata;
    });
    // Cache frame metadata, never the caller's exact design-source URL.
    return { ...metadata, ...input };
  },
  async getPreview(frame) {
    return cached(`image:${frame.fileKey}:${frame.nodeId}:${frame.fingerprint}`, async () => {
    const query = new URLSearchParams({ fileKey: frame.fileKey, nodeId: frame.nodeId });
    const response = await request(`/api/figma/frame/preview?${query}`);
    return previewDataUrl(response);
    });
  },
  async checkForUpdate(source) {
    const input = parseFigmaFrame(source.url);
    const frame = await this.resolveFrame(input);
    const preview = await this.getPreview(frame);
    return {
      checkedAt: new Date().toISOString(),
      changed: frame.fingerprint !== source.lastSyncedFingerprint,
      frame: { ...frame, preview },
    };
  },
};
