import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
function adapter() {
  const data = new Map(); let fail = false;
  const events = new EventTarget();
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync("src/lib/adapters/local/identity.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, Event, window: events,
    localStorage: { getItem: key => data.get(key) ?? null, setItem: (key, value) => { if (fail) throw Error("QuotaExceededError"); data.set(key, value); } },
  });
  return { identity: exports.localIdentity, data, fail: () => { fail = true; } };
}
test("profile save preserves stable identity, unknown fields and library storage; notifies subscribers", () => {
  const { identity, data } = adapter();
  data.set("library-real-data", "unchanged");
  data.set("lc-library-identity-profile-v1", JSON.stringify({ future: "keep", role: "Admin" }));
  let events = 0; const stop = identity.subscribe(() => events++);
  const before = identity.current();
  identity.updateProfile({ displayName: "  Test Person  ", fullName: "QA Name", email: "qa@example.test", phone: "123", role: "Owner", id: "changed" });
  assert.equal(identity.current().id, before.id);
  assert.equal(identity.current().role, undefined);
  assert.equal(identity.current().displayName, "Test Person");
  assert.equal(identity.current().initials, "TP");
  assert.equal(JSON.parse(data.get("lc-library-identity-profile-v1")).future, "keep");
  assert.equal(data.get("library-real-data"), "unchanged");
  assert.equal(events, 1); stop();
  const snapshot = [...data]; identity.current(); assert.deepEqual([...data], snapshot);
});
test("failed save and invalid display name leave identity and stored JSON unchanged", () => {
  const { identity, data, fail } = adapter();
  const previous = identity.current();
  assert.throws(() => identity.updateProfile({ displayName: " " }));
  fail();
  assert.throws(() => identity.updateProfile({ displayName: "Changed" }), /QuotaExceededError/);
  assert.equal(identity.current(), previous);
  assert.equal(data.size, 0);
});
test("neutral defaults preserve explicitly configured historical identity and Library bytes",()=>{
 const {identity,data}=adapter();
 assert.equal(identity.current().id,"local-user");
 assert.equal(identity.current().displayName,"Local User");
 assert.equal(identity.current().fullName,"Local User");
 assert.equal(identity.current().email,undefined);
 data.set("lc-library-identity-profile-v1",JSON.stringify({displayName:"Historical Owner",fullName:"Original Name",future:"preserve"}));
 data.set("published-library",JSON.stringify({uploadedBy:"Historical Owner",versions:[{uploadedBy:"Original Name"}]}));
 const before=[...data];
 assert.equal(identity.current().displayName,"Historical Owner");
 assert.deepEqual([...data],before);
});
