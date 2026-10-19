import type { ScreenDraft } from "@/lib/repositories/drafts";
import type { ScreenRepository, FlowRepository, GroupRepository, ProductRepository, NoteTypeRepository } from "@/lib/repositories/contracts";
import { BUSINESS_UNITS_KEY, seededBusinessUnits, getBusinessUnits, readUnitState, validateProductName } from "@/lib/adapters/local/business-units";
import { flows as seededFlows, screenGroups as seededScreenGroups, screens as seededScreens } from "@/data/design-library";
import type { FigmaResolvedFrame, FigmaSource, FigmaUpdateCheck, Flow, NoteTypeDefinition, Screen, ScreenGroup, ScreenPlatform, VersionSnapshot } from "@/types/design-library";
import { groupPath, groupUnitId } from "@/lib/screen-groups";
import { predefinedNoteTypes, validateNoteTypeName } from "@/lib/note-types";
import { withDefaultFlows, flowOwnerGroupId, consolidateLoginFlow, resolveFlowId, reassociateLegacyAuthScreens, legacyAuthGroupId, orderedFlows } from "@/lib/flow-context";



const PUBLISHED_KEY = "lc-library.phase1.published-screens";
const DRAFT_KEY = "lc-library.phase1.add-screen-draft";
const EVENT_NAME = "lc-library-inventory-change";
const FLOW_OVERRIDES_KEY = "lc-library.phase1.flow-overrides";
const GROUP_OVERRIDES_KEY = "lc-library.phase1.screen-group-overrides";
const DELETED_GROUPS_KEY = "lc-library.phase1.deleted-screen-group-ids";
const DELETED_FLOWS_KEY = "lc-library.phase1.deleted-flow-ids";
const DELETED_SCREENS_KEY = "lc-library.phase1.deleted-screen-ids";
const CUSTOM_NOTE_TYPES_KEY = "lc-library.phase1.custom-note-types";

export function createLocalBusinessUnit(name: string) {
  const validated = validateProductName(name);
  const id = `product-${crypto.randomUUID()}`;
  const unit = { id, slug: id, name: validated, shortName: validated.slice(0, 2).toUpperCase(), description: "", status: "active" as const, groupIds: [] };
  const state = readUnitState();
  commitStorage([[BUSINESS_UNITS_KEY, JSON.stringify({ ...state, overrides: [...state.overrides, unit] })]]);
  return unit;
}

export function renameLocalBusinessUnit(id: string, name: string) {
  const unit = getBusinessUnits().find(item => item.id === id);
  if (!unit) throw new Error("This product no longer exists.");
  const validated = validateProductName(name, id);
  const state = readUnitState();
  commitStorage([[BUSINESS_UNITS_KEY, JSON.stringify({ ...state, overrides: [...state.overrides.filter(item => item.id !== id), { ...unit, name: validated, shortName: validated.slice(0, 2).toUpperCase() }] })]]);
}

export function businessUnitContents(id: string) {
  return { groups: getGroupSnapshot().filter(group => groupUnitId(group) === id), flows: getFlowSnapshot().filter(flow => flow.businessUnitId === id), screens: getSnapshot().filter(screen => screen.businessUnitId === id), draft: loadScreenDraft()?.businessUnitId === id };
}

// Explicit deletion only: move records first and tombstone the unit last, atomically.
export function deleteLocalBusinessUnit(id: string, acknowledged: boolean, destinationId?: string) {
  if (!acknowledged) throw new Error("Confirm product deletion first.");
  const units = getBusinessUnits();
  if (!units.some(unit => unit.id === id)) throw new Error("This product no longer exists.");
  for (const key of [PUBLISHED_KEY, GROUP_OVERRIDES_KEY, FLOW_OVERRIDES_KEY]) {
    const raw = window.localStorage.getItem(key);
    if (raw !== null && !Array.isArray(JSON.parse(raw))) throw new Error("Stored Library data is unreadable. Deletion is blocked.");
  }
  const draftRaw = window.localStorage.getItem(DRAFT_KEY);
  const draft = draftRaw === null ? undefined : JSON.parse(draftRaw) as ScreenDraft;
  if (draftRaw !== null && (!draft || typeof draft !== "object" || Array.isArray(draft))) throw new Error("The saved draft is unreadable. Deletion is blocked.");
  const contents = businessUnitContents(id);
  if (units.find(unit => unit.id === id)!.groupIds.some(groupId => !contents.groups.some(group => group.id === groupId) && !readDeletedGroupIds().includes(groupId))) throw new Error("This product references missing groups. Resolve them before deleting; no data was changed.");
  const occupied = contents.groups.length + contents.flows.length + contents.screens.length > 0 || draft?.businessUnitId === id;
  const changes: [string, string | null][] = [];
  if (occupied) {
    if (!destinationId || destinationId === id || !units.some(unit => unit.id === destinationId)) throw new Error("Choose another product to preserve all groups, flows, screens and drafts.");
    if (contents.groups.some(group => group.id.startsWith("pharmacy.registration-login")) || contents.flows.some(flow => flow.id === "pharmacy.authentication")) throw new Error("Legacy authentication ownership cannot be safely moved yet. This product cannot be deleted; all data is unchanged.");
    const groupIds = new Set(contents.groups.map(group => group.id));
    const flowIds = new Set(contents.flows.map(flow => flow.id));
    const screenIds = new Set(contents.screens.map(screen => screen.id));
    if (contents.groups.some(group => getGroupSnapshot().some(other => groupUnitId(other) === destinationId && (other.slug === group.slug || (!other.parentGroupId && !group.parentGroupId && other.name.toLocaleLowerCase() === group.name.toLocaleLowerCase()))))) throw new Error("The destination has conflicting group names or URLs. Rename those groups before moving.");
    if (contents.screens.some(screen => !groupIds.has(screen.screenGroupId)) || contents.flows.some(flow => !groupIds.has(flowOwnerGroupId(flow)) || flow.screenIds.some(screenId => !screenIds.has(screenId))) || contents.groups.some(group => (group.parentGroupId && !groupIds.has(group.parentGroupId)) || group.screenIds.some(screenId => !screenIds.has(screenId))) || getSnapshot().some(screen => screen.businessUnitId !== id && groupIds.has(screen.screenGroupId)) || getFlowSnapshot().some(flow => flow.businessUnitId !== id && (groupIds.has(flowOwnerGroupId(flow)) || flow.screenIds.some(screenId => screenIds.has(screenId))))) throw new Error("Missing or cross-product references prevent a safe move. Resolve these references first; no data was changed.");
    const merge = <T extends { id: string }>(existing: T[], updates: T[]) => [...new Map([...existing, ...updates].map(item => [item.id, item])).values()];
    changes.push([GROUP_OVERRIDES_KEY, JSON.stringify(merge(readGroupOverrides(), contents.groups.map(group => ({ ...group, businessUnitId: destinationId }))))]);
    changes.push([FLOW_OVERRIDES_KEY, JSON.stringify(merge(readFlowOverrides(), contents.flows.map(flow => ({ ...flow, businessUnitId: destinationId }))))]);
    changes.push([PUBLISHED_KEY, JSON.stringify(merge(readPublished(), contents.screens.map(screen => ({ ...screen, businessUnitId: destinationId }))))]);
    if (draft?.businessUnitId === id) {
      if ((draft.screenGroupId && !groupIds.has(draft.screenGroupId)) || (draft.flowId && !flowIds.has(draft.flowId))) throw new Error("The saved draft has conflicting references. Resolve it before deleting this product.");
      changes.push([DRAFT_KEY, JSON.stringify({ ...draft, businessUnitId: destinationId })]);
    }
  }
  const state = readUnitState();
  const destination = occupied ? units.find(unit => unit.id === destinationId) : undefined;
  const overrides = destination ? [...state.overrides.filter(unit => unit.id !== destination.id), { ...destination, groupIds: [...new Set([...destination.groupIds, ...contents.groups.map(group => group.id)])] }] : state.overrides;
  changes.push([BUSINESS_UNITS_KEY, JSON.stringify({ ...state, overrides, deletedIds: [...new Set([...state.deletedIds, id])] })]);
  commitStorage(changes);
}


