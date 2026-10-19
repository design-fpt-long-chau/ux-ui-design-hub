import type { BusinessUnit, Flow, Screen, ScreenGroup } from "@/types/design-library";
import { groupLabel, groupUnitId } from "@/lib/screen-groups";

export const legacyAuthGroupId = "pharmacy.app-entry";
export const currentLoginGroupId = "pharmacy.registration-login.login";
export const legacyLoginFlowId = "pharmacy.authentication";
const loginDefaultFlowId = `${currentLoginGroupId}.default-flow`;

// URL compatibility only; persisted records are never rewritten on read.
export function currentAuthGroupId(id: string) {
  return id === legacyAuthGroupId ? currentLoginGroupId : id;
}

export function reassociateLegacyAuthScreens(screens: Screen[], flows: Flow[]) {
  return screens.map(screen => {
    if (screen.businessUnitId !== "pharmacy" || ![legacyAuthGroupId, legacyLoginFlowId].includes(screen.screenGroupId)) return screen;
    const owners = [...new Set(flows.filter(flow => flow.screenIds.includes(screen.id) || screen.screenGroupId === flow.id).map(flowOwnerGroupId))];
    if (owners.length !== 1 || ![currentLoginGroupId, "pharmacy.registration-login.registration"].includes(owners[0])) {
      throw new Error(`Auth mapping required for Screen ${screen.id} (${screen.name}). No data has been changed.`);
    }
    return { ...screen, screenGroupId: owners[0] };
  });
}

export function resolveFlowId(id: string, flows: Flow[]) {
  return id === loginDefaultFlowId && flows.some((flow) => flow.id === legacyLoginFlowId) ? legacyLoginFlowId : id;
}

export function resolveFlowSlug(slug: string, flows: Flow[]) {
  return flows.find((flow) => flow.slug === slug) ?? (slug === "login-default-flow" ? flows.find((flow) => flow.id === legacyLoginFlowId) : undefined);
}

// Consolidate presentation only. Both persisted definitions remain untouched.
// The original journey keeps its ID, metadata and order; distinct default-only
// references follow it. Missing Screen IDs are retained for future HOME data.
export function consolidateLoginFlow(flows: Flow[], screens: Screen[]) {
  const legacy = flows.find((flow) => flow.id === legacyLoginFlowId);
  if (!legacy) return flows;
  const placeholder = flows.find((flow) => flow.id === loginDefaultFlowId);
  const ids = [...legacy.screenIds, ...screensForFlow(legacy, screens).map((screen) => screen.id),
    ...(placeholder?.screenIds ?? []), ...(placeholder ? screensForFlow(placeholder, screens).map((screen) => screen.id) : [])];
  const merged = { ...placeholder, ...legacy, name: legacy.name === "Đăng nhập Nhà thuốc" ? "Luồng default" : legacy.name, screenGroupId: currentLoginGroupId, parentGroupId: currentLoginGroupId, screenIds: [...new Set(ids)] };
  const result = flows.filter((flow) => flow.id !== legacyLoginFlowId && flow.id !== loginDefaultFlowId);
  result.splice(flows.findIndex((flow) => flow.id === (placeholder ? loginDefaultFlowId : legacyLoginFlowId)), 0, merged);
  return result;
}

// Keep legacy records and Screen routes intact. Only active Tree ownership is
// redirected; the original group remains available to persisted records.
export function activeTreeGroups(groups: ScreenGroup[], flows: Flow[]) {
  const hasCurrentAuth = groups.some((group) => group.id === currentLoginGroupId);
  const ambiguous = groups.find(group => group.parentGroupId === legacyAuthGroupId);
  if (ambiguous) throw new Error(`Auth mapping required for Group ${ambiguous.id} (${ambiguous.name}). No data has been changed.`);
  return groups.filter((group) => !isFlowCompatibilityGroup(group, flows) && !(hasCurrentAuth && group.id === legacyAuthGroupId));
}

