import "server-only";
import { createFigmaApi, FigmaApiError, figmaIntegrationStatus } from "@/lib/server/figma-api-core";

function api() {
  return createFigmaApi(process.env.FIGMA_ACCESS_TOKEN);
}

export function getFigmaIntegrationStatus() {
  return figmaIntegrationStatus(process.env.FIGMA_ACCESS_TOKEN);
}

export async function verifyFigmaFrame(fileKey: string, nodeId: string) {
  return api().verifyFrame(fileKey, nodeId);
}

export async function exportFigmaFramePng(fileKey: string, nodeId: string) {
  return api().exportFramePng(fileKey, nodeId);
}

export function figmaErrorResponse(cause: unknown) {
  const error = cause instanceof FigmaApiError ? cause : new FigmaApiError("preview_unavailable", "Figma preview is currently unavailable.", 502);
  return Response.json({ code: error.code, message: error.message, retryAfterMs: error.retryAfterMs, rateLimit: error.rateLimit }, { status: error.status, headers: { "Cache-Control": "no-store", ...(error.retryAfterMs !== undefined ? { "Retry-After": String(Math.ceil(error.retryAfterMs / 1000)) } : {}) } });
}