let publishedCache: Screen[] | undefined;
let inventoryCache: Screen[] | undefined;
let flowCache: Flow[] | undefined;
let groupCache: ScreenGroup[] | undefined;
let customNoteTypeCache: NoteTypeDefinition[] | undefined;
const emptyNoteTypes: NoteTypeDefinition[] = [];

// Inventory reads must remain read-only, regardless of legacy cleanup markers.
// Persisted records override seeds unchanged; never migrate or clean up on read.
function readPublished() {
  if (typeof window === "undefined") return [];
  if (publishedCache) return publishedCache;
  try { publishedCache = JSON.parse(window.localStorage.getItem(PUBLISHED_KEY) ?? "[]") as Screen[]; }
  catch { publishedCache = []; }
  return publishedCache;
}

function getSnapshot() {
  if (!inventoryCache) {
    const localById = new Map(readPublished().map((screen) => [screen.id, screen]));
    const deletedIds = new Set(readDeletedScreenIds());
    inventoryCache = reassociateLegacyAuthScreens([...seededScreens.map((screen) => localById.get(screen.id) ?? screen), ...readPublished().filter((screen) => !seededScreens.some((seeded) => seeded.id === screen.id))].filter((screen) => !deletedIds.has(screen.id)), [...new Map([...seededFlows, ...readFlowOverrides()].map(flow => [flow.id, flow])).values()]);
  }
  return inventoryCache;
}

function subscribe(callback: () => void) {
  const handleStorage = () => { publishedCache = undefined; inventoryCache = undefined; flowCache = undefined; groupCache = undefined; customNoteTypeCache = undefined; callback(); };
  window.addEventListener(EVENT_NAME, callback);
  window.addEventListener("storage", handleStorage);
  return () => { window.removeEventListener(EVENT_NAME, callback); window.removeEventListener("storage", handleStorage); };
}

function refresh() {
  publishedCache = undefined;
  inventoryCache = undefined;
  flowCache = undefined;
  groupCache = undefined;
  customNoteTypeCache = undefined;
  window.dispatchEvent(new Event(EVENT_NAME));
}



function readFlowOverrides() {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(FLOW_OVERRIDES_KEY) ?? "[]") as Flow[]; }
  catch { return []; }
}

function getFlowSnapshot() {
  if (!flowCache) {
    const overrides = new Map(readFlowOverrides().map((flow) => [flow.id, flow]));
    const deletedIds = new Set(readDeletedFlowIds());
    flowCache = consolidateLoginFlow(withDefaultFlows([
      ...seededFlows.filter((flow) => !deletedIds.has(flow.id)).map((flow) => overrides.get(flow.id) ?? flow),
      ...readFlowOverrides().filter((flow) => !seededFlows.some((seeded) => seeded.id === flow.id) && !deletedIds.has(flow.id)),
    ], getGroupSnapshot(), getSnapshot()), getSnapshot()).filter(flow => !deletedIds.has(flow.id));
  }
  return flowCache;
}

const serverFlows = consolidateLoginFlow(withDefaultFlows(seededFlows, seededScreenGroups, seededScreens), seededScreens);


function readGroupOverrides() {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(GROUP_OVERRIDES_KEY) ?? "[]") as ScreenGroup[]; }
  catch { return []; }
}

function readDeletedGroupIds() {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(DELETED_GROUPS_KEY) ?? "[]") as string[]; }
  catch { return []; }
}

function getGroupSnapshot() {
  if (!groupCache) {
    const overrides = new Map(readGroupOverrides().map((group) => [group.id, group]));
    const deleted = new Set(readDeletedGroupIds());
    groupCache = [...seededScreenGroups.filter((group) => !deleted.has(group.id)).map((group) => overrides.get(group.id) ?? group), ...readGroupOverrides().filter((group) => !seededScreenGroups.some((seeded) => seeded.id === group.id) && !deleted.has(group.id))];
  }
  const ambiguous = groupCache.find(group => group.parentGroupId === legacyAuthGroupId);
  if (ambiguous) throw new Error(`Auth mapping required for Group ${ambiguous.id} (${ambiguous.name}). No data has been changed.`);
  if (groupCache.some(group => group.id === legacyAuthGroupId)) groupCache = groupCache.filter(group => group.id !== legacyAuthGroupId);
  return groupCache;
}



