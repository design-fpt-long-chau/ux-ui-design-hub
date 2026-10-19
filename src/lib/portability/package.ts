import type { LibraryData, ImportStrategy, ImportSummary } from "./contracts";
import { encodeZip, decodeZip } from "@/lib/portability/zip";
const imageTypes: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };
const hash = async (bytes: Uint8Array) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes as Uint8Array<ArrayBuffer>))).map(value => value.toString(16).padStart(2, "0")).join("");
function overlay(existing: unknown, incoming: unknown): unknown {
  if (!existing || !incoming || typeof existing !== "object" || typeof incoming !== "object" || Array.isArray(existing) || Array.isArray(incoming)) return incoming;
  const result: Record<string,unknown> = { ...existing };
  for (const [key,value] of Object.entries(incoming)) result[key] = overlay((existing as Record<string,unknown>)[key],value);
  return result;
}
const same = (a: unknown, b: unknown): boolean => stable(a) === stable(b);
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).map(([key,item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value);
}
async function walk(value: unknown, transform: (value: string, key: string) => Promise<string>, key = "", depth = 0): Promise<unknown> {
  if (depth > 60) throw new Error("Package nesting is too deep.");
  if (typeof value === "string") return transform(value, key);
  if (Array.isArray(value)) return Promise.all(value.map(item => walk(item, transform, key, depth + 1)));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [name, item] of Object.entries(value)) {
      if (["__proto__", "constructor", "prototype"].includes(name)) throw new Error("Unsafe object key in package.");
      out[name] = await walk(item, transform, name, depth + 1);
    }
    return out;
  }
  return value;
}
export function counts(data: LibraryData, assets = 0) {
  const annotations = new Set<string>();
  function visit(value: unknown, scope: string, key = "") {
    if (Array.isArray(value)) value.forEach((item, index) => {
      if (key === "annotations" && item && typeof item === "object") annotations.add(`${scope}:${item.platform ?? ""}:${item.id ?? index}`);
      visit(item, scope);
    });
    else if (value && typeof value === "object") Object.entries(value).forEach(([name,item]) => visit(item, scope, name));
  }
  data.screens.forEach(screen => visit(screen, screen.id));
  return { products: data.products.length, groups: data.groups.length, flows: data.flows.length, screens: data.screens.length, assets, annotations: annotations.size };
}
export function validateData(value: unknown): asserts value is LibraryData {
  if (!value || typeof value !== "object") throw new Error("Missing library data.");
  const data = value as LibraryData;
  for (const key of ["products", "groups", "flows", "screens", "noteTypes"] as const) {
    const records = data[key];
    if (!Array.isArray(records) || records.length > 50000) throw new Error(`Invalid ${key} collection.`);
    const ids = new Set<string>();
    for (const record of records) {
      if (!record || typeof record.id !== "string" || !record.id || typeof record.name !== "string" || !record.name.trim() || ids.has(record.id)) throw new Error(`Invalid or duplicate ${key} ID.`);
      ids.add(record.id);
      if (key !== "noteTypes" && (typeof (record as {slug?: string}).slug !== "string" || !(record as {slug?: string}).slug)) throw new Error(`Missing ${key} route slug.`);
    }
  }
  if (!Array.isArray(data.componentTags) || data.componentTags.some(tag => typeof tag !== "string")) throw new Error("Invalid component tags.");
  const inspect = (value: unknown, depth = 0) => {
    if (depth > 60) throw new Error("Package nesting is too deep.");
    if (Array.isArray(value)) { value.forEach(item => inspect(item,depth + 1)); return; }
    if (!value || typeof value !== "object") return;
    for (const [key,item] of Object.entries(value)) {
      if (["states","variants","annotations","versions","relatedTickets","platforms"].includes(key) && item !== undefined && !Array.isArray(item)) throw new Error(`Invalid nested ${key}.`);
      if (["states","variants","annotations"].includes(key) && Array.isArray(item)) for (const entry of item) {
        if (!entry || typeof entry !== "object" || typeof entry.id !== "string" || (key !== "annotations" && typeof entry.name !== "string")) throw new Error(`Invalid nested ${key} record.`);
      }
      if (["description","purpose","whenItAppears","jiraTicket","figmaHref"].includes(key) && item !== undefined && typeof item !== "string") throw new Error(`Invalid text field ${key}.`);
      if (key !== "localRecovery") inspect(item,depth + 1);
    }
  };
  inspect(data);
  const products = new Map(data.products.map(item => [item.id,item]));
  const groups = new Map(data.groups.map(item => [item.id,item]));
  const screens = new Map(data.screens.map(item => [item.id,item]));
  const unit = (group: LibraryData["groups"][number]) => group.businessUnitId ?? group.id.split(".")[0];
  const list = (ids: unknown, label: string): string[] => { if (!Array.isArray(ids) || ids.some(id => typeof id !== "string") || new Set(ids).size !== ids.length) throw new Error(`Invalid ${label} references.`); return ids; };
  for (const product of data.products) for (const id of list(product.groupIds, product.id)) if (!groups.has(id) || unit(groups.get(id)!) !== product.id) throw new Error(`Missing/cross-product group ${id}.`);
  for (const group of data.groups) {
    if (!products.has(unit(group))) throw new Error(`Missing product for group ${group.id}.`);
    let parent = group; const seen = new Set([group.id]);
    while (parent.parentGroupId) {
      const next = groups.get(parent.parentGroupId);
      if (!next || seen.has(next.id) || seen.size >= 3 || unit(next) !== unit(group)) throw new Error(`Invalid parent hierarchy for ${group.id}.`);
      seen.add(next.id); parent = next;
    }
    for (const id of list(group.screenIds, group.id)) if (!screens.has(id) || screens.get(id)!.screenGroupId !== group.id) throw new Error(`Invalid Screen reference ${id} in group ${group.id}.`);
  }
  for (const screen of data.screens) {
    if (!products.has(screen.businessUnitId) || !groups.has(screen.screenGroupId) || unit(groups.get(screen.screenGroupId)!) !== screen.businessUnitId) throw new Error(`Missing ownership for Screen ${screen.id}.`);
    for (const key of ["platforms", "states", "variants", "versions", "components", "relatedTickets"] as const) if (!Array.isArray(screen[key])) throw new Error(`Invalid ${key} for Screen ${screen.id}.`);
    if (!screen.evidence || typeof screen.evidence !== "object") throw new Error(`Missing evidence for Screen ${screen.id}.`);
  }
  for (const flow of data.flows) {
    const group = groups.get(flow.parentGroupId ?? flow.screenGroupId);
    if (!group || !products.has(flow.businessUnitId) || unit(group) !== flow.businessUnitId) throw new Error(`Missing ownership for Flow ${flow.id}.`);
    for (const id of list(flow.screenIds, flow.id)) if (!screens.has(id) || screens.get(id)!.businessUnitId !== flow.businessUnitId) throw new Error(`Missing/cross-product Screen ${id} in Flow ${flow.id}.`);
  }
  for (const [label, records] of [["products", data.products], ["groups", data.groups], ["flows", data.flows], ["screens", data.screens]] as const) {
    const paths = new Set<string>();
    for (const record of records) {
      const r = record as unknown as Record<string,string>;
      const path = `${label === "groups" ? (r.businessUnitId ?? r.id.split(".")[0]) : label === "screens" ? `${r.businessUnitId}/${r.screenGroupId}` : ""}/${r.slug}`;
      if (paths.has(path)) throw new Error(`Conflicting ${label} route: ${path}. Rename before import.`);
      paths.add(path);
    }
  }
}
export async function createPackage(data: LibraryData, kind: "export" | "backup", resolveLocal?: (reference: string) => Promise<string>) {
  validateData(data);
  const encoder = new TextEncoder();
  const entries = new Map<string,Uint8Array>(), assets: Record<string,{mime: string; sha256: string}> = {}, warnings = new Set<string>();
  const processed = new Map<string,Promise<string>>();
  const converted = await walk(data, async (value, key) => {
    const isPreview = key === "preview" || key === "image" || key === "previewUrl";
    if (!value.startsWith("data:image/") && !isPreview) return value;
    if (!value) return value;
    if (processed.has(value)) return processed.get(value)!;
    const task = (async () => {
      let source = value;
      if (!source.startsWith("data:")) {
        if (resolveLocal && (source.startsWith("/") || source.startsWith("blob:"))) {
          try { source = await resolveLocal(source); } catch { warnings.add(`Asset unavailable: ${value}`); return value; }
        } else { warnings.add(`External/unavailable preview retained: ${value}`); return value; }
      }
      const match = /^data:(image\/(?:png|jpeg|webp|gif|avif));base64,([a-zA-Z0-9+/=\s]+)$/.exec(source);
      if (!match) { warnings.add("An unsupported image reference was retained, not embedded."); return value; }
      const bytes = Uint8Array.from(atob(match[2]), char => char.charCodeAt(0)), digest = await hash(bytes), path = `assets/${digest}.${imageTypes[match[1]]}`;
      entries.set(path, bytes); assets[path] = { mime: match[1], sha256: digest };
      return `lc-asset://${path}`;
    })();
    processed.set(value, task); return task;
  });
  const dataBytes = encoder.encode(JSON.stringify(converted));
  const manifest = { format: "lc-design-library", schemaVersion: 1, kind, createdAt: new Date().toISOString(), counts: counts(data, entries.size), assets, warnings: [...warnings], dataSha256: await hash(dataBytes) };
  entries.set("data.json", dataBytes); entries.set("manifest.json", encoder.encode(JSON.stringify(manifest, null, 2)));
  return { filename: `lc-library-${kind}-${manifest.createdAt.replace(/[:.]/g,"-")}.zip`, bytes: encodeZip(entries), counts: manifest.counts, warnings: manifest.warnings };
}
export async function readPackage(bytes: Uint8Array): Promise<{ data: LibraryData; counts: Record<string,number>; warnings: string[] }> {
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const entries = decodeZip(bytes);
  const manifest = JSON.parse(decoder.decode(entries.get("manifest.json"))), raw = entries.get("data.json");
  if (manifest.format !== "lc-design-library" || manifest.schemaVersion !== 1 || !raw || await hash(raw) !== manifest.dataSha256 || !manifest.assets || typeof manifest.assets !== "object") throw new Error("Unsupported version or damaged package.");
  if (entries.size !== Object.keys(manifest.assets).length + 2) throw new Error("Unexpected package entries.");
  const resolved = new Map<string,string>();
  for (const [path, info] of Object.entries(manifest.assets) as [string,{mime:string;sha256:string}][]) {
    const asset = entries.get(path);
    if (!asset || !imageTypes[info.mime] || await hash(asset) !== info.sha256 || path !== `assets/${info.sha256}.${imageTypes[info.mime]}`) throw new Error(`Damaged asset: ${path}`);
    let binary = ""; for (let i = 0; i < asset.length; i += 8192) binary += String.fromCharCode(...asset.subarray(i,i+8192));
    resolved.set(`lc-asset://${path}`, `data:${info.mime};base64,${btoa(binary)}`);
  }
  const data = await walk(JSON.parse(decoder.decode(raw)), async (value,key) => {
    if (value.startsWith("lc-asset://")) { const asset = resolved.get(value); if (!asset) throw new Error("Missing asset reference."); return asset; }
    if ((key === "preview" || key === "image" || key.endsWith("Href")) && /^\s*(javascript:|vbscript:|data:(?!image\/))/i.test(value)) throw new Error("Unsafe URL in package.");
    return value;
  });
  validateData(data);
  const totals = counts(data, resolved.size);
  if (!same(totals, manifest.counts)) throw new Error("Manifest counts do not match package.");
  return { data, counts: totals, warnings: Array.isArray(manifest.warnings) ? manifest.warnings.filter((item: unknown) => typeof item === "string") : [] };
}
export function mergeLibrary(current: LibraryData, incoming: LibraryData, strategy: ImportStrategy) {
  const summary: ImportSummary = { added: 0, identical: 0, conflicts: [], counts: counts(incoming), warnings: [] };
  const merge = <T extends {id:string;name:string}>(entity: string, local: T[], remote: T[]): T[] => {
    const map = new Map(local.map(item => [item.id,item]));
    for (const item of remote) {
      const previous = map.get(item.id);
      if (!previous) { summary.added++; map.set(item.id,item); }
      else if (same(previous,item)) summary.identical++;
      else { summary.conflicts.push({ entity, id: item.id, name: item.name }); if (strategy === "use-incoming") map.set(item.id,overlay(previous,item) as T); }
    }
    return [...map.values()];
  };
  const result: LibraryData = { products: merge("Product",current.products,incoming.products), groups: merge("Group",current.groups,incoming.groups), flows: merge("Flow",current.flows,incoming.flows), screens: merge("Screen",current.screens,incoming.screens), noteTypes: merge("Note type",current.noteTypes,incoming.noteTypes), componentTags: [...new Set([...current.componentTags,...incoming.componentTags])] };
  // Product/group index arrays are derived; Flow order is authoritative and untouched.
  result.products = result.products.map(unit => ({ ...unit, groupIds: result.groups.filter(group => (group.businessUnitId ?? group.id.split(".")[0]) === unit.id).map(group => group.id) }));
  result.groups = result.groups.map(group => ({ ...group, screenIds: result.screens.filter(screen => screen.screenGroupId === group.id).map(screen => screen.id) }));
  validateData(result);
  return { result, summary };
}
