import type { PortabilityRepository } from "@/lib/portability/contracts";
import type { BusinessUnit, FigmaFrameIdentity, FigmaResolvedFrame, FigmaSource, FigmaUpdateCheck, Flow, NoteTypeDefinition, Screen, ScreenGroup, ScreenPlatform } from "@/types/design-library";
import type { ScreenDraft } from "@/lib/repositories/drafts";

// Stable synchronous snapshots for React. Remote adapters may populate a cache;
// this contract does not define remote transport or authentication.
export interface Inventory<T> {
  subscribe(listener: () => void): () => void;
  getSnapshot(): T[];
  getServerSnapshot(): T[];
}
export interface ScreenRepository extends Inventory<Screen> {
  // One coordinated operation, including Flow placement and draft cleanup.
  publish(screen: Screen, placement?: { flowId: string; insertAfterScreenId: string | null }, options?: { preserveDraft?: boolean; newFlow?: Flow }): void;
  delete(id: string): void;
  updatePreview(id: string, platform: "mobile" | "web", preview: string | null, clearAnnotations?: boolean, dimensions?: { width: number; height: number }, optionId?: string): void;
  recordFigmaCheck(id: string, source: FigmaSource, result: FigmaUpdateCheck): void;
  createVersionFromFigma(id: string, platform: ScreenPlatform, frame: FigmaResolvedFrame, checkedAt: string): void;
  saveDraft(draft: ScreenDraft): void;
  loadDraft(): ScreenDraft | undefined;
  discardDraft(): void;
}
export interface FlowRepository extends Inventory<Flow> {
  create(flow: Flow): void;
  createInGroup(groupId: string, name: string, description?: string): Flow;
  update(id: string, changes: Pick<Flow, "name" | "description">): void;
  delete(id: string): void;
  reorder(id: string, screenIds: string[]): void;
  reorderSiblings(groupId: string, flowIds: string[]): void;
}
export interface GroupRepository extends Inventory<ScreenGroup> {
  create(group: ScreenGroup): void;
  rename(id: string, name: string): void;
  move(id: string, parentId: string | null): void;
  deletionBlocker(id: string): string | undefined;
  permanentDeletionBlocker(id: string): string | undefined;
  deleteEmpty(id: string): void;
  delete(id: string, destinationId?: string | null, childAction?: "promote"): void;
  deletePermanently(id: string): void;
  findForRoute(id: string): ScreenGroup | undefined;
}
export interface ProductRepository extends Inventory<BusinessUnit> {
  create(name: string): BusinessUnit;
  rename(id: string, name: string): void;
  delete(id: string, acknowledged: boolean, destinationId?: string): void;
  contents(id: string): { groups: ScreenGroup[]; flows: Flow[]; screens: Screen[]; draft: boolean };
}
export interface NoteTypeRepository extends Inventory<NoteTypeDefinition> { create(name: string): NoteTypeDefinition; }
export interface ComponentTagRepository extends Inventory<string> { register(name: string): string; }
// Local assets stay embedded strings. Import does not publish or write storage.
// Persisted reference removal is coordinated by the Screen repository.
export interface AssetRepository {
  importFile(file: File, ready: (reference: string) => void, failed?: () => void): void;
  resolve(reference: string): string;
}
export interface Identity {
  id: string;
  displayName: string;
  initials: string;
  authorName: string;
  fullName?: string;
  username?: string;
  domain?: string;
  email?: string;
  phone?: string;
  role?: string;
  title?: string;
  status?: string;
}
export type IdentityProfileUpdate = Pick<Identity, "displayName" | "fullName" | "email" | "phone">;
export type AccessSnapshot =
  | { status: "checking" | "unauthenticated" | "authenticating" | "expired" | "error" }
  | { status: "authenticated"; access: "allowed" | "denied" };
// Frontend presentation only, never an authorization/security boundary.
export interface IdentitySession {
  getSnapshot(): AccessSnapshot;
  getServerSnapshot(): AccessSnapshot;
  subscribe(listener: () => void): () => void;
  // Provider owns redirects, session verification and callback processing.
  // Only a sanitized same-origin Library path is supplied, never a token.
  login(input: { returnTo: string }): void | Promise<void>;
  contactAdministrator?(): void | Promise<void>;
}
export interface IdentityProvider {
  // Omitted for existing Local adapters. Company mode must supply session + logout.
  mode?: "local" | "company";
  session?: IdentitySession;
  current(): Identity;
  getServerSnapshot?(): Identity;
  subscribe?(listener: () => void): () => void;
  updateProfile?(changes: IdentityProfileUpdate): void | Promise<void>;
  // Optional session capability. Local reference identity has no session to end.
  logout?(): void | Promise<void>;
}
export interface PreferenceStore {
  readTheme(): "light" | "dark" | "system";
  writeTheme(mode: "light" | "dark" | "system"): void;
}
export interface FigmaIntegrationAdapter {
  parseFrameUrl(value: string): FigmaFrameIdentity;
  resolveFrame(input: FigmaFrameIdentity): Promise<Omit<FigmaResolvedFrame, "preview">>;
  getPreview(frame: Omit<FigmaResolvedFrame, "preview">): Promise<string>;
  checkForUpdate(source: FigmaSource): Promise<FigmaUpdateCheck>;
}
export type FigmaFrameAdapter = FigmaIntegrationAdapter;
export interface LibraryRepositories {
  figma?: FigmaIntegrationAdapter;
  portability: PortabilityRepository;
  preferences: PreferenceStore;
  screens: ScreenRepository; flows: FlowRepository; groups: GroupRepository;
  products: ProductRepository; noteTypes: NoteTypeRepository; componentTags: ComponentTagRepository;
  assets: AssetRepository; identity: IdentityProvider;
  persistenceNotice: string;
}