function writeGroup(group: ScreenGroup) {
  commitStorage([
    [GROUP_OVERRIDES_KEY, JSON.stringify([...readGroupOverrides().filter((item) => item.id !== group.id), group])],
    [DELETED_GROUPS_KEY, JSON.stringify(readDeletedGroupIds().filter((id) => id !== group.id))],
  ]);
}

export function createLocalScreenGroup(group: ScreenGroup) {
  const groups = getGroupSnapshot();
  if (groups.some((item) => item.id === group.id)) throw new Error("This group ID already exists.");
  if (!group.name.trim()) throw new Error("Enter a group name.");
  if (group.parentGroupId) {
    const parent = groups.find((item) => item.id === group.parentGroupId);
    const path = parent && groupPath(parent, groups);
    if (!parent || !path || path.length >= 3 || groupUnitId(parent) !== groupUnitId(group) || parent.id === group.id) throw new Error("Choose a level 1 or level 2 parent in the same Business Unit. Maximum group depth is three.");
  }
  if (groups.some((item) => groupUnitId(item) === groupUnitId(group) && (item.parentGroupId ?? null) === (group.parentGroupId ?? null) && item.name.trim().toLocaleLowerCase() === group.name.trim().toLocaleLowerCase())) throw new Error("A group with this name already exists under this parent.");
  writeGroup(group);
}

function readCustomNoteTypes() {
  if (typeof window === "undefined") return emptyNoteTypes;
  if (customNoteTypeCache) return customNoteTypeCache;
  try {
    const stored = JSON.parse(window.localStorage.getItem(CUSTOM_NOTE_TYPES_KEY) ?? "[]") as unknown;
    customNoteTypeCache = Array.isArray(stored)
      ? stored.filter((type): type is NoteTypeDefinition => Boolean(type && typeof type === "object" && "id" in type && "name" in type && typeof type.id === "string" && typeof type.name === "string"))
      : [];
  } catch { customNoteTypeCache = []; }
  return customNoteTypeCache;
}



