import type { Flow, Screen, ScreenGroup } from "@/types/design-library";
import { activeTreeGroups } from "@/lib/flow-context";
import { groupParent, groupUnitId, orderedGroups } from "@/lib/screen-groups";
import { resolveScreenPreview, screenPlatformHref } from "@/lib/screen-platform";

export function businessUnitHighlights(unitId: string, screens: Screen[], groups: ScreenGroup[], flows: Flow[]) {
  const unitGroups = activeTreeGroups(groups, flows).filter(group => groupUnitId(group) === unitId);
  const seen = new Set<string>();
  const candidates = screens.filter(screen => screen.businessUnitId === unitId).sort((a, b) => a.sequence - b.sequence).flatMap(screen => {
    if (seen.has(screen.id)) return [];
    seen.add(screen.id);
    const mobile = resolveScreenPreview(screen, "mobile");
    const preview = mobile || resolveScreenPreview(screen, "web");
    const platform = mobile || !preview ? "mobile" : "web";
    return [{ id: screen.id, name: screen.name, preview: preview?.trim() || undefined, href: screenPlatformHref(screen, platform) }];
  });
  const realPreviews = candidates.filter(item => item.preview);
  // Fill a sparse strip with existing canonical screens, never fabricated records.
  const previews = [...realPreviews, ...candidates.filter(item => !item.preview).slice(0, Math.max(0, 4 - realPreviews.length))];
  return { previews, categories: orderedGroups(unitGroups).filter(group => !groupParent(group, unitGroups)).slice(0, 4) };
}

export const nextHighlight = (index: number, count: number, direction = 1) => count ? (index + direction + count) % count : 0;
