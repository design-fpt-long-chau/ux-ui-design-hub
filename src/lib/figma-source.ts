import type { FigmaIntegrationAdapter } from "@/lib/repositories/contracts";
import type { FigmaFrameIdentity } from "@/types/design-library";

export function parseFigmaFrame(value: string) {
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new Error("Paste an exact Figma frame URL."); }
  const parts = url.pathname.split("/");
  const nodeId = url.searchParams.get("node-id")?.replace(/-/g, ":");
  if (url.protocol !== "https:" || !["figma.com", "www.figma.com"].includes(url.hostname) || url.username || url.password || !["design", "file"].includes(parts[1]) || !/^[a-zA-Z0-9]+$/.test(parts[2] ?? "") || !/^\d+:\d+$/.test(nodeId ?? "")) throw new Error("Use a Figma design/frame link with a node-id.");
  return { fileKey: parts[2], nodeId: nodeId!, url: value.trim() } satisfies FigmaFrameIdentity;
}

export async function resolveFigmaFrame(value: string, adapter?: FigmaIntegrationAdapter) {
  const input = adapter?.parseFrameUrl(value) ?? parseFigmaFrame(value);
  if (!adapter) throw new Error("Figma is not connected. Use manual upload, or connect a Figma adapter to resolve this frame.");
  const result = await adapter.resolveFrame(input);
  const preview = await adapter.getPreview(result);
  if (result.fileKey !== input.fileKey || result.nodeId !== input.nodeId || !result.name?.trim() || !result.fingerprint?.trim() || !/^data:image\/(png|jpeg|webp);base64,/.test(preview) || !(result.width > 0 && result.height > 0)) throw new Error("The adapter could not resolve this frame to a durable image snapshot.");
  const checkedAt = new Date().toISOString();
  return { ...result, preview, source: { ...input, name: result.name, resolvedAt: checkedAt, lastCheckedAt: checkedAt, lastSyncedAt: checkedAt, lastSyncedFingerprint: result.fingerprint } };
}

// Validate without rewriting persisted frame selection or query parameters.
export function figmaLink(source?: { url?: string; fileKey?: string; nodeId?: string }) {
  const stored = source?.url;
  const url = stored || (source?.fileKey && source?.nodeId ? `https://www.figma.com/design/${source.fileKey}?node-id=${encodeURIComponent(source.nodeId)}` : undefined);
  if (!url) return { error: "No Figma source linked" };
  try { parseFigmaFrame(url); return { href: url }; }
  catch { return { error: "Invalid Figma source link. Confirm a valid frame link in Edit Screen." }; }
}
