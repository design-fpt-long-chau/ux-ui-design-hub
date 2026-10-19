import { repositories } from "@/lib/repositories/provider";
import { getBusinessUnits } from "@/lib/business-units";
import { currentAuthGroupId } from "@/lib/flow-context";
import { businessUnits, flows, screenGroups, screens } from "@/data/design-library";

export const pharmacy = businessUnits.find((unit) => unit.id === "pharmacy")!;
export const pharmacyGroups = screenGroups.filter((group) => group.id.startsWith("pharmacy."));
export const pharmacyScreens = screens.filter((screen) => screen.businessUnitId === "pharmacy");
export const checkoutGroup = screenGroups.find((group) => group.id === "pharmacy.checkout")!;
export const checkoutScreens = screens.filter((screen) => screen.screenGroupId === checkoutGroup.id).sort((a, b) => a.sequence - b.sequence);

export function getScreen(slug: string) {
  return screens.find((screen) => screen.slug === slug);
}

export function getGroup(id: string) {
  return repositories.groups.findForRoute(currentAuthGroupId(id));
}

export function getUnit(id: string) {
  return getBusinessUnits().find((unit) => unit.id === id);
}

export function getFlow(slug: string) {
  return flows.find((flow) => flow.slug === slug);
}

export function screenHref(screen: { businessUnitId: string; screenGroupId: string; slug: string; status?: string }) {
  const unitSlug = getUnit(screen.businessUnitId)?.slug ?? screen.businessUnitId;
  const groupSlug = getGroup(screen.screenGroupId)?.slug ?? screen.screenGroupId.split(".").at(-1) ?? screen.screenGroupId;
  return `/screens/${unitSlug}/${groupSlug}/${screen.slug}`;
}