export function createCustomNoteType(value: string) {
  const current = readCustomNoteTypes();
  const name = value.trim();
  const error = validateNoteTypeName(name, [...predefinedNoteTypes, ...current]);
  if (error) throw new Error(error);
  const uuid = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}.${Math.random().toString(36).slice(2)}`;
  const type: NoteTypeDefinition = { id: `custom.${uuid}`, name };
  window.localStorage.setItem(CUSTOM_NOTE_TYPES_KEY, JSON.stringify([...current, type]));
  refresh();
  return type;
}

export function renameLocalScreenGroup(groupId: string, name: string) {
  const group = getGroupSnapshot().find((item) => item.id === groupId);
  if (!group) throw new Error(`Screen group ${groupId} was not found.`);
  const value = name.trim();
  if (!value) throw new Error("Enter a group name.");
  if (getGroupSnapshot().some(item => item.id !== groupId && groupUnitId(item) === groupUnitId(group) && (item.parentGroupId ?? null) === (group.parentGroupId ?? null) && item.name.trim().toLocaleLowerCase() === value.toLocaleLowerCase())) throw new Error("A group with this name already exists under this parent.");
  writeGroup({ ...group, name: value });
}

export function groupDeletionBlocker(groupId: string): string | undefined {
  const group = getGroupSnapshot().find(item => item.id === groupId);
  if (!group) return;
  if (getGroupSnapshot().some(item => item.parentGroupId === groupId)
    || getFlowSnapshot().some(flow => flowOwnerGroupId(flow) === groupId)
    || getSnapshot().some(screen => screen.screenGroupId === groupId)
    || group.screenIds?.length
    || loadScreenDraft()?.screenGroupId === groupId) {
    return "This group contains Flows, Screens, subgroups or a draft. Move/reassign them before deleting, or cancel. Nothing will be cascade-deleted.";
  }
}

export function deleteEmptyLocalScreenGroup(groupId: string) {
  const blocker = groupDeletionBlocker(groupId);
  if (blocker) throw new Error(blocker);
  if (!getGroupSnapshot().some(item => item.id === groupId)) return;
  // Reuse the existing deletion marker. Keep records/assets intact; no child writes.
  commitStorage([[DELETED_GROUPS_KEY, JSON.stringify([...new Set([...readDeletedGroupIds(), groupId])])]]);
  refresh();
}


// Explicit user deletion only. Hydration never invokes this operation.
function planGroupRemoval(groupId: string): [string, string | null][] {
  // Refuse malformed storage rather than replacing unreadable legacy records.
  for (const key of [PUBLISHED_KEY, FLOW_OVERRIDES_KEY, GROUP_OVERRIDES_KEY, DELETED_GROUPS_KEY]) {
    const raw = window.localStorage.getItem(key);
    if (raw !== null && !Array.isArray(JSON.parse(raw))) throw new Error("Stored Library data is unreadable. Group deletion is blocked; no data was changed.");
  }
  const groups = getGroupSnapshot(), screens = getSnapshot(), flows = getFlowSnapshot();
  const group = groups.find(item => item.id === groupId);
  if (!group) throw new Error("This group no longer exists.");
  const unitId = groupUnitId(group);
  if (groupId === "pharmacy.registration-login.login" && flows.some(flow => flow.id === "pharmacy.authentication")) throw new Error("This group owns a legacy authentication Flow whose compatibility mapping requires this group. Safe reassignment is not supported yet; nothing will be deleted.");
  const children = groups.filter(item => item.parentGroupId === groupId);
  if (children.some(child => groupUnitId(child) !== unitId)) throw new Error("A subgroup belongs to another Business Unit. Resolve this relationship before deleting.");
  if (children.some(child => groups.some(other => other.id !== child.id && other.id !== groupId && !other.parentGroupId && groupUnitId(other) === unitId && other.name.trim().toLocaleLowerCase() === child.name.trim().toLocaleLowerCase()))) throw new Error("Promoting subgroups would duplicate a top-level group name. Rename or move these subgroups first.");
  const affected = screens.filter(screen => screen.screenGroupId === groupId);
  const owned = flows.filter(flow => flowOwnerGroupId(flow) === groupId);
  if (affected.some(screen => screen.businessUnitId !== unitId) || owned.some(flow => flow.businessUnitId !== unitId)) throw new Error("This group has cross-Business-Unit references. Safe reassignment is blocked.");
  if ((group.screenIds ?? []).some(id => !screens.some(screen => screen.id === id && screen.businessUnitId === unitId))) throw new Error("This group references missing or cross-unit Screens. Restore or resolve them before deleting; nothing will be lost.");
  if (readFlowOverrides().some(flow => flow.screenGroupId === groupId && flowOwnerGroupId(flow) !== groupId)) throw new Error("A legacy Flow has conflicting group references. Resolve them before deleting.");
  const draftRaw = window.localStorage.getItem(DRAFT_KEY);
  const draft = draftRaw === null ? undefined : JSON.parse(draftRaw) as ScreenDraft;
  if (draftRaw !== null && (!draft || typeof draft !== "object" || Array.isArray(draft))) throw new Error("The saved draft is unreadable. Group deletion is blocked.");
  if (draft?.screenGroupId === groupId && draft.businessUnitId !== unitId) throw new Error("The saved draft has a conflicting Business Unit. Resolve it before deleting.");
  let destination = groups.find(item => item.id !== groupId && groupUnitId(item) === unitId && item.slug === "ungrouped" && !item.parentGroupId);
  const needsDestination = affected.length > 0 || owned.length > 0 || draft?.screenGroupId === groupId;
  if (needsDestination && !destination) {
    let id = unitId + ".ungrouped", slug = "ungrouped", suffix = 2;
    const reserved = new Set([...groups.map(item => item.id), ...readDeletedGroupIds()]);
    while (reserved.has(id) || groups.some(item => groupUnitId(item) === unitId && item.slug === slug)) { id = unitId + ".ungrouped-" + suffix; slug = "ungrouped-" + suffix++; }
    destination = { id, slug, businessUnitId: unitId, parentGroupId: null, name: "Ungrouped", sequence: Math.max(0, ...groups.map(item => item.sequence)) + 1, description: "Screens and Flows preserved from deleted groups.", screenIds: [] };
  }
  const changes: [string, string | null][] = [];
  const groupUpdates = new Map<string, ScreenGroup>(children.map(child => [child.id, { ...child, parentGroupId: null }]));
  if (destination) groupUpdates.set(destination.id, destination);
  if (groupUpdates.size) {
    const originals = readGroupOverrides();
    changes.push([GROUP_OVERRIDES_KEY, JSON.stringify([...originals.map(item => groupUpdates.get(item.id) ?? item), ...[...groupUpdates.values()].filter(item => !originals.some(original => original.id === item.id))])]);
  }
  if (destination && affected.length) {
    const updates = new Map(affected.map(screen => [screen.id, { ...screen, screenGroupId: destination!.id }]));
    const originals = readPublished();
    changes.push([PUBLISHED_KEY, JSON.stringify([...originals.map(item => updates.get(item.id) ?? item), ...[...updates.values()].filter(item => !originals.some(original => original.id === item.id))])]);
  }
  if (destination && owned.length) {
    const updates = new Map(owned.map(flow => [flow.id, { ...flow, screenGroupId: destination!.id, parentGroupId: destination!.id }]));
    const originals = readFlowOverrides();
    changes.push([FLOW_OVERRIDES_KEY, JSON.stringify([...originals.map(item => updates.has(item.id) ? { ...item, ...updates.get(item.id) } : item), ...[...updates.values()].filter(item => !originals.some(original => original.id === item.id))])]);
  }
  if (destination && draft?.screenGroupId === groupId) changes.push([DRAFT_KEY, JSON.stringify({ ...draft, screenGroupId: destination.id })]);
  // Hide the selected group last. An interrupted write cannot strand its children.
  changes.push([DELETED_GROUPS_KEY, JSON.stringify([...new Set([...readDeletedGroupIds(), groupId])])]);
  return changes;
}

export function permanentGroupDeletionBlocker(groupId: string): string | undefined {
  try { planGroupRemoval(groupId); } catch (cause) { return cause instanceof Error ? cause.message : "Safe group cleanup is not possible. Nothing will be deleted."; }
}

export function permanentlyDeleteLocalScreenGroup(groupId: string) {
  commitStorage(planGroupRemoval(groupId));
  refresh();
}

export function moveLocalScreenGroup(groupId: string, parentGroupId: string | null) {
  const groups = getGroupSnapshot();
  const group = groups.find((item) => item.id === groupId);
  if (!group) throw new Error(`Screen group ${groupId} was not found.`);
  const moved = { ...group, parentGroupId };
  const next = groups.map((item) => item.id === groupId ? moved : item);
  // Check the moved subtree, including descendants, before writing anything.
  const affected = new Set([groupId]);
  for (let level = 0; level < 3; level++) {
    for (const item of groups) if (item.parentGroupId && affected.has(item.parentGroupId)) affected.add(item.id);
  }
  if (next.some((item) => affected.has(item.id) && !groupPath(item, next))) throw new Error("Choose a parent in the same Business Unit without cycles. Maximum group depth is three, including descendants.");
  writeGroup(moved);
}

export function deleteLocalScreenGroup(groupId: string, destinationGroupId?: string | null, childAction?: "promote") {
  const group = getGroupSnapshot().find((item) => item.id === groupId);
  if (!group) return;
  const affected = getSnapshot().filter((screen) => screen.screenGroupId === groupId);
  const children = getGroupSnapshot().filter((item) => item.parentGroupId === groupId);
  if (children.length && childAction !== "promote") throw new Error("Choose to promote subgroups or cancel.");
  if (affected.length && destinationGroupId === undefined) throw new Error("Reassign the screens or keep them ungrouped.");
  if (affected.length && destinationGroupId && !getGroupSnapshot().some((item) => item.id === destinationGroupId && item.id !== groupId && groupUnitId(item) === groupUnitId(group))) throw new Error("Choose a different group in the same Business Unit.");
  let destination = destinationGroupId;
  if (affected.length && destination === null) {
    const businessUnitId = group.businessUnitId ?? group.id.split(".")[0];
    const ungroupedId = `${businessUnitId}.ungrouped`;
    if (!getGroupSnapshot().some((item) => item.id === ungroupedId)) writeGroup({ id: ungroupedId, businessUnitId, name: "Ungrouped", slug: "ungrouped", sequence: 999, description: "Screens awaiting group assignment.", screenIds: [] });
    destination = ungroupedId;
  }
  if (affected.length && destination) {
    const current = readPublished();
    const updates = new Map(affected.map((screen) => [screen.id, { ...screen, screenGroupId: destination! }]));
    const next = [...seededScreens.filter((screen) => updates.has(screen.id)).map((screen) => updates.get(screen.id)!), ...current.filter((screen) => !updates.has(screen.id)), ...affected.filter((screen) => !seededScreens.some((seeded) => seeded.id === screen.id)).map((screen) => updates.get(screen.id)!)];
    window.localStorage.setItem(PUBLISHED_KEY, JSON.stringify(Array.from(new Map(next.map((screen) => [screen.id, screen])).values())));
  }
  // Persist promoted children before hiding the parent; interruption cannot orphan them.
  const promoted = new Map(children.map((child) => [child.id, { ...child, parentGroupId: null }]));
  const remaining = readGroupOverrides().filter((item) => item.id !== groupId && !promoted.has(item.id));
  window.localStorage.setItem(GROUP_OVERRIDES_KEY, JSON.stringify([...remaining, ...promoted.values()]));
  window.localStorage.setItem(DELETED_GROUPS_KEY, JSON.stringify(Array.from(new Set([...readDeletedGroupIds(), groupId]))));
  refresh();
}

function readDeletedFlowIds() {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(DELETED_FLOWS_KEY) ?? "[]") as string[]; }
  catch { return []; }
}

function readDeletedScreenIds() {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(DELETED_SCREENS_KEY) ?? "[]") as string[]; }
  catch { return []; }
}

function writeFlow(flow: Flow) {
  const overrides = [...readFlowOverrides().filter((item) => item.id !== flow.id), flow];
  commitStorage([
    [FLOW_OVERRIDES_KEY, JSON.stringify(overrides)],
    [DELETED_FLOWS_KEY, JSON.stringify(readDeletedFlowIds().filter((id) => id !== flow.id))],
  ]);
}

function validateNewFlow(flow: Flow) {
  const flows = getFlowSnapshot();
  if (flows.some((item) => item.id === flow.id || item.slug === flow.slug)) throw new Error("This Flow ID or route already exists.");
  if (flow.parentGroupId) {
    const parent = getGroupSnapshot().find((group) => group.id === flow.parentGroupId);
    if (!parent || groupUnitId(parent) !== flow.businessUnitId || flow.screenGroupId !== parent.id) throw new Error("Choose a parent group in the same Business Unit.");
    if (flows.some((item) => flowOwnerGroupId(item) === parent.id && item.name.trim().toLocaleLowerCase() === flow.name.trim().toLocaleLowerCase())) throw new Error("A flow with this name already exists in this group.");
  }
}

export function createLocalFlow(flow: Flow) {
  validateNewFlow(flow);
  writeFlow(flow);
}

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function createLocalFlowInGroup(groupId: string, name: string, description = "") {
  const group = getGroupSnapshot().find((item) => item.id === groupId);
  if (!group) throw new Error("This group is no longer available.");
  const value = name.trim();
  if (!value) throw new Error("Enter a flow name.");
  const flows = getFlowSnapshot();
  if (flows.some((flow) => flowOwnerGroupId(flow) === group.id && flow.name.trim().toLocaleLowerCase("vi") === value.toLocaleLowerCase("vi"))) throw new Error("A flow with this name already exists here.");
  const token = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}.${Math.random().toString(36).slice(2)}`;
  const baseSlug = `${group.slug}-${slugify(value) || "new-flow"}`;
  let route = baseSlug;
  let suffix = 2;
  while (flows.some((flow) => flow.slug === route)) route = `${baseSlug}-${suffix++}`;
  const siblingSequence = Math.max(0, ...flows.filter(flow => flow.businessUnitId === groupUnitId(group) && flowOwnerGroupId(flow) === group.id).map((flow, index) => flow.sequence ?? index + 1)) + 1;
  const flow: Flow = { id: `${group.id}.flow.${token}`, slug: route, name: value, description: description.trim() || "No description yet", businessUnitId: groupUnitId(group), screenGroupId: group.id, parentGroupId: group.id, sequence: siblingSequence, status: "active", screenIds: [] };
  createLocalFlow(flow);
  return flow;
}

