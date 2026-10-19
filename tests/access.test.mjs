import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync("src/lib/access.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, URL, URLSearchParams });
const { createAccessController, safeReturnPath } = exports;
function mock(initial = { status: "unauthenticated" }) {
  let state = initial;
  const listeners = new Set();
  const publish = value => { state = value; listeners.forEach(fn => fn()); };
  const provider = {
    mode: "company", current: () => ({ id: "qa-identity" }),
    session: { getSnapshot: () => state, subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn); }, login: () => publish({ status: "authenticated", access: "allowed" }) },
    logout: () => publish({ status: "unauthenticated" }),
  };
  return { provider, publish, controller: createAccessController(provider) };
}
test("Local bypass never requests auth or writes storage", async () => {
  const c = createAccessController({ current: () => ({ id: "local" }), session: { login() { throw Error("must not call"); } } });
  assert.equal(c.getSnapshot().access, "allowed");
  assert.equal(c.getServerSnapshot().access, "allowed");
  await c.login("/screens"); await c.logout();
});
test("company checks on SSR, authenticates once and propagates access", async () => {
  const { provider, controller: c } = mock(); let complete; let calls = 0; let input;
  provider.session.login = value => { calls++; input = value; return new Promise(resolve => { complete = resolve; }); };
  assert.equal(c.getServerSnapshot().status, "checking");
  const first = c.login("/screens?platform=web&token=secret"); const second = c.login("/");
  assert.equal(first, second); assert.equal(c.getSnapshot().status, "authenticating");
  await Promise.resolve(); assert.equal(calls, 1); assert.equal(input.returnTo, "/screens?platform=web");
  provider.session.getSnapshot = () => ({ status: "authenticated", access: "allowed" }); complete(); await first;
  assert.equal(c.getSnapshot().access, "allowed");
});
test("denied, expiration, retry and logout remain distinct; provider errors are not exposed", async () => {
  const { provider, publish, controller: c } = mock(); let notifications = 0;
  const unsubscribe = c.subscribe(() => notifications++);
  publish({ status: "authenticated", access: "denied" }); assert.equal(c.getSnapshot().access, "denied");
  publish({ status: "expired" }); assert.equal(c.getSnapshot().status, "expired");
  provider.session.login = () => { throw Error("secret-token-error"); };
  await c.login("/flows"); assert.equal(c.getSnapshot().status, "error"); assert.ok(!JSON.stringify(c.getSnapshot()).includes("secret"));
  c.backToEntry(); assert.equal(c.getSnapshot().status, "unauthenticated");
  provider.session.login = () => publish({ status: "authenticated", access: "allowed" });
  await c.login("/flows"); assert.equal(c.getSnapshot().access, "allowed");
  await c.logout(); assert.equal(c.getSnapshot().status, "unauthenticated");
  assert.ok(notifications >= 7); unsubscribe();
});
test("missing company adapter/identity and unsuccessful login fail closed", async () => {
  assert.equal(createAccessController({ mode: "company", current: () => ({ id: "" }) }).getSnapshot().status, "error");
  const { provider, controller: c } = mock(); provider.session.login = () => {};
  await c.login("/"); assert.equal(c.getSnapshot().status, "error");
  const broken = mock({ status: "authenticated", access: "allowed" }); broken.provider.current = () => ({ id: "" });
  assert.equal(broken.controller.getSnapshot().status, "error");
});
test("return path preserves Library context, rejects external/loop destinations and strips callbacks", () => {
  for (const value of ["https://evil.test", "//evil.test", "/\\evil.test", "/auth?returnTo=/auth", "/oauth/callback", "/screens/%2e%2e/auth", "/screens/%2f%2fevil.test", "javascript:alert(1)"]) assert.equal(safeReturnPath(value), "/", value);
  assert.equal(safeReturnPath("/screens/pharmacy/checkout/customer-information?view=flow&platform=web"), "/screens/pharmacy/checkout/customer-information?view=flow&platform=web");
  assert.equal(safeReturnPath("/manage/screens/new?businessUnitId=pharmacy&flowId=qa&code=secret#token"), "/manage/screens/new?businessUnitId=pharmacy&flowId=qa");
});

test("malformed snapshots and subscription failures show generic error instead of crashing", () => {
  const invalid = mock({ status: "authenticated", access: "unknown" });
  assert.equal(invalid.controller.getSnapshot().status, "error");
  invalid.provider.session.getSnapshot = () => null;
  assert.equal(invalid.controller.getSnapshot().status, "error");
  const broken = mock(); broken.provider.session.subscribe = () => { throw Error("private config"); };
  const unsubscribe = broken.controller.subscribe(() => {});
  assert.equal(broken.controller.getSnapshot().status, "error"); unsubscribe();
});


test("Local session logout and mock login preserve stored Library/profile data", async () => {
  const localExports = {};
  let writes = 0;
  const localStorage = { getItem: () => null, setItem: () => { writes++; }, removeItem: () => { writes++; }, clear: () => { writes++; } };
  vm.runInNewContext(ts.transpileModule(readFileSync("src/lib/adapters/local/identity.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
    { exports: localExports, window: { location: { pathname: "/" } }, localStorage, setTimeout });
  const c = createAccessController(localExports.localIdentity);
  assert.equal(c.getSnapshot().access, "allowed");
  await c.logout();
  assert.equal(c.getSnapshot().status, "unauthenticated");
  const login = c.login("/");
  assert.equal(c.getSnapshot().status, "authenticating");
  await login;
  assert.equal(c.getSnapshot().access, "allowed");
  assert.equal(writes, 0);
});

test("Local login deep link stays signed out on a fresh session", () => {
  const localExports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync("src/lib/adapters/local/identity.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
    { exports: localExports, window: { location: { pathname: "/login" } }, setTimeout });
  assert.equal(createAccessController(localExports.localIdentity).getSnapshot().status, "unauthenticated");
});


test("Login exposes only the FPT SSO entry without local credential or email-link ownership", () => {
  const source = readFileSync("src/components/access/login-page.tsx", "utf8");
  assert.match(source, /Đăng nhập với FPT SSO/);
  assert.doesNotMatch(source, /requestMagicLink|work-email|Email công việc|Gửi liên kết đăng nhập|type="password"/);
});
