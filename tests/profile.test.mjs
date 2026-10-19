import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function renderProfile(identity, writeText) {
  let notice;
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  const code = ts.transpileModule(readFileSync("src/components/profile/profile-page.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { exports, navigator: { clipboard: { writeText } }, require(name) {
    if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
    if (name === "react") return { useState: initial => [initial, value => { notice = value; }] };
    if (name.endsWith("/use-identity")) return { useIdentity: () => identity };
    if (name.endsWith("/provider")) return { repositories: { identity: { current: () => identity } } };
    return {};
  }});
  const nodes = [];
  const visit = node => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (node && typeof node === "object") { nodes.push(node); visit(node.props?.children); }
  };
  visit(exports.ProfilePage());
  return { buttons: nodes.filter(node => node.type === "button" && node.props["aria-label"]?.startsWith("Copy ")), notice: () => notice, nodes };
}

test("profile copies provider contact fields exactly and reports clipboard failure", async () => {
  const copied = [];
  const identity = { displayName: "QA", username: "qa-user", domain: "company", email: "qa@example.test", phone: "+123", role: "Viewer" };
  const view = renderProfile(identity, async text => { copied.push(text); });
  for (const button of view.buttons) await button.props.onClick();
  assert.deepEqual(copied, ["qa-user · company", "qa@example.test", "+123"]);
  assert.equal(view.notice(), "Phone copied.");
  assert.equal(view.nodes.some(node => node.type === "input"), false);
  const failed = renderProfile(identity, async () => { throw Error("denied"); });
  await failed.buttons[0].props.onClick();
  assert.match(failed.notice(), /Could not copy/);
});

test("missing local contact data cannot copy undefined values", () => {
  const view = renderProfile({ displayName: "Local" }, () => { throw Error("must not copy"); });
  assert.equal(view.buttons.length, 3);
  assert.ok(view.buttons.every(button => button.props.disabled));
});