export function updateLocalFlow(flowId: string, updates: Pick<Flow, "name" | "description">) {
  const flow = getFlowSnapshot().find((item) => item.id === flowId);
  if (!flow) throw new Error(`Flow ${flowId} was not found.`);
  writeFlow({ ...flow, ...updates });
}

export function deleteLocalFlow(flowId: string) {
  commitStorage([
    [FLOW_OVERRIDES_KEY, JSON.stringify(readFlowOverrides().filter((flow) => flow.id !== flowId))],
    [DELETED_FLOWS_KEY, JSON.stringify(Array.from(new Set([...readDeletedFlowIds(), flowId])))],
  ]);
  refresh();
}

export function reorderLocalFlowScreens(flowId: string, orderedScreenIds: string[]) {
  const flow = getFlowSnapshot().find((item) => item.id === resolveFlowId(flowId, getFlowSnapshot()));
  if (!flow) throw new Error("This Flow is no longer available.");
  if (orderedScreenIds.length !== flow.screenIds.length || new Set(orderedScreenIds).size !== orderedScreenIds.length || orderedScreenIds.some((id) => !flow.screenIds.includes(id))) throw new Error("Flow order must contain every canonical Screen exactly once.");
  if (orderedScreenIds.every((id, index) => id === flow.screenIds[index])) return;
  writeFlow({ ...flow, screenIds: [...orderedScreenIds] });
}

