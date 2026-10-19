export type FigmaIntegrationFailureCode =
  | "invalid"
  | "not_configured"
  | "no_access"
  | "not_found"
  | "rate_limited"
  | "api_unavailable"
  | "preview_unavailable";

export type FigmaIntegrationFailure = {
  code: FigmaIntegrationFailureCode;
  title: string;
  detail: string;
  retryAt?: number;
  rateLimit?: { retryAfter: string | null; planTier: string | null; type: string | null; upgradeLink: string | null };
};

const failureCopy: Record<FigmaIntegrationFailureCode, Omit<FigmaIntegrationFailure, "code">> = {
  invalid: { title: "Invalid link", detail: "Paste the exact URL of a Figma frame." },
  not_configured: { title: "Figma connection is not configured", detail: "Add FIGMA_ACCESS_TOKEN on the server and restart LC Design Library. Manual upload remains available." },
  no_access: { title: "No access", detail: "The configured Figma token cannot access this file or frame." },
  not_found: { title: "Frame not found", detail: "The linked frame may have been deleted, moved, or belongs to another file." },
  rate_limited: { title: "Figma rate limit reached", detail: "Try again in a moment. Your current LC version is unchanged." },
  api_unavailable: { title: "Figma API unavailable", detail: "Figma could not be reached or returned an invalid response. Try again." },
  preview_unavailable: { title: "Preview unavailable", detail: "The frame was found, but its PNG snapshot could not be loaded." },
};

function errorCode(cause: unknown): FigmaIntegrationFailureCode | undefined {
  if (!cause || typeof cause !== "object" || !("code" in cause)) return undefined;
  const code = (cause as { code?: unknown }).code;
  return typeof code === "string" && code in failureCopy ? code as FigmaIntegrationFailureCode : undefined;
}

export function figmaIntegrationFailure(cause: unknown): FigmaIntegrationFailure {
  const code = errorCode(cause);
  if (code) return { code, ...failureCopy[code], ...(cause && typeof cause === "object" && "rateLimit" in cause ? { rateLimit: cause.rateLimit as FigmaIntegrationFailure["rateLimit"] } : {}), ...(cause && typeof cause === "object" && "retryAt" in cause && typeof cause.retryAt === "number" ? { retryAt: cause.retryAt } : {}) };
  const detail = cause && typeof cause === "object" && "message" in cause && typeof (cause as { message?: unknown }).message === "string"
    ? (cause as { message: string }).message
    : "";
  if (/exact Figma|design\/frame link|node-id/i.test(detail)) return { code: "invalid", ...failureCopy.invalid };
  return { code: "api_unavailable", ...failureCopy.api_unavailable };
}