// A read-only projection: legacy group-owned screens get a journey without
// changing their IDs, records, or persisted Flow membership. All consumers use
// the same projection, including Tree, Gallery, Full Flow and Add Screen.
export function withDefaultFlows(flows: Flow[], groups: ScreenGroup[], screens: Screen[]) {
  const result = [...flows];
  const assigned = new Set(flows.flatMap((flow) => screensForFlow(flow, screens).map((screen) => screen.id)));
  for (const group of groups) {
    if (isFlowCompatibilityGroup(group, flows)) continue;
    const unitId = groupUnitId(group);
    const orphans = screens.filter((screen) => screen.businessUnitId === unitId && screen.screenGroupId === group.id && !assigned.has(screen.id))
      .sort((a, b) => a.sequence - b.sequence);
    if (!orphans.length) continue;
    const existing = result.findIndex((flow) => flow.businessUnitId === unitId && flowOwnerGroupId(flow) === group.id && flow.name === "Luồng default");
    if (existing >= 0) {
      const current = result[existing];
      const legacyIds = screensForFlow(current, screens).map((screen) => screen.id).filter((id) => !current.screenIds.includes(id));
      result[existing] = { ...current, screenIds: [...current.screenIds, ...legacyIds, ...orphans.map((screen) => screen.id)] };
    } else {
      const stem = `${group.id}.default-flow`;
      let id = stem;
      let suffix = 2;
      while (result.some((flow) => flow.id === id)) id = `${stem}-${suffix++}`;
      const routeStem = `default-${group.id}`;
      let slug = routeStem;
      suffix = 2;
      while (result.some((flow) => flow.slug === slug)) slug = `${routeStem}-${suffix++}`;
      result.push({ id, slug, name: "Luồng default", description: "", businessUnitId: unitId, screenGroupId: group.id, parentGroupId: group.id, status: "active", screenIds: orphans.map((screen) => screen.id) });
    }
    for (const screen of orphans) assigned.add(screen.id);
  }
  return result;
}

export function flowOwnerGroupId(flow: Flow) {
  const owner = flow.parentGroupId ?? flow.screenGroupId;
  if (flow.businessUnitId === "pharmacy" && owner === legacyAuthGroupId) {
    if (flow.id !== legacyLoginFlowId) throw new Error(`Auth mapping required for Flow ${flow.id} (${flow.name}). No data has been changed.`);
    return currentLoginGroupId;
  }
  return owner;
}

export function flowsForGroup(flows: Flow[], businessUnitId: string, groupId: string) {
  return orderedFlows(flows.filter((flow) => flow.businessUnitId === businessUnitId && flowOwnerGroupId(flow) === groupId));
}

export function orderedFlows(flows: Flow[]) {
  return flows
    .map((flow, index) => ({ flow, index }))
    .sort((a, b) => (a.flow.sequence ?? a.index + 1) - (b.flow.sequence ?? b.index + 1) || a.index - b.index)
    .map(({ flow }) => flow);
}

export function screensInGroup(group: ScreenGroup, flows: Flow[], screens: Screen[]) {
  const owned = flowsForGroup(flows, groupUnitId(group), group.id).flatMap((flow) => screensForFlow(flow, screens));
  const direct = screens.filter((screen) => screen.businessUnitId === groupUnitId(group) && screen.screenGroupId === group.id);
  return [...new Map([...owned, ...direct].map((screen) => [screen.id, screen])).values()];
}

export function isFlowCompatibilityGroup(group: ScreenGroup, flows: Flow[]) {
  return (group.id === loginDefaultFlowId && flows.some((flow) => flow.id === legacyLoginFlowId)) || flows.some((flow) => Boolean(flow.parentGroupId) && flow.id === group.id);
}

export function flowLocation(flow: Flow, units: BusinessUnit[], groups: ScreenGroup[]) {
  const unit = units.find((item) => item.id === flow.businessUnitId);
  const section = groups.find((item) => item.id === flowOwnerGroupId(flow));
  const unitName = unit?.name ?? "Not assigned";
  const sectionName = section?.name ?? "Not assigned";
  const sectionPath = section ? groupLabel(section, groups) : sectionName;
  return {
    unitName,
    sectionName,
    sectionPath,
    breadcrumb: [unitName, sectionPath, flow.name].join(" / "),
  };
}

export function matchesFlowSearch(flow: Flow, query: string, units: BusinessUnit[], groups: ScreenGroup[]) {
  const location = flowLocation(flow, units, groups);
  const normalized = query.trim().toLocaleLowerCase();
  return !normalized || [flow.name, location.unitName, location.sectionName, location.sectionPath].some((value) => value.toLocaleLowerCase().includes(normalized));
}

// Screens published by current code are ordered by screenIds. Older records that
// used a Flow ID as screenGroupId remain visible without rewriting browser data.
export function screensForFlow(flow: Flow, screens: Screen[]) {
  const ordered = [...new Set(flow.screenIds)].map((id) => screens.find((screen) => screen.id === id)).filter((screen): screen is Screen => Boolean(screen));
  const legacy = screens.filter((screen) => screen.screenGroupId === flow.id && !flow.screenIds.includes(screen.id)).sort((a, b) => a.sequence - b.sequence);
  return [...ordered, ...legacy];
}
