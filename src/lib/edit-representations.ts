import type { RepresentationDraft } from "@/lib/repositories/client";
import type { Screen, ScreenPlatform } from "@/types/design-library";

export function originalOptions(screen: Screen | undefined, platform: ScreenPlatform) {
  const representation = screen?.representations?.[platform];
  return {
    variants: representation?.variants ?? (platform === "mobile" ? screen?.variants : undefined) ?? [],
    states: representation?.states ?? (platform === "mobile" ? screen?.states : undefined) ?? [],
  };
}

export function representationDrafts(screen: Screen, platform: ScreenPlatform): RepresentationDraft[] {
  const { variants, states } = originalOptions(screen, platform);
  return [
    ...variants.filter(item => !item.isDefault).map((item, index) => ({ ...item, type: "variant" as const, preview: item.preview ?? undefined, order: item.order ?? index + 1 })),
    ...states.map((item, index) => ({ ...item, type: "state" as const, stateType: "Other / Custom", preview: item.preview ?? undefined, order: item.order ?? variants.length + index + 1 })),
  ];
}

// Existing legacy options may intentionally have no screenshot. New options still require one.
export function previewOptionalIds(screen: Screen | undefined, platform: ScreenPlatform) {
  const { variants, states } = originalOptions(screen, platform);
  return [...variants, ...states].filter(item => !item.preview).map(item => item.id);
}

export function representationValid(item: RepresentationDraft, optionalIds: string[]) {
  return Boolean(item.name.trim() && (item.preview || optionalIds.includes(item.id)) && (item.type === "variant" || item.stateType));
}
