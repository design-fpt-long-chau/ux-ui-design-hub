import { getBusinessUnits } from "@/lib/business-units";
import { consolidateLoginFlow, flowLocation, screensForFlow } from "@/lib/flow-context";
import { groupLabel } from "@/lib/screen-groups";
import { componentNames } from "@/lib/metadata-values";
import { flows as seededFlows, screenGroups as seededScreenGroups, screens } from "@/data/design-library";
import { screenHref } from "@/lib/design-library";
import type { BusinessUnit, Flow, PreviewStatus, Screen, ScreenGroup } from "@/types/design-library";

export type ScreenSearchResult = {
  id: string;
  name: string;
  context: string;
  href: string;
  screen?: Screen;
  status: PreviewStatus;
  kind: "screen" | "flow" | "product";
  score: number;
  matchedRepresentation?: string;
};

export function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim();
}

function matchScore(name: string, group: string, unit: string, metadata: string, query: string) {
  const normalizedName = normalizeSearch(name);
  if (normalizedName === query) return 0;
  if (normalizedName.startsWith(query)) return 10;
  if (normalizedName.includes(query)) return 20;
  if (normalizeSearch(group).includes(query)) return 30;
  if (normalizeSearch(unit).includes(query)) return 40;
  if (normalizeSearch(metadata).includes(query)) return 50;
  return null;
}

function representationMatch(screen: Screen, query: string) {
  return [...screen.variants, ...screen.states].find((option) => normalizeSearch(option.name).includes(query))?.name;
}

export function searchScreenInventory(
  rawQuery: string,
  inventory: Screen[] = screens,
  flowInventory: Flow[] = seededFlows,
  groups: ScreenGroup[] = seededScreenGroups,
  businessUnits: BusinessUnit[] = getBusinessUnits(),
): ScreenSearchResult[] {
  const query = normalizeSearch(rawQuery);
  if (!query) return [];

  const activeFlows = consolidateLoginFlow(flowInventory, inventory);
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const unitById = new Map(businessUnits.map((unit) => [unit.id, unit]));
  const ownersByScreen = new Map<string, Flow[]>();
  for (const flow of activeFlows) {
    for (const screen of screensForFlow(flow, inventory)) {
      if (flow.businessUnitId !== screen.businessUnitId) continue;
      const owners = ownersByScreen.get(screen.id) ?? [];
      owners.push(flow);
      ownersByScreen.set(screen.id, owners);
    }
  }
  const screenResults = inventory.flatMap((screen): ScreenSearchResult[] => {
    const owners = ownersByScreen.get(screen.id) ?? [];
    const structuralGroup = groupById.get(screen.screenGroupId);
    const group = owners.length ? owners.map(flow => `${flowLocation(flow, businessUnits, groups).sectionPath} › ${flow.name}`).join(" · ") : structuralGroup ? groupLabel(structuralGroup, groups) : screen.screenGroupId;
    const unit = unitById.get(screen.businessUnitId)?.name ?? screen.businessUnitId;
    const matchedRepresentation = representationMatch(screen, query);
    const searchableMetadata = [screen.id, screen.slug, screen.description, screen.whenItAppears, screen.purpose, screen.platforms.join(" "), componentNames(screen.components).join(" "), matchedRepresentation].filter(Boolean).join(" ");
    const score = matchScore(screen.name, group, unit, searchableMetadata, query);
    if (score === null) return [];
    return [{ id: screen.id, name: screen.name, context: `${unit} · ${group}`, href: screenHref(screen), screen, status: screen.status ?? "active", kind: "screen", score, matchedRepresentation }];
  });

  const flowResults = activeFlows.flatMap((flow): ScreenSearchResult[] => {
    const unit = unitById.get(flow.businessUnitId)?.name ?? flow.businessUnitId;
    const location = flowLocation(flow, businessUnits, groups);
    const score = matchScore(flow.name, location.sectionPath, unit, `${flow.id} ${flow.slug} ${flow.description}`, query);
    if (score === null) return [];
    return [{ id: `flow.${flow.id}`, name: flow.name, context: `${unit} · ${location.sectionPath} · ${flow.screenIds.length} screens`, href: `/flows/${flow.slug}`, status: flow.status, kind: "flow", score: score + 2 }];
  });

  const unitResults: ScreenSearchResult[] = businessUnits.filter(unit => normalizeSearch(unit.name).includes(query)).map(unit => ({ id: `product.${unit.id}`, name: unit.name, context: "Business Unit", href: `/screens/${unit.slug}`, status: unit.status, kind: "product", score: 1 }));
  return [...screenResults, ...flowResults, ...unitResults]
    .filter((result, index, results) => results.findIndex((candidate) => candidate.id === result.id) === index)
    .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name, "vi"));
}

export function matchingScreenIds(query: string, inventory: Screen[] = screens, groups: ScreenGroup[] = seededScreenGroups, flows: Flow[] = [], units: BusinessUnit[] = getBusinessUnits()) {
  return new Set(searchScreenInventory(query, inventory, flows, groups, units).flatMap((result) => result.screen ? [result.screen.id] : []));
}
