import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, require = () => ({})) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { exports, require, Date, Map, Promise, process: { env: { NODE_ENV: "development" } } });
  return exports;
}
const errors = load('src/lib/figma-integration-errors.ts');
const candidate = fingerprint => ({ changed: true, checkedAt: new Date().toISOString(), frame: { fileKey: 'qa', nodeId: '1:2', url: 'https://www.figma.com/design/qa?node-id=1-2', fingerprint, preview: `data:image/png;base64,${fingerprint}`, name: 'QA', width: 100, height: 200 } });
function harness(pending = candidate('v2')) {
  const policy = load('src/lib/figma-update-policy.ts');
  const slots = []; let cursor = 0, calls = 0, next;
  const versions = ['v1'];
  const screen = { id: 'qa', sourceType: 'figma', figmaSource: { ...candidate('v1').frame, lastCheckedAt: new Date().toISOString(), lastSyncedFingerprint: 'v1' }, pendingFigmaUpdate: pending };
  const adapter = { checkForUpdate: async () => { calls++; if (next instanceof Error) throw next; return next; } };
  const persist = (_id, _source, result) => { screen.pendingFigmaUpdate = result.changed ? result : undefined; };
  const create = (_id, _platform, frame) => {
    assert.notEqual(frame.fingerprint, screen.figmaSource.lastSyncedFingerprint);
    versions.push(frame.fingerprint); screen.figmaSource.lastSyncedFingerprint = frame.fingerprint; screen.pendingFigmaUpdate = undefined;
  };
  const jsx = (type, props) => ({ type, props });
  const component = load('src/components/screens/figma-update-card.tsx', name => {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === 'react') return {
      useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }]; },
      useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; }, useEffect() {},
    };
    if (name.endsWith('/figma-update-policy')) return policy;
    if (name.endsWith('/figma-integration-errors')) return errors;
    if (name.endsWith('/repositories/provider')) return { repositories: { figma: adapter } };
    if (name.endsWith('/repositories/client')) return { recordFigmaCheck: persist, createVersionFromFigma: create };
    if (name.endsWith('/storage-errors')) return { storageErrorMessage: () => 'Could not save' };
    return {};
  });
  let nodes;
  const text = node => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props?.children) : typeof node === 'string' ? node : '';
  const render = () => { cursor = 0; nodes = []; const visit = node => { if (Array.isArray(node)) node.forEach(visit); else if (node && typeof node === 'object') { nodes.push(node); visit(node.props?.children); } }; visit(component.FigmaUpdateCard({ screen, platform: 'mobile', currentPreview: 'v1-image' })); return nodes.map(node => typeof node.type === 'string' ? text(node) : '').join('\n'); };
  render();
  return { screen, versions, render, calls: () => calls, setResult: value => { next = value; }, async click(label) { const button = nodes.find(node => node.type === 'button' && text(node) === label); assert.ok(button, label); assert.ok(!button.props.disabled, label + ' enabled'); await button.props.onClick(); await new Promise(resolve => setImmediate(resolve)); return render(); } };
}
for (const [name, error] of [['429', Object.assign(new Error('429'), { code: 'rate_limited' })], ['network', new TypeError('Failed to fetch')]]) {
  test(`pending candidate survives ${name}; comparison and creation remain available without a new request`, async () => {
    const view = harness(); const original = view.screen.pendingFigmaUpdate;
    view.setResult(error);
    const output = await view.click('Check for updates');
    assert.match(output, /Update available/);
    assert.match(output, name === "429" ? /Figma rate limit reached/ : /Không thể kiểm tra bản cập nhật mới nhất lúc này\./);
    assert.match(output, /Đang hiển thị bản cập nhật đã phát hiện trước đó\./);
    assert.doesNotMatch(output, /Figma API unavailable/);
    assert.strictEqual(view.screen.pendingFigmaUpdate, original);
    assert.deepEqual(view.versions, ['v1']);
    assert.match(await view.click('So sánh thay đổi'), /LC Current snapshot/);
    await view.click('Tạo phiên bản mới');
    assert.equal(view.calls(), 1, 'creating uses the saved candidate, not Figma');
    assert.deepEqual(view.versions, ['v1', 'v2']);
    assert.equal(view.screen.pendingFigmaUpdate, undefined);
    assert.doesNotMatch(view.render(), /Tạo phiên bản mới/);
  });
}
test('retry replaces a single candidate, whether identical or newer, without creating versions', async () => {
  const view = harness(); view.setResult(new TypeError('offline')); await view.click('Check for updates');
  view.setResult(candidate('v2')); assert.doesNotMatch(await view.click('Retry check'), /Không thể kiểm tra/);
  assert.equal(view.screen.pendingFigmaUpdate.frame.fingerprint, 'v2');
  view.setResult(candidate('v3')); await view.click('Check for updates');
  assert.equal(view.screen.pendingFigmaUpdate.frame.fingerprint, 'v3');
  assert.deepEqual(view.versions, ['v1']);
  await view.click('Tạo phiên bản mới'); assert.deepEqual(view.versions, ['v1', 'v3']);
});
test('without a candidate a failed check remains a normal retryable Error', async () => {
  const view = harness(null); view.setResult(new TypeError('offline'));
  assert.match(await view.click('Check for updates'), /Figma API unavailable/);
  assert.doesNotMatch(view.render(), /Đang hiển thị|Tạo phiên bản mới/);
  view.setResult(candidate('v2')); assert.match(await view.click('Retry check'), /Update available/);
});


test('429 without pending is temporary and disables repeated checks during cooldown', async () => {
  const view = harness(null);
  view.setResult(Object.assign(new Error('429'), { code: 'rate_limited' }));
  const output = await view.click('Check for updates');
  assert.match(output, /Rate limited/);
  assert.match(output, /Try again in 5s./);
  assert.doesNotMatch(output, /Tạo phiên bản mới/);
  await assert.rejects(view.click('Retry check'), /enabled/);
  assert.equal(view.calls(), 1);
  assert.deepEqual(view.versions, ['v1']);
});