export function reorderLocalFlows(groupId: string, orderedFlowIds: string[]) {
  const siblings = orderedFlows(getFlowSnapshot().filter((flow) => flowOwnerGroupId(flow) === groupId));
  const siblingIds = siblings.map((flow) => flow.id);
  if (orderedFlowIds.length !== siblingIds.length || new Set(orderedFlowIds).size !== orderedFlowIds.length || orderedFlowIds.some((id) => !siblingIds.includes(id))) throw new Error("Flow order must contain every sibling Flow exactly once.");
  if (orderedFlowIds.every((id, index) => id === siblingIds[index])) return;
  const updates = new Map(orderedFlowIds.map((id, index) => [id, { ...siblings.find((flow) => flow.id === id)!, sequence: index + 1 }]));
  const current = readFlowOverrides();
  commitStorage([[FLOW_OVERRIDES_KEY, JSON.stringify([
    ...current.map((flow) => updates.get(flow.id) ?? flow),
    ...orderedFlowIds.filter((id) => !current.some((flow) => flow.id === id)).map((id) => updates.get(id)!),
  ])]]);
  refresh();
}
export function deleteLocalScreen(screenId: string) {
  const screen = getSnapshot().find((item) => item.id === screenId);
  if (!screen) throw new Error("This Screen no longer exists.");
  // Update every stored Flow definition, not only the consolidated UI projection.
  // Compatibility flows can be folded together for display; leaving a reference
  // in either raw definition would reintroduce the deleted Screen during export.
  const currentFlows = readFlowOverrides();
  const overrideById = new Map(currentFlows.map((flow) => [flow.id, flow]));
  const storedFlows = [
    ...seededFlows.map((flow) => overrideById.get(flow.id) ?? flow),
    ...currentFlows.filter((flow) => !seededFlows.some((seeded) => seeded.id === flow.id)),
  ];
  const flowUpdates = storedFlows.filter((flow) => flow.screenIds.includes(screenId)).map((flow) => ({ ...flow, screenIds: flow.screenIds.filter((id) => id !== screenId) }));
  const groupUpdates = getGroupSnapshot().filter((group) => group.screenIds?.includes(screenId)).map((group) => ({ ...group, screenIds: group.screenIds.filter((id) => id !== screenId) }));
  const currentGroups = readGroupOverrides();
  const changes: [string, string | null][] = [
    [PUBLISHED_KEY, JSON.stringify(readPublished().filter((item) => item.id !== screenId))],
    [DELETED_SCREENS_KEY, JSON.stringify([...new Set([...readDeletedScreenIds(), screenId])])],
  ];
  if (flowUpdates.length) {
    const updates = new Map(flowUpdates.map((flow) => [flow.id, flow]));
    changes.push([FLOW_OVERRIDES_KEY, JSON.stringify([...currentFlows.map((flow) => updates.get(flow.id) ?? flow), ...flowUpdates.filter((flow) => !currentFlows.some((current) => current.id === flow.id))])]);
  }
  if (groupUpdates.length) {
    const updates = new Map(groupUpdates.map((group) => [group.id, group]));
    changes.push([GROUP_OVERRIDES_KEY, JSON.stringify([...currentGroups.map((group) => updates.get(group.id) ?? group), ...groupUpdates.filter((group) => !currentGroups.some((current) => current.id === group.id))])]);
  }
  commitStorage(changes);
}

