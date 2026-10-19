import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { webcrypto } from "node:crypto";
import { test } from "node:test";
import ts from "typescript";
function runtime(initial = new Map()) {
  const storage = new Map(initial), cache = new Map(), events = new EventTarget();
  let failAt = -1, writes = 0;
  const localStorage = { getItem: key => storage.get(key) ?? null, setItem(key,value) { if (++writes === failAt) throw new Error("QuotaExceededError"); storage.set(key,value); }, removeItem: key => storage.delete(key) };
  events.localStorage = localStorage;
  function load(name, parent = path.resolve("src")) {
    const file = (name.startsWith("@/") ? path.resolve("src",name.slice(2)) : path.resolve(path.dirname(parent),name)) + ".ts";
    if (cache.has(file)) return cache.get(file);
    const exports = {}; cache.set(file,exports);
    const code = ts.transpileModule(readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    vm.runInNewContext(code,{exports,require: n => load(n,file),window:events,localStorage,Event,TextEncoder,TextDecoder,Uint8Array,ArrayBuffer,DataView,crypto:webcrypto,atob,btoa,fetch:async()=>{throw Error("offline");}}, {filename:file});
    return exports;
  }
  return { storage, load, failAfter(n) { failAt = writes + n; }, invalidate() { events.dispatchEvent(new Event("storage")); } };
}
const key = name => `lc-library.phase1.${name}`;
const plain = value => JSON.parse(JSON.stringify(value));
async function exported(rt) { return rt.load("@/lib/adapters/local/portability").localPortability.exportLibrary("backup"); }

test("seed inventory exports and round-trips through clean restore without changing IDs/order", async () => {
  const source = runtime(); const before = [...source.storage]; const file = await exported(source);
  assert.deepEqual([...source.storage],before);
  const target = runtime(), api = target.load("@/lib/adapters/local/portability").localPortability;
  const plan = await api.previewImport(file.bytes,"restore-clean"); assert.equal(target.storage.size,0);
  await api.applyImport(plan.token);
  const again = await exported(target);
  assert.deepEqual(plain(file.counts),plain(again.counts));
  const format = source.load("@/lib/portability/package");
  const a = await format.readPackage(file.bytes), b = await format.readPackage(again.bytes);
  for(const type of ["products","groups","flows","screens"]) assert.deepEqual(plain(a.data[type]),plain(b.data[type]));
});

test("assets, legacy fields, annotations, drafts and conflict strategies are safe", async () => {
  const source = runtime(), inv = source.load("@/lib/adapters/local/inventory");
  const base = plain(inv.localScreens.getSnapshot()[0]);
  const preview = "data:image/png;base64,iVBORw0KGgo=";
  const screen = {...base, name:"QA changed", preview, legacyUnknown:{keep: true}, annotations:[{id:"note",platform:"mobile",title:"QA",description:"note"}], states:[{id:"state",name:"State",preview}], variants:[{id:"variant",name:"Variant",preview}], representations:{mobile:{status:"active",preview}}};
  inv.localScreens.publish(screen,undefined,{preserveDraft:true});
  source.storage.set(key("add-screen-draft"),JSON.stringify({title:"unsaved",preview})); source.invalidate();
  const file = await exported(source); assert.equal(file.counts.assets,1); assert.ok(file.counts.annotations >= 1);
  const target = runtime(), api = target.load("@/lib/adapters/local/portability").localPortability;
  const plan = await api.previewImport(file.bytes,"keep-existing"); assert.ok(plan.summary.conflicts.some(item=>item.id===base.id));
  await api.applyImport(plan.token);
  assert.notEqual(JSON.parse(target.storage.get(key("published-screens"))).find(item=>item.id===base.id).name,"QA changed");
  const replace = await api.previewImport(file.bytes,"use-incoming"); await api.applyImport(replace.token);
  const restored = JSON.parse(target.storage.get(key("published-screens"))).find(item=>item.id===base.id);
  assert.equal(restored.preview,preview); assert.deepEqual(restored.legacyUnknown,{keep:true}); assert.equal(restored.states[0].preview,preview); assert.equal(restored.variants[0].id,"variant"); assert.equal(restored.annotations[0].id,"note");
  assert.equal(target.storage.has(key("add-screen-draft")),false);
  assert.equal(JSON.parse(source.storage.get(key("add-screen-draft"))).title,"unsaved");
});

test("quota failure rolls back exact original JSON and stale previews cannot apply", async () => {
  const source = runtime(), file = await exported(source), target = runtime();
  const api = target.load("@/lib/adapters/local/portability").localPortability;
  const plan = await api.previewImport(file.bytes,"keep-existing"), before = [...target.storage];
  target.failAfter(3); await assert.rejects(api.applyImport(plan.token),/QuotaExceededError/);
  assert.deepEqual([...target.storage],before);
  const next = await api.previewImport(file.bytes,"keep-existing"); target.storage.set(key("add-screen-draft"),"{}");
  await assert.rejects(api.applyImport(next.token),/changed since preview/);
  assert.equal(target.storage.size,1);
  await assert.rejects(api.previewImport(file.bytes,"restore-clean"),/Clean restore/);
});

test("corruption, unsupported schema, duplicate IDs and orphan relationships reject before writes", async () => {
  const rt = runtime(), file = await exported(rt), zip = rt.load("@/lib/portability/zip"), format = rt.load("@/lib/portability/package");
  const api = rt.load("@/lib/adapters/local/portability").localPortability;
  const broken = file.bytes.slice(); broken[35] ^= 1; await assert.rejects(api.previewImport(broken,"keep-existing"));
  const entries = zip.decodeZip(file.bytes), manifest = JSON.parse(new TextDecoder().decode(entries.get("manifest.json"))); manifest.schemaVersion = 99; entries.set("manifest.json",new TextEncoder().encode(JSON.stringify(manifest)));
  await assert.rejects(api.previewImport(zip.encodeZip(entries),"keep-existing"),/version/);
  const {data} = await format.readPackage(file.bytes);
  assert.throws(()=>format.validateData({...data,screens:[...data.screens,data.screens[0]]}),/duplicate/);
  assert.throws(()=>format.validateData({...data,flows:[{...data.flows[0],screenIds:["missing"]}]}),/Missing/);
  assert.equal(rt.storage.size,0);
});


test("clean restore can reproduce an empty library; merge preserves unrelated saved records", async () => {
  const rt = runtime(), format = rt.load("@/lib/portability/package"), api = rt.load("@/lib/adapters/local/portability").localPortability;
  const empty = {products:[],groups:[],flows:[],screens:[],noteTypes:[],componentTags:[]};
  const bundle = await format.createPackage(empty,"backup");
  const plan = await api.previewImport(bundle.bytes,"restore-clean"); await api.applyImport(plan.token);
  const result = await exported(rt);
  assert.equal(result.counts.screens,0); assert.equal(result.counts.flows,0); assert.equal(result.counts.groups,0); assert.equal(result.counts.products,0);
  const other = runtime(), inv = other.load("@/lib/adapters/local/inventory");
  const product = inv.localProducts.create("QA retained product");
  const before = [...other.storage];
  const merge = other.load("@/lib/adapters/local/portability").localPortability;
  const preview = await merge.previewImport(bundle.bytes,"keep-existing");
  assert.deepEqual([...other.storage],before);
  await merge.applyImport(preview.token);
  assert.ok(inv.localProducts.getSnapshot().some(item=>item.id===product.id));
});
