const FIGMA_API = "https://api.figma.com/v1";

export type FigmaApiErrorCode =
  | "invalid"
  | "not_configured"
  | "no_access"
  | "not_found"
  | "rate_limited"
  | "api_unavailable"
  | "preview_unavailable";

export class FigmaApiError extends Error {
  constructor(public code: FigmaApiErrorCode, message: string, public status: number, public retryAfterMs?: number, public rateLimit?: { retryAfter: string | null; planTier: string | null; type: string | null; upgradeLink: string | null }) {
    super(message);
  }
}

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validateIdentity(fileKey: string, nodeId: string) {
  if (!/^[a-zA-Z0-9]+$/.test(fileKey) || !/^\d+:\d+$/.test(nodeId)) {
    throw new FigmaApiError("invalid", "Invalid Figma frame identity.", 400);
  }
}

export function figmaIntegrationStatus(accessToken: string | undefined) {
  return accessToken?.trim() ? "CONFIGURED" as const : "NOT CONFIGURED" as const;
}

function accessHeaders(accessToken: string | undefined) {
  const token = accessToken?.trim();
  if (!token) {
    throw new FigmaApiError("not_configured", "Figma connection is not configured", 503);
  }
  return new Headers({ "X-Figma-Token": token });
}

async function requestJson(path: string, accessToken: string | undefined, fetcher: Fetcher) {
  const headers = accessHeaders(accessToken);
  let response: Response;
  try {
    response = await fetcher(`${FIGMA_API}${path}`, { headers, cache: "no-store" });
  } catch {
    throw new FigmaApiError("api_unavailable", "Figma API is unavailable.", 502);
  }

  if (response.status === 401 || response.status === 403) {
    throw new FigmaApiError("no_access", "No access to this Figma file.", response.status);
  }
  if (response.status === 404) {
    throw new FigmaApiError("not_found", "The Figma file or frame was not found.", 404);
  }
  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After");
    const seconds = retryAfter === null ? NaN : Number(retryAfter);
    const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter ?? "") - Date.now();
    throw new FigmaApiError("rate_limited", "Figma API rate limit reached.", 429, Number.isFinite(delay) ? Math.max(0, delay) : undefined, { retryAfter, planTier: response.headers.get("X-Figma-Plan-Tier"), type: response.headers.get("X-Figma-Rate-Limit-Type"), upgradeLink: response.headers.get("X-Figma-Upgrade-Link") });
  }
  if (!response.ok) {
    throw new FigmaApiError("api_unavailable", "Figma API is unavailable.", 502);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new FigmaApiError("api_unavailable", "Figma returned an invalid response.", 502);
  }
  if (!isRecord(data)) {
    throw new FigmaApiError("api_unavailable", "Figma returned an invalid response.", 502);
  }
  return data;
}

export function createFigmaApi(accessToken: string | undefined, fetcher: Fetcher = fetch) {
  return {
    status: () => figmaIntegrationStatus(accessToken),
    async verifyFrame(fileKey: string, nodeId: string) {
      validateIdentity(fileKey, nodeId);
      const data = await requestJson(`/files/${encodeURIComponent(fileKey)}/nodes?ids=${encodeURIComponent(nodeId)}&depth=1`, accessToken, fetcher);
      if (!isRecord(data.nodes)) {
        throw new FigmaApiError("api_unavailable", "Figma returned an invalid nodes response.", 502);
      }
      if (!Object.hasOwn(data.nodes, nodeId)) {
        throw new FigmaApiError("api_unavailable", "Figma omitted the requested node.", 502);
      }
      const entry = data.nodes[nodeId];
      if (entry === null) {
        throw new FigmaApiError("not_found", "The exact Figma frame was not found.", 404);
      }
      if (!isRecord(entry) || !isRecord(entry.document)) {
        throw new FigmaApiError("api_unavailable", "Figma returned an invalid node response.", 502);
      }
      const node = entry.document;
      if (node.id !== nodeId) {
        throw new FigmaApiError("not_found", "The exact Figma frame was not found.", 404);
      }
      const bounds = isRecord(node.absoluteBoundingBox) ? node.absoluteBoundingBox : undefined;
      const width = typeof bounds?.width === "number" && bounds.width > 0 ? bounds.width : 1;
      const height = typeof bounds?.height === "number" && bounds.height > 0 ? bounds.height : 1;
      return {
        name: typeof node.name === "string" && node.name.trim() ? node.name.trim() : "Untitled frame",
        fileName: typeof data.name === "string" && data.name.trim() ? data.name.trim() : "Untitled Figma file",
        width,
        height,
        fingerprint: `figma:${String(data.version ?? data.lastModified ?? "current")}:${nodeId}`,
      };
    },
    async exportFramePng(fileKey: string, nodeId: string) {
      validateIdentity(fileKey, nodeId);
      const data = await requestJson(`/images/${encodeURIComponent(fileKey)}?ids=${encodeURIComponent(nodeId)}&format=png`, accessToken, fetcher);
      const imageUrl = isRecord(data.images) ? data.images[nodeId] : undefined;
      if (typeof imageUrl !== "string" || !imageUrl.startsWith("https://")) {
        throw new FigmaApiError("preview_unavailable", "Figma did not return a rendered image for this frame.", 422);
      }
      let image: Response;
      try {
        image = await fetcher(imageUrl, { cache: "no-store" });
      } catch {
        throw new FigmaApiError("preview_unavailable", "The rendered Figma image could not be downloaded.", 502);
      }
      if (!image.ok || !image.body) {
        throw new FigmaApiError("preview_unavailable", "The rendered Figma image could not be downloaded.", 502);
      }
      const contentType = image.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
      if (contentType !== "image/png") {
        throw new FigmaApiError("preview_unavailable", "Figma returned an unsupported preview format.", 502);
      }
      return image;
    },
  };
}