// Serialize and validate first; restore previous values if any write fails.
// This handles quota/security exceptions, not a browser process interruption.
export function commitStorage(changes: [string, string | null][]) {
  const previous = changes.map(([key]) => [key, window.localStorage.getItem(key)] as const);
  const completed: number[] = [];
  try {
    changes.forEach(([key, value], index) => {
      if (value === previous[index][1]) return;
      if (value === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
      completed.push(index);
    });
  } catch (error) {
    try {
      for (const index of completed.reverse()) {
        const [key, value] = previous[index];
        if (value === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, value);
      }
    } catch {
      throw new Error("Saving failed and could not be fully rolled back. Keep this form open; do not retry until storage access is restored.");
    } finally { refresh(); }
    throw error;
  }
  refresh();
}

export function publishLocalScreen(screen: Screen, placement?: { flowId: string; insertAfterScreenId: string | null }, options?: { preserveDraft?: boolean; newFlow?: Flow }) {
  const current = readPublished();
  const next = [...current.filter((item) => item.id !== screen.id), screen];
  const changes: [string, string | null][] = [];
  if (options?.newFlow) {
    validateNewFlow(options.newFlow);
    if (placement?.flowId !== options.newFlow.id) throw new Error("Choose the new Flow before publishing.");
  }
  if (placement) {
    const flows = getFlowSnapshot();
    const flow = options?.newFlow ?? flows.find((item) => item.id === resolveFlowId(placement.flowId, flows));
    if (!flow) throw new Error("This Flow is no longer available. Choose a Flow before publishing.");
    if (flow.businessUnitId !== screen.businessUnitId) throw new Error("Choose a Flow in the same Business Unit.");
    const existingIds = flow.screenIds.filter((id) => id !== screen.id);
    if (placement.insertAfterScreenId !== null && !existingIds.includes(placement.insertAfterScreenId)) throw new Error("The insertion position is no longer available. Choose a position again.");
    const index = placement.insertAfterScreenId === null ? 0 : existingIds.indexOf(placement.insertAfterScreenId) + 1;
    const updated = { ...flow, screenIds: [...existingIds.slice(0, index), screen.id, ...existingIds.slice(index)] };
    const overrides = [...readFlowOverrides().filter((item) => item.id !== updated.id), updated];
    changes.push([FLOW_OVERRIDES_KEY, JSON.stringify(overrides)]);
    if (options?.newFlow) changes.push([DELETED_FLOWS_KEY, JSON.stringify(readDeletedFlowIds().filter((id) => id !== updated.id))]);
  }
  changes.push([PUBLISHED_KEY, JSON.stringify(next)]);
  const deletedScreenIds = readDeletedScreenIds();
  if (deletedScreenIds.includes(screen.id)) changes.push([DELETED_SCREENS_KEY, JSON.stringify(deletedScreenIds.filter((id) => id !== screen.id))]);
  if (!options?.preserveDraft) changes.push([DRAFT_KEY, null]);
  commitStorage(changes);
}

export function updateExistingScreenPreview(screenId: string, platform: "mobile" | "web", preview: string | null, clearAnnotations = false, dimensions?: { width: number; height: number }, optionId?: string) {
  const existing = getSnapshot().find((screen) => screen.id === screenId);
  if (!existing) throw new Error(`Screen ${screenId} was not found.`);

  const updateOptions = (options: Screen["states"]) => options.map((option) => option.id === optionId || (!optionId && option.isDefault) ? { ...option, preview } : option);
  const states = updateOptions(existing.states);
  const variants = updateOptions(existing.variants);
  const annotations = clearAnnotations
    ? (existing.annotations ?? []).filter((annotation) => annotation.platform !== platform || (optionId ? annotation.stateId !== optionId && annotation.variantId !== optionId : false))
    : existing.annotations;
  const versionHistory = existing.versionHistory?.[platform]?.map((snapshot) => snapshot.status === "current"
    ? { ...snapshot, preview: optionId ? snapshot.preview : preview, states: updateOptions(snapshot.states), variants: updateOptions(snapshot.variants), annotations: clearAnnotations ? annotations ?? [] : snapshot.annotations }
    : snapshot);
  const representation = existing.representations?.[platform];
  const baseRepresentation = representation ?? {
    status: existing.status ?? "active",
    description: existing.description,
    whenItAppears: existing.whenItAppears,
    currentVersion: existing.currentVersion,
    versions: existing.versions,
    jiraTicket: existing.jiraTicket,
    relatedTickets: existing.relatedTickets,
    components: existing.components,
    states,
    variants,
    evidence: existing.evidence,
    figmaHref: existing.figmaHref,
    uploadedBy: existing.uploadedBy,
    lastUpdated: existing.lastUpdated,
    annotations: existing.annotations?.filter((annotation) => annotation.platform === platform),
  };
  const nextRepresentation = {
    ...baseRepresentation,
    ...representation,
    preview: optionId ? baseRepresentation.preview : preview,
    ...(dimensions ? { dimensions: `${dimensions.width} × ${dimensions.height}` } : {}),
    states: updateOptions(baseRepresentation.states ?? []),
    variants: updateOptions(baseRepresentation.variants ?? []),
    annotations: clearAnnotations ? annotations : baseRepresentation.annotations,
    versionHistory: baseRepresentation.versionHistory?.map((snapshot) => snapshot.status === "current"
      ? { ...snapshot, preview: optionId ? snapshot.preview : preview, states: updateOptions(snapshot.states), variants: updateOptions(snapshot.variants), annotations: clearAnnotations ? annotations ?? [] : snapshot.annotations }
      : snapshot),
  };

  const updated: Screen = {
    ...existing,
    states,
    variants,
    ...(platform === "mobile" ? { preview: optionId ? existing.preview : preview, annotations } : {}),
    representations: {
      ...existing.representations,
      [platform]: nextRepresentation,
    },
    versionHistory: versionHistory ? { ...existing.versionHistory, [platform]: versionHistory } : existing.versionHistory,
  };

  publishLocalScreen(updated, undefined, { preserveDraft: true });
}

function nextVersionLabel(value: string, usedVersions: Set<string>) {
  const match = /^v?(\d+)\.(\d+)$/.exec(value.trim());
  const major = match ? Number(match[1]) : 1;
  let minor = match ? Number(match[2]) + 1 : 1;
  let candidate = `v${major}.${minor}`;
  while (usedVersions.has(candidate)) candidate = `v${major}.${++minor}`;
  return candidate;
}

export function recordFigmaCheck(screenId: string, checkedSource: FigmaSource, result: FigmaUpdateCheck) {
  const existing = getSnapshot().find((screen) => screen.id === screenId);
  if (!existing) throw new Error("This Screen no longer exists.");
  if (!existing.figmaSource) throw new Error("The linked Figma source is no longer available.");
  const source = existing.figmaSource;
  if (source.url !== checkedSource.url || source.fileKey !== checkedSource.fileKey || source.nodeId !== checkedSource.nodeId) {
    throw new Error("The Figma source changed while the update check was running. Check the latest source again.");
  }
  if (result.frame.url !== source.url || result.frame.fileKey !== source.fileKey || result.frame.nodeId !== source.nodeId) {
    throw new Error("The update result does not match this Screen's linked Figma frame.");
  }
  const checkedAt = Number.isNaN(new Date(result.checkedAt).getTime()) ? new Date().toISOString() : result.checkedAt;
  const changed = result.frame.fingerprint !== source.lastSyncedFingerprint;
  const persistedResult = { ...result, checkedAt, changed };
  publishLocalScreen({
    ...existing,
    figmaSource: { ...source, name: result.frame.name, resolvedAt: checkedAt, lastCheckedAt: checkedAt },
    pendingFigmaUpdate: changed ? persistedResult : undefined,
  }, undefined, { preserveDraft: true });
}

function defaultPreviewOptions(options: Screen["variants"], preview: string) {
  return options.map((option, index) => option.isDefault || (index === 0 && !options.some(item => item.isDefault)) ? { ...option, preview } : option);
}

export function createVersionFromFigma(screenId: string, platform: ScreenPlatform, frame: FigmaResolvedFrame, checkedAt: string) {
  const existing = getSnapshot().find((screen) => screen.id === screenId);
  if (!existing) throw new Error("This Screen no longer exists.");
  if (!existing.figmaSource) throw new Error("Attach a Figma source before creating a Figma version.");
  if (frame.fileKey !== existing.figmaSource.fileKey || frame.nodeId !== existing.figmaSource.nodeId) throw new Error("The resolved frame does not match this Screen source.");
  if (frame.url !== existing.figmaSource.url) throw new Error("The Figma source changed while this update was pending. Check the latest source before creating a version.");
  if (frame.fingerprint === existing.figmaSource.lastSyncedFingerprint) throw new Error("This Figma snapshot is already the Current version.");

  const representation = existing.representations?.[platform];
  const history = representation?.versionHistory ?? existing.versionHistory?.[platform] ?? [];
  const currentVersion = representation?.currentVersion ?? existing.currentVersion ?? "v1.0";
  const nextVersion = nextVersionLabel(currentVersion, new Set(history.map(snapshot => snapshot.version)));
  const now = checkedAt || new Date().toISOString();
  const preview = representation?.preview ?? (platform === "mobile" ? existing.preview : undefined);
  const variants = representation?.variants ?? (platform === "mobile" ? existing.variants : []);
  const states = representation?.states ?? (platform === "mobile" ? existing.states : []);
  const annotations = representation?.annotations ?? (platform === "mobile" ? existing.annotations ?? [] : []);
  const source = { ...existing.figmaSource, name: frame.name, resolvedAt: now, lastCheckedAt: now, lastSyncedAt: now, lastSyncedFingerprint: frame.fingerprint };
  const fallbackCurrent: VersionSnapshot = {
    sourceType: existing.sourceType ?? "upload",
    figmaSource: existing.figmaSource,
    id: `${existing.id}.${platform}.${currentVersion.replace(/[^a-zA-Z0-9]+/g, "-")}`,
    version: currentVersion,
    status: "current",
    createdAt: existing.lastUpdated ?? now,
    lastUpdated: existing.lastUpdated ?? now,
    uploadedBy: existing.uploadedBy ?? "Not documented",
    preview,
    description: representation?.description ?? existing.description,
    whenItAppears: representation?.whenItAppears ?? existing.whenItAppears,
    purpose: existing.purpose,
    jiraTicket: representation?.jiraTicket ?? existing.jiraTicket,
    relatedTickets: representation?.relatedTickets ?? existing.relatedTickets,
    figmaHref: representation?.figmaHref ?? existing.figmaHref,
    components: representation?.components ?? existing.components,
    variants,
    states,
    annotations,
    evidence: representation?.evidence ?? existing.evidence,
  };
  const historyWithCurrent = history.some(snapshot => snapshot.status === "current" || snapshot.version === currentVersion) ? history : [fallbackCurrent, ...history];
  const seenVersions = new Set<string>();
  const archived = historyWithCurrent
    .map(snapshot => ({ ...snapshot, status: "archived" as const }))
    .filter(snapshot => snapshot.version !== nextVersion && !seenVersions.has(snapshot.version) && Boolean(seenVersions.add(snapshot.version)));
  const nextVariants = defaultPreviewOptions(variants, frame.preview);
  const nextStates = defaultPreviewOptions(states, frame.preview);
  const nextSnapshot: VersionSnapshot = {
    ...fallbackCurrent,
    sourceType: "figma",
    figmaSource: source,
    id: `${existing.id}.${platform}.${nextVersion.replace(/[^a-zA-Z0-9]+/g, "-")}.${frame.fingerprint.replace(/[^a-zA-Z0-9]+/g, "-")}`,
    version: nextVersion,
    status: "current",
    createdAt: now,
    lastUpdated: now,
    preview: frame.preview,
    figmaHref: frame.url,
    variants: nextVariants,
    states: nextStates,
    changelog: ["Created from the latest linked Figma frame snapshot."],
  };
  const versionHistory = [nextSnapshot, ...archived];
  const nextRepresentation = {
    ...representation,
    status: representation?.status ?? existing.status ?? "active" as const,
    preview: frame.preview,
    currentVersion: nextVersion,
    versions: [{ id: nextSnapshot.id, label: nextVersion, date: now, note: "Synced from linked Figma frame" }, ...(representation?.versions ?? []).filter(version => version.label !== nextVersion)],
    figmaHref: frame.url,
    lastUpdated: now,
    variants: nextVariants,
    states: nextStates,
    versionHistory,
  };
  const updated: Screen = {
    ...existing,
    sourceType: "figma",
    figmaSource: source,
    pendingFigmaUpdate: undefined,
    figmaHref: frame.url,
    currentVersion: nextVersion,
    lastUpdated: now,
    versions: [{ id: nextSnapshot.id, label: nextVersion, date: now, note: "Synced from linked Figma frame" }, ...existing.versions.filter(version => version.label !== nextVersion)],
    ...(platform === "mobile" ? { preview: frame.preview, variants: nextVariants, states: nextStates } : {}),
    representations: { ...existing.representations, [platform]: nextRepresentation },
    versionHistory: { ...existing.versionHistory, [platform]: versionHistory },
  };
  publishLocalScreen(updated, undefined, { preserveDraft: true });
}
export function saveScreenDraft(draft: ScreenDraft) {
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function loadScreenDraft(): ScreenDraft | undefined {
  try { const value = window.localStorage.getItem(DRAFT_KEY); return value ? JSON.parse(value) as ScreenDraft : undefined; }
  catch { return undefined; }
}

export function clearScreenDraft() {
  window.localStorage.removeItem(DRAFT_KEY);
}

export const localInventoryNotice = "Local Edition: screens and image data stay in this browser and are not stored in the cloud.";


export const localScreens: ScreenRepository = {
  subscribe, getSnapshot, getServerSnapshot: () => seededScreens,
  publish: publishLocalScreen, delete: deleteLocalScreen, updatePreview: updateExistingScreenPreview, recordFigmaCheck, createVersionFromFigma,
  saveDraft: saveScreenDraft, loadDraft: loadScreenDraft, discardDraft: clearScreenDraft,
};
export const localFlows: FlowRepository = {
  subscribe, getSnapshot: getFlowSnapshot, getServerSnapshot: () => serverFlows,
  create: createLocalFlow, createInGroup: createLocalFlowInGroup, update: updateLocalFlow,
  delete: deleteLocalFlow, reorder: reorderLocalFlowScreens, reorderSiblings: reorderLocalFlows,
};
export const localGroups: GroupRepository = {
  subscribe, getSnapshot: getGroupSnapshot, getServerSnapshot: () => seededScreenGroups,
  create: createLocalScreenGroup, rename: renameLocalScreenGroup, move: moveLocalScreenGroup,
  deletionBlocker: groupDeletionBlocker, permanentDeletionBlocker: permanentGroupDeletionBlocker,
  deleteEmpty: deleteEmptyLocalScreenGroup, delete: deleteLocalScreenGroup, deletePermanently: permanentlyDeleteLocalScreenGroup,
  findForRoute(id) {
    try { const group = readGroupOverrides().find(group => group.id === id); if (group) return group; }
    catch { /* Preserve the legacy route fallback without writing defaults. */ }
    return seededScreenGroups.find(group => group.id === id);
  },
};
export const localProducts: ProductRepository = {
  subscribe, getSnapshot: getBusinessUnits, getServerSnapshot: () => seededBusinessUnits,
  create: createLocalBusinessUnit, rename: renameLocalBusinessUnit, delete: deleteLocalBusinessUnit, contents: businessUnitContents,
};
export const localNoteTypes: NoteTypeRepository = {
  subscribe, getSnapshot: readCustomNoteTypes, getServerSnapshot: () => emptyNoteTypes, create: createCustomNoteType,
};
