import type { ScreenGroup } from "@/types/design-library";

export const groupUnitId = (group: ScreenGroup) => group.businessUnitId ?? group.id.split(".")[0];

// Bounded traversal: malformed legacy relationships never rewrite persisted data.
export function groupPath(group: ScreenGroup, groups: ScreenGroup[]): ScreenGroup[] | undefined {
  const path = [group];
  let current = group;
  while (current.parentGroupId) {
    const parent = groups.find((item) => item.id === current.parentGroupId);
    if (!parent || path.length >= 3 || path.some((item) => item.id === parent.id) || groupUnitId(parent) !== groupUnitId(group)) return undefined;
    path.unshift(parent);
    current = parent;
  }
  return path;
}

export function groupParent(group: ScreenGroup, groups: ScreenGroup[]) {
  return groupPath(group, groups)?.at(-2);
}

export function orderedGroups(groups: ScreenGroup[]) {
  const sorted = [...groups].sort((a, b) => a.sequence - b.sequence || a.name.localeCompare(b.name));
  return sorted.filter((group) => !groupParent(group, groups)).flatMap((group) => [group, ...sorted.filter((child) => groupParent(child, groups)?.id === group.id).flatMap((child) => [child, ...sorted.filter((leaf) => groupParent(leaf, groups)?.id === child.id)])]);
}

export function groupLabel(group: ScreenGroup, groups: ScreenGroup[]) {
  return (groupPath(group, groups) ?? [group]).map((item) => item.name).join(" › ");
}
