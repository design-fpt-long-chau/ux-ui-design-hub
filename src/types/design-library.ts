export interface FigmaSource {
  fileKey: string;
  nodeId: string;
  url: string;
  lastCheckedAt: string;
  lastSyncedAt?: string;
  lastSyncedFingerprint: string;
  /** Retained for local V1 compatibility and useful source labelling. */
  name?: string;
  /** Legacy alias retained for previously saved drafts/screens. */
  resolvedAt?: string;
}

export interface FigmaFrameIdentity { fileKey: string; nodeId: string; url: string; }
export interface FigmaResolvedFrame extends FigmaFrameIdentity {
  name: string;
  fileName?: string;
  preview: string;
  width: number;
  height: number;
  fingerprint: string;
}
export interface FigmaUpdateCheck {
  changed: boolean;
  checkedAt: string;
  frame: FigmaResolvedFrame;
}

export type Platform = "iOS" | "Android" | "Mobile Web" | "Web";
export type EvidenceStatus =
  | "Production Verified"
  | "Figma Verified"
  | "Internal Verified"
  | "Public Verified"
  | "Unverified";
export type PreviewStatus = "active" | "coming-soon" | "unavailable";
export type AvailabilityStatus = PreviewStatus;
export type ScreenPlatform = "mobile" | "web";
export type AnnotationType = "Interaction" | "Component" | "Behavior" | "Validation" | "Content" | "Navigation" | "Accessibility";

export interface NoteTypeDefinition {
  id: string;
  name: string;
}

export interface ContextualAnnotation {
  id: string;
  title: string;
  type: AnnotationType | string;
  typeId?: string;
  description: string;
  x: number;
  y: number;
  platform: ScreenPlatform;
  variantId?: string;
  stateId?: string;
  component?: string;
  jira?: string;
  figma?: string;
  severity?: "info" | "important";
  trigger?: string;
  behavior?: string;
  do?: string;
  dont?: string;
  isDemo?: boolean;
  showOnPlaceholder?: boolean;
}

export interface Flow {
  id: string;
  name: string;
  slug: string;
  description: string;
  businessUnitId: string;
  screenGroupId: string;
  parentGroupId?: string;
  sequence?: number;
  status: AvailabilityStatus;
  screenIds: string[];
}

export interface Version {
  id: string;
  label: string;
  date: string;
  note: string;
}

export interface ScreenOption {
  id: string;
  name: string;
  preview?: string | null;
  status?: PreviewStatus;
  previewTone?: string;
  description?: string;
  order?: number;
  isDefault?: boolean;
}

export interface ComponentReference {
  id: string;
  name: string;
}

export interface Evidence {
  status: EvidenceStatus;
  lastVerified: string;
  source: string;
  verifiedBy: string;
  notes: string;
}

export interface VersionSnapshot {
  sourceType?: "figma" | "upload";
  figmaSource?: FigmaSource;
  id: string;
  version: string;
  status: "current" | "archived";
  createdAt: string;
  lastUpdated: string;
  uploadedBy: string;
  preview?: string | null;
  description: string;
  whenItAppears: string;
  purpose: string;
  jiraTicket?: string;
  relatedTickets: string[];
  figmaHref?: string;
  components: ComponentReference[];
  variants: ScreenOption[];
  states: ScreenOption[];
  annotations: ContextualAnnotation[];
  evidence: Evidence;
  changelog?: string[];
}

export interface Screen {
  sourceType?: "figma" | "upload";
  figmaSource?: FigmaSource;
  pendingFigmaUpdate?: FigmaUpdateCheck;
  id: string;
  name: string;
  slug: string;
  sequence: number;
  businessUnitId: string;
  screenGroupId: string;
  description: string;
  whenItAppears: string;
  purpose: string;
  preview?: string | null;
  status?: PreviewStatus;
  platforms: Platform[];
  previewTone: string;
  currentVersion: string;
  jiraTicket: string;
  relatedTickets: string[];
  versions: Version[];
  components: ComponentReference[];
  variants: ScreenOption[];
  states: ScreenOption[];
  evidence: Evidence;
  figmaHref?: string;
  uploadedBy?: string;
  lastUpdated?: string;
  annotations?: ContextualAnnotation[];
  versionHistory?: Partial<Record<ScreenPlatform, VersionSnapshot[]>>;
  representations?: Partial<Record<ScreenPlatform, ScreenPlatformRepresentation>>;
}

export interface ScreenPlatformRepresentation {
  status: PreviewStatus;
  preview?: string | null;
  description?: string;
  whenItAppears?: string;
  implementationNotes?: string;
  dimensions?: string;
  currentVersion?: string;
  versions?: Version[];
  jiraTicket?: string;
  relatedTickets?: string[];
  components?: ComponentReference[];
  variants?: ScreenOption[];
  states?: ScreenOption[];
  evidence?: Evidence;
  figmaHref?: string;
  uploadedBy?: string;
  lastUpdated?: string;
  annotations?: ContextualAnnotation[];
  versionHistory?: VersionSnapshot[];
}

export interface ScreenGroup {
  id: string;
  parentGroupId?: string | null;
  businessUnitId?: string;
  name: string;
  slug: string;
  sequence: number;
  description: string;
  screenIds: string[];
}

export interface BusinessUnit {
  id: string;
  name: string;
  slug: string;
  shortName: string;
  description: string;
  status: "active" | "coming-soon";
  groupIds: string[];
}
