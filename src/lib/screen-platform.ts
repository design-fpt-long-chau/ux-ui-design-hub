import { repositories } from "@/lib/repositories/provider";
import type { Screen, ScreenPlatform, VersionSnapshot } from "@/types/design-library";
import { screenHref } from "@/lib/design-library";

function defaultOptionPreview(screen: Pick<Screen, "states" | "variants">) {
  const options = [...screen.variants, ...screen.states.filter((state) => !screen.variants.some((variant) => variant.id === state.id))];
  return options.find((option) => option.isDefault)?.preview ?? options[0]?.preview;
}

export function resolveAvailableScreenPlatform(screen: Pick<Screen, "platforms">, requested: ScreenPlatform): ScreenPlatform {
  const hasMobile = screen.platforms.some((item) => item === "iOS" || item === "Android" || item === "Mobile Web");
  const hasWeb = screen.platforms.includes("Web");
  if (requested === "web" && hasWeb) return "web";
  return hasMobile ? "mobile" : "web";
}

export function resolveScreenPreview(screen: Screen, platform: ScreenPlatform = "mobile") {
  const representation = screen.representations?.[platform];
  const representationPreview = representation ? defaultOptionPreview({ states: representation.states ?? [], variants: representation.variants ?? [] }) : undefined;
  const reference = platform === "web" ? representation?.preview ?? representationPreview : representation?.preview ?? representationPreview ?? screen.preview ?? defaultOptionPreview(screen);
  return reference ? repositories.assets.resolve(reference) : reference;
}

export function screenPlatformHref(screen: Screen, platform: ScreenPlatform, flow = false) {
  const params = new URLSearchParams();
  if (platform === "web") params.set("platform", "web");
  if (flow) params.set("view", "flow");
  const query = params.toString();
  return `${screenHref(screen)}${query ? `?${query}` : ""}`;
}

export function resolveScreenPlatform(screen: Screen, platform: ScreenPlatform): Screen {
  const representation = screen.representations?.[platform];
  if (platform === "mobile" && !representation) return screen;

  const unverifiedEvidence = {
    status: "Unverified" as const,
    lastVerified: "Not documented",
    source: "No source yet",
    verifiedBy: "Not documented",
    notes: "No notes",
  };

  return {
    ...screen,
    status: representation?.status ?? "coming-soon",
    preview: resolveScreenPreview(screen, platform),
    description: representation?.description ?? screen.description,
    whenItAppears: representation?.whenItAppears ?? screen.whenItAppears,
    currentVersion: representation?.currentVersion ?? "",
    versions: representation?.versions ?? [],
    jiraTicket: representation?.jiraTicket ?? "",
    relatedTickets: representation?.relatedTickets ?? [],
    components: representation?.components ?? [],
    variants: representation?.variants ?? [],
    states: representation?.states ?? [],
    evidence: representation?.evidence ?? unverifiedEvidence,
    figmaHref: representation?.figmaHref,
    uploadedBy: representation?.uploadedBy,
    lastUpdated: representation?.lastUpdated,
    annotations: representation?.annotations ?? [],
  };
}

export interface ScreenVersionContext {
  screen: Screen;
  history: VersionSnapshot[];
  selectedSnapshot?: VersionSnapshot;
  isHistorical: boolean;
  missingVersion?: string;
}

export function resolveScreenVersion(screen: Screen, platform: ScreenPlatform, requestedVersion?: string): ScreenVersionContext {
  const platformScreen = resolveScreenPlatform(screen, platform);
  const history = screen.representations?.[platform]?.versionHistory ?? screen.versionHistory?.[platform] ?? [];
  const selectedSnapshot = requestedVersion ? history.find(snapshot => snapshot.version === requestedVersion || snapshot.id === requestedVersion) : undefined;

  if (!selectedSnapshot || selectedSnapshot.status === "current") return { screen: platformScreen, history, selectedSnapshot: history.find(snapshot => snapshot.status === "current"), isHistorical: false, ...(requestedVersion && !selectedSnapshot ? { missingVersion: requestedVersion } : {}) };

  return {
    history,
    selectedSnapshot,
    isHistorical: true,
    screen: {
      ...platformScreen,
      sourceType: selectedSnapshot.sourceType ?? platformScreen.sourceType,
      figmaSource: selectedSnapshot.figmaSource ?? platformScreen.figmaSource,
      status: "active",
      preview: selectedSnapshot.preview,
      description: selectedSnapshot.description,
      whenItAppears: selectedSnapshot.whenItAppears,
      purpose: selectedSnapshot.purpose,
      currentVersion: selectedSnapshot.version,
      jiraTicket: selectedSnapshot.jiraTicket ?? "",
      relatedTickets: selectedSnapshot.relatedTickets,
      versions: [{ id: selectedSnapshot.id, label: selectedSnapshot.version, date: selectedSnapshot.lastUpdated, note: "Archived demo snapshot" }],
      components: selectedSnapshot.components,
      variants: selectedSnapshot.variants,
      states: selectedSnapshot.states,
      annotations: selectedSnapshot.annotations,
      evidence: selectedSnapshot.evidence,
      figmaHref: selectedSnapshot.figmaHref,
      uploadedBy: selectedSnapshot.uploadedBy,
      lastUpdated: selectedSnapshot.lastUpdated,
    },
  };
}

export function screenVersionHref(screen: Screen, platform: ScreenPlatform, version?: string) {
  const href = screenPlatformHref(screen, platform);
  if (!version) return href;
  return `${href}${href.includes("?") ? "&" : "?"}version=${encodeURIComponent(version)}`;
}
