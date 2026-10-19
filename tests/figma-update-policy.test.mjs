import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { test } from "node:test";
import ts from "typescript";

function loadPolicy(clock = Date) {
  const file = path.join(import.meta.dirname, "..", "src", "lib", "figma-update-policy.ts");
  const source = readFileSync(file, "utf8");
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: () => ({}), Date: clock, Map, Promise }, { filename: file });
  return exports;
}

test("five-minute on-open policy skips fresh checks and checks stale sources", () => {
  const policy = loadPolicy();
  const now = Date.parse("2026-10-12T10:00:00.000Z");
  assert.equal(policy.isFigmaCheckStale("2026-10-12T09:55:00.001Z", now), false);
  assert.equal(policy.isFigmaCheckStale("2026-10-12T09:55:00.000Z", now), true);
  assert.equal(policy.isFigmaCheckStale("invalid", now), true);
  assert.equal(policy.isFigmaCheckStale(undefined, now), true);
});

test("manual and on-open checks share one in-flight request per Screen", async () => {
  const policy = loadPolicy();
  const source = { fileKey: "file", nodeId: "1:2", url: "https://www.figma.com/design/file/Test?node-id=1-2", lastCheckedAt: "old", lastSyncedFingerprint: "r1" };
  const frame = { ...source, name: "Frame", preview: "data:image/png;base64,eA==", width: 100, height: 200, fingerprint: "r2" };
  const result = { changed: true, checkedAt: "2026-10-12T10:00:00.000Z", frame };
  let calls = 0;
  let complete;
  const adapter = { checkForUpdate: () => {
    calls += 1;
    return new Promise((resolve) => { complete = resolve; });
  } };
  const persisted = [];
  const persist = (...args) => persisted.push(args);

  const opened = policy.requestFigmaUpdateCheck("screen-1", source, adapter, persist);
  const clicked = policy.requestFigmaUpdateCheck("screen-1", source, adapter, persist);
  assert.strictEqual(opened, clicked);
  assert.equal(calls, 1);
  complete(result);
  assert.deepEqual(await Promise.all([opened, clicked]), [result, result]);
  assert.equal(persisted.length, 1);

  const next = policy.requestFigmaUpdateCheck("screen-1", source, { checkForUpdate: async () => {
    calls += 1;
    return result;
  } }, persist);
  await next;
  assert.equal(calls, 2, "a completed request must not block a later manual check");
  assert.equal(persisted.length, 2);
});


test("429 cooldown honors Retry-After, backs off, blocks spam and resets after success", async () => {
  let now = 100000;
  class Clock extends Date { static now() { return now; } }
  const policy = loadPolicy(Clock);
  let calls = 0, writes = 0, fail = true;
  const source = { fileKey: "qa", nodeId: "1:2" };
  const adapter = { checkForUpdate: async () => {
    calls++;
    if (fail) throw Object.assign(new Error("429"), { code: "rate_limited", retryAfterMs: calls === 1 ? 12000 : undefined });
    return { changed: true, checkedAt: "now", frame: { fingerprint: "v2" } };
  } };
  const check = () => policy.requestFigmaUpdateCheck("qa", source, adapter, () => writes++);
  await assert.rejects(check(), e => e.retryAt === 112000);
  for (let i=0;i<5;i++) await assert.rejects(check(), e => e.code === "rate_limited");
  assert.equal(calls, 1); assert.equal(writes, 0);
  now = 112000;
  await assert.rejects(check(), e => e.retryAt === 122000);
  now = 122000; fail = false;
  await check(); assert.equal(writes, 1);
  fail = true;
  await assert.rejects(check(), e => e.retryAt === 127000);
});
test("short Retry-After overrides fallback and preserves diagnostics during cooldown",async()=>{
 let now=1000;
 class Clock extends Date {static now(){return now;}}
 const p=loadPolicy(Clock);let calls=0;
 const check=()=>p.requestFigmaUpdateCheck("short",{}, {checkForUpdate:async()=>{calls++;throw Object.assign(new Error("429"),{code:"rate_limited",retryAfterMs:2000,rateLimit:{planTier:"starter",type:"low"}});}},()=>assert.fail("must not persist"));
 await assert.rejects(check(),e=>e.retryAt===3000&&e.rateLimit.planTier==="starter");
 now=2999;await assert.rejects(check(),e=>e.retryAt===3000&&e.rateLimit.type==="low");assert.equal(calls,1);
 now=3000;await assert.rejects(check(),e=>e.retryAt===5000);assert.equal(calls,2);
});
