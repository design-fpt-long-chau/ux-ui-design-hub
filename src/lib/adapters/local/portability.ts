import { flows as seedFlows, screenGroups as seedGroups, screens as seedScreens } from "@/data/design-library";
import type { LibraryData, ImportPlan, PortabilityRepository } from "@/lib/portability/contracts";
import { createPackage, readPackage, mergeLibrary, validateData } from "@/lib/portability/package";
import { localScreens, localGroups, localFlows, localProducts, localNoteTypes, commitStorage } from "@/lib/adapters/local/inventory";
import { localComponentTags } from "@/lib/adapters/local/component-tags";
import { flowOwnerGroupId, resolveFlowId } from "@/lib/flow-context";
const prefix = "lc-library.phase1.";
const keys = { products: prefix + "business-unit-overrides", groups: prefix + "screen-group-overrides", flows: prefix + "flow-overrides", screens: prefix + "published-screens", noteTypes: prefix + "custom-note-types", componentTags: prefix + "component-tags", draft: prefix + "add-screen-draft", deletedGroups: prefix + "deleted-screen-group-ids", deletedFlows: prefix + "deleted-flow-ids", deletedScreens: prefix + "deleted-screen-ids" };
function rawState() { return Object.fromEntries(Object.values(keys).map(key => [key,window.localStorage.getItem(key)])); }
function read(raw: Record<string,string|null>, key: string, fallback: unknown = []) { return raw[key] === null ? fallback : JSON.parse(raw[key]); }
function checkedState() {
  const raw = rawState();
  for (const key of Object.values(keys)) {
    const value = read(raw,key,key === keys.products ? { overrides: [], deletedIds: [] } : key === keys.draft ? {} : []);
    if (key === keys.products ? !value || !Array.isArray(value.overrides) || !Array.isArray(value.deletedIds) : key === keys.draft ? !value || typeof value !== "object" || Array.isArray(value) : !Array.isArray(value)) throw new Error("Existing local data is unreadable. No changes were made.");
  }
  return raw;
}
function snapshot(raw: Record<string,string|null>): LibraryData {
  const screens = localScreens.getSnapshot(), groups = localGroups.getSnapshot().map(group => ({ ...group, screenIds: screens.filter(screen => screen.screenGroupId === group.id).map(screen => screen.id) }));
  return {
    products: localProducts.getSnapshot().map(unit => ({ ...unit, groupIds: groups.filter(group => (group.businessUnitId ?? group.id.split(".")[0]) === unit.id).map(group => group.id) })),
    groups, screens, flows: localFlows.getSnapshot().map(flow => ({ ...flow, screenGroupId: flowOwnerGroupId(flow), ...(flow.parentGroupId ? { parentGroupId: flowOwnerGroupId(flow) } : {}) })),
    noteTypes: localNoteTypes.getSnapshot(), componentTags: localComponentTags.getSnapshot(),
    localRecovery: Object.fromEntries(Object.entries(raw).filter(([,value]) => value !== null).map(([key,value]) => [key,JSON.parse(value!)])),
  };
}
async function localAsset(reference: string) {
  if (reference.startsWith("//")) throw new Error("External asset.");
  const response = await fetch(reference, { mode: "same-origin", redirect: "error" });
  if (!response.ok) throw new Error("Asset unavailable.");
  const blob = await response.blob();
  return new Promise<string>((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); });
}
let pending: { token: string; raw: Record<string,string|null>; writes: [string,string|null][] } | undefined;
const mergeRaw = <T extends {id:string}>(stored:T[], updates:T[]) => [...new Map([...stored,...updates].map(item => [item.id,item])).values()];
export const localPortability: PortabilityRepository = {
  async exportLibrary(kind) {
    const raw = checkedState();
    return createPackage(snapshot(raw), kind, localAsset);
  },
  async previewImport(bytes, strategy) {
    pending = undefined;
    if (!["keep-existing","use-incoming","restore-clean"].includes(strategy)) throw new Error("Choose an import strategy.");
    const imported = await readPackage(bytes), raw = checkedState(), current = snapshot(raw);
    const pristine = Object.values(raw).every(value => value === null);
    if (strategy === "restore-clean" && !pristine) throw new Error("Clean restore is only available in a browser with no saved Library records or draft. Use a separate browser/profile; do not clear your data.");
    const unitState = read(raw,keys.products,{ overrides: [], deletedIds: [] });
    if (strategy !== "restore-clean") {
      for (const [items, deleted] of [[imported.data.products,unitState.deletedIds],[imported.data.groups,read(raw,keys.deletedGroups)],[imported.data.flows,read(raw,keys.deletedFlows)],[imported.data.screens,read(raw,keys.deletedScreens)]] as [{id:string}[],string[]][]) {
        if (items.some(item => deleted.includes(item.id))) throw new Error("This package contains locally deleted IDs. Import into a clean browser to restore them; existing deletions were not changed.");
      }
    }
    const { result, summary } = strategy === "restore-clean" ? { result: imported.data, summary: { added: imported.data.products.length + imported.data.groups.length + imported.data.flows.length + imported.data.screens.length, identical: 0, conflicts: [], counts: imported.counts, warnings: [] as string[] } } : mergeLibrary(current,imported.data,strategy);
    validateData(result);
    summary.counts = imported.counts;
    summary.warnings.push(...imported.warnings, "Identity, preferences and saved drafts are not overwritten. Raw Local recovery data is archived only.");
    if (strategy === "restore-clean") summary.warnings.push("Restore replaces the built-in seed view in this clean browser with the package inventory.");
    const writes: [string,string|null][] = [
      [keys.products,JSON.stringify({ ...unitState, overrides: mergeRaw(unitState.overrides,result.products), deletedIds: strategy === "restore-clean" ? current.products.filter(item => !result.products.some(next => next.id === item.id)).map(item => item.id) : unitState.deletedIds })],
      ...(["groups","flows","screens","noteTypes"] as const).map(name => [keys[name],JSON.stringify(mergeRaw(read(raw,keys[name]),result[name]))] as [string,string]),
      [keys.componentTags,JSON.stringify(result.componentTags)],
    ];
    if (strategy === "restore-clean") for (const [name,key] of [["groups",keys.deletedGroups],["flows",keys.deletedFlows],["screens",keys.deletedScreens]] as const) writes.push([key,JSON.stringify([...new Set([...current[name], ...({ groups: seedGroups, flows: seedFlows, screens: seedScreens }[name])].filter(item => !result[name].some(next => next.id === (name === "flows" ? resolveFlowId(item.id,current.flows) : item.id))).map(item => item.id))])]);
    const token = crypto.randomUUID();
    pending = { token, raw, writes };
    return { token, summary } satisfies ImportPlan;
  },
  async applyImport(token) {
    const plan = pending;
    if (!plan || plan.token !== token) throw new Error("Import preview expired. Review the package again.");
    if (JSON.stringify(rawState()) !== JSON.stringify(plan.raw)) { pending = undefined; throw new Error("Library changed since preview. Review again before importing."); }
    commitStorage(plan.writes);
    pending = undefined;
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new Event("lc-component-tags-changed"));
  },
};
