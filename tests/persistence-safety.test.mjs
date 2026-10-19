import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { test } from 'node:test';
import ts from 'typescript';

const keys = {
  screens: 'lc-library.phase1.published-screens',
  draft: 'lc-library.phase1.add-screen-draft',
  flows: 'lc-library.phase1.flow-overrides',
  groups: 'lc-library.phase1.screen-group-overrides',
  deletedGroups: 'lc-library.phase1.deleted-screen-group-ids',
  deletedFlows: 'lc-library.phase1.deleted-flow-ids',
  deletedScreens: 'lc-library.phase1.deleted-screen-ids',
  noteTypes: 'lc-library.phase1.custom-note-types',
};
const markers = [
  'lc-library.cleanup.app-entry-demo-screens.v1',
  'lc-library.cleanup.login-flow-demo-records.v1',
  'lc-library.cleanup.acceptance-test-records.v1',
  'lc-library.migration.login-screen-states.v3',
];

// Execute the actual TypeScript modules with isolated storage. Only React's hook
// dispatcher is substituted; production readers, merges and resolvers run intact.
function runtime(storage) {
  const cache = new Map();
  const listeners = new Set();
  const writes = [];
  const window = {
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => { writes.push(['set', key]); storage.set(key, value); },
      removeItem: key => { writes.push(['remove', key]); storage.delete(key); },
      clear: () => { writes.push(['clear']); storage.clear(); },
    },
    addEventListener: (name, fn) => { if (name === 'storage') listeners.add(fn); },
    removeEventListener: (name, fn) => listeners.delete(fn),
    dispatchEvent: () => {},
  };
  function load(name) {
    if (name === 'react') return { useSyncExternalStore: (subscribe, snapshot) => {
      subscribe(() => {});
      return snapshot();
    } };
    if (cache.has(name)) return cache.get(name);
    const file = path.join(import.meta.dirname, '..', 'src', name.replace(/^@\//, '') + '.ts');
    const source = readFileSync(file, 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
    } }).outputText;
    const exports = {};
    cache.set(name, exports);
    vm.runInNewContext(code, { exports, require: load, window, Event, URL, crypto: webcrypto }, { filename: file });
    return exports;
  }
  return { load, writes, invalidate: () => { for (const fn of listeners) fn(); } };
}
const plain = value => JSON.parse(JSON.stringify(value));
test('dynamic products preserve identity, resolve new journeys and safely reassign populated units', () => {
  const storage = new Map();
  let rt = runtime(storage);
  let api = rt.load('@/lib/local-inventory');
  const catalog = rt.load('@/lib/business-units');
  const before = [...storage];
  assert.equal(catalog.getBusinessUnits().length, 4);
  assert.deepEqual([...storage], before);
  const unit = api.createLocalBusinessUnit('  QA Product  ');
  assert.equal(catalog.getBusinessUnits().length, 5);
  assert.throws(() => api.createLocalBusinessUnit('qa product'), /already exists/);
  assert.throws(() => api.createLocalBusinessUnit(' '), /Enter/);
  const group = { id: unit.id + '.group.stable', businessUnitId: unit.id, slug: 'custom-group', name: 'Group', description: '', sequence: 1, screenIds: [] };
  api.createLocalScreenGroup(group);
  const flow = { id: unit.id + '.flow.stable', businessUnitId: unit.id, screenGroupId: group.id, parentGroupId: group.id, slug: 'qa-journey', name: 'Journey', description: '', status: 'active', screenIds: [] };
  api.createLocalFlow(flow);
  const seed = rt.load('@/data/design-library').screens[0];
  const screen = { ...seed, id: unit.id + '.screen.stable', slug: 'qa-screen', name: 'QA Screen', businessUnitId: unit.id, screenGroupId: group.id, legacy: { keep: true } };
  api.publishLocalScreen(screen, { flowId: flow.id, insertAfterScreenId: null });
  api.renameLocalBusinessUnit(unit.id, 'Renamed product');
  assert.equal(catalog.getBusinessUnits().find(item => item.id === unit.id).slug, unit.slug);
  assert.equal(rt.load('@/lib/design-library').screenHref(screen), `/screens/${unit.slug}/custom-group/qa-screen`);
  assert.ok(rt.load('@/lib/screen-search').searchScreenInventory('Renamed product', api.useScreenInventory(), api.useFlowInventory(), api.useScreenGroupInventory()).some(item => item.id === screen.id));
  rt = runtime(storage); api = rt.load('@/lib/local-inventory');
  assert.equal(rt.load('@/lib/business-units').getBusinessUnits().find(item => item.id === unit.id).name, 'Renamed product');
  const snapshot = [...storage];
  assert.throws(() => api.deleteLocalBusinessUnit(unit.id, false), /Confirm/);
  assert.throws(() => api.deleteLocalBusinessUnit(unit.id, true), /Choose/);
  assert.deepEqual([...storage], snapshot);
  const set = storage.set.bind(storage);
  let failed = false;
  storage.set = (key, value) => { if (key === 'lc-library.phase1.business-unit-overrides' && !failed) { failed = true; throw new Error('Quota exceeded'); } return set(key, value); };
  assert.throws(() => api.deleteLocalBusinessUnit(unit.id, true, 'testing'), /Quota/);
  assert.deepEqual([...storage], snapshot, 'failed reassignment must restore every original record');
  storage.set = set;
  api.deleteLocalBusinessUnit(unit.id, true, 'testing');
  const moved = api.useScreenInventory().find(item => item.id === screen.id);
  assert.deepEqual(plain(moved), { ...plain(screen), businessUnitId: 'testing' });
  assert.deepEqual(plain(api.useFlowInventory().find(item => item.id === flow.id).screenIds), [screen.id]);
  assert.equal(api.useScreenGroupInventory().find(item => item.id === group.id).businessUnitId, 'testing');
  assert.equal(rt.load('@/lib/business-units').getBusinessUnits().some(item => item.id === unit.id), false);
  const empty = api.createLocalBusinessUnit('Empty product');
  api.deleteLocalBusinessUnit(empty.id, true);
  assert.equal(rt.load('@/lib/business-units').getBusinessUnits().some(item => item.id === empty.id), false);
});
test('Group and Flow creation roll back when the second storage write fails', () => {
  for (const kind of ['group', 'flow']) {
    const storage = new Map();
    const set = storage.set.bind(storage);
    let failed = false;
    const failureKey = kind === 'group' ? keys.deletedGroups : keys.deletedFlows;
    storage.set = (key, value) => {
      if (key === failureKey && !failed) { failed = true; throw new Error('Quota exceeded'); }
      return set(key, value);
    };
    const api = runtime(storage).load('@/lib/local-inventory');
    const record = { id: 'pharmacy.qa-atomic', slug: 'qa-atomic', name: 'QA atomic', businessUnitId: 'pharmacy', description: '', sequence: 999, status: 'active', screenIds: [] };
    assert.throws(() => kind === 'group' ? api.createLocalScreenGroup(record) : api.createLocalFlow({ ...record, screenGroupId: 'pharmacy.checkout', parentGroupId: 'pharmacy.checkout' }), /Quota/);
    assert.deepEqual([...storage], [], 'failed creation must not leave a phantom record');
  }
});
const seeds = runtime(new Map()).load('@/data/design-library');
const preview = 'data:image/png;base64,aG9tZS1wYy11cGxvYWQ=';
const state = { id: 'legacy.state', name: 'My state', preview: preview + 'state', unknown: 'keep' };
const variant = { id: 'legacy.variant', name: 'My variant', preview: preview + 'variant', isDefault: true };
const note = { id: 'note', title: 'Keep note', description: 'User annotation', type: 'Behavior', x: 20, y: 30, platform: 'mobile' };
const canonical = {
  ...plain(seeds.screens.find(s => s.id.endsWith('.lc-login-input-default'))),
  name: 'Home PC canonical', preview, currentVersion: 'home-v7', jiraTicket: 'HOME-7',
  states: [state], variants: [variant], annotations: [note],
  representations: { mobile: { status: 'active', preview, states: [state], variants: [variant], annotations: [note] } },
  legacyUnknown: { nested: ['preserve', 7] },
};
const retiredIds = [
  'pharmacy.app-entry.hehe', 'pharmacy.app-entry.asd',
  'pharmacy.app-entry.otp-note-test', 'pharmacy.app-entry.acceptance-flow-first',
  'pharmacy.app-entry.acceptance-flow-second',
  ...['lc-login-input-filled', 'lc-login-otp-default-with-suggest', 'lc-login-otp-filled', 'lc-profile']
    .map(slug => 'pharmacy.app-entry-authentication.' + slug),
];
const screens = [canonical, ...retiredIds.map(id => ({ ...canonical, id })),
  ...['hehe', 'asd', 'foundation test screen', 'phase 1 test screen'].map((name, i) => ({
    ...canonical, id: 'legacy.named.' + i, name, screenGroupId: 'pharmacy.app-entry',
  }))];
const flow = { ...plain(seeds.flows.find(f => f.id === 'pharmacy.authentication')),
  screenIds: [...screens.map(s => s.id).reverse(), 'unknown.screen'], legacyOrder: true };
const group = { ...plain(seeds.screenGroups[0]), name: 'Home group', legacyGroup: true };

test('Tree Flow rename survives reload with stable ID/order and searchable name; deletion preserves Screen data', () => {
  const journey = { ...flow, id: 'fixture.tree-flow', slug: 'fixture-tree-flow', name: 'Fixture journey', screenGroupId: canonical.screenGroupId, parentGroupId: canonical.screenGroupId, screenIds: [canonical.id] };
  const storage = new Map([[keys.screens, JSON.stringify([canonical])], [keys.flows, JSON.stringify([journey])], [keys.draft, '{"name":"Keep draft"}']]);
  const screenJSON = storage.get(keys.screens), draftJSON = storage.get(keys.draft);
  let app = runtime(storage), api = app.load('@/lib/local-inventory');
  api.updateLocalFlow(journey.id, { name: 'Renamed fixture journey', description: journey.description });
  app = runtime(storage); api = app.load('@/lib/local-inventory');
  const renamed = api.useFlowInventory().find(item => item.id === journey.id);
  assert.deepEqual(plain(renamed), { ...journey, name: 'Renamed fixture journey' });
  assert.match(JSON.stringify(app.load('@/lib/screen-search').searchScreenInventory('Renamed fixture journey', api.useScreenInventory(), api.useFlowInventory(), api.useScreenGroupInventory())), /Renamed fixture journey/);
  api.deleteLocalFlow(journey.id);
  api = runtime(storage).load('@/lib/local-inventory');
  assert.equal(api.useFlowInventory().some(item => item.id === journey.id), false);
  assert.equal(storage.get(keys.screens), screenJSON);
  assert.equal(storage.get(keys.draft), draftJSON);
  assert.deepEqual(plain(api.useScreenInventory().find(item => item.id === canonical.id)), canonical);
});

test('Flow reorder persists exact canonical IDs and rejects duplicate or missing steps', () => {
  const journey = { ...flow, id: 'fixture.reorder', slug: 'fixture-reorder', screenGroupId: canonical.screenGroupId, parentGroupId: canonical.screenGroupId, screenIds: ['screen.a', canonical.id, 'screen.b'] };
  const storage = new Map([[keys.screens, JSON.stringify([canonical])], [keys.flows, JSON.stringify([journey])]]);
  let api = runtime(storage).load('@/lib/local-inventory');
  api.reorderLocalFlowScreens(journey.id, [canonical.id, 'screen.b', 'screen.a']);
  api = runtime(storage).load('@/lib/local-inventory');
  assert.deepEqual(plain(api.useFlowInventory().find(item => item.id === journey.id).screenIds), [canonical.id, 'screen.b', 'screen.a']);
  const before = storage.get(keys.flows);
  assert.throws(() => api.reorderLocalFlowScreens(journey.id, [canonical.id, canonical.id, 'screen.a']), /exactly once/);
  assert.equal(storage.get(keys.flows), before);
});

test('sibling Flow reorder persists shared sequence without changing identity, content or other groups', () => {
  const parent = 'fixture.parent.unique';
  const sibling = (id, name, sequence) => ({ ...flow, id, slug: id, name, sequence, parentGroupId: parent, screenGroupId: parent, screenIds: [id + '.screen'], stableUnknown: { keep: id } });
  const first = sibling('fixture.flow.first', 'First', 1);
  const middle = sibling('fixture.flow.middle', 'Middle', 2);
  const last = sibling('fixture.flow.last', 'Onboarding', 3);
  const other = { ...sibling('fixture.flow.other', 'Other group', 1), parentGroupId: 'testing.booking', screenGroupId: 'testing.booking', businessUnitId: 'testing' };
  const storage = new Map([[keys.flows, JSON.stringify([first, middle, last, other])]]);
  let app = runtime(storage), api = app.load('@/lib/local-inventory');
  api.reorderLocalFlows(parent, [last.id, first.id, middle.id]);
  app = runtime(storage); api = app.load('@/lib/local-inventory');
  const ordered = app.load('@/lib/flow-context').flowsForGroup(api.useFlowInventory(), first.businessUnitId, parent);
  assert.deepEqual(plain(ordered.map(item => item.id)), [last.id, first.id, middle.id]);
  assert.deepEqual(plain(ordered.map(item => item.screenIds)), [[last.id + '.screen'], [first.id + '.screen'], [middle.id + '.screen']]);
  assert.deepEqual(plain(ordered.map(item => item.stableUnknown)), [{ keep: last.id }, { keep: first.id }, { keep: middle.id }]);
  assert.deepEqual(plain(api.useFlowInventory().find(item => item.id === other.id)), other);
  const persisted = storage.get(keys.flows);
  assert.throws(() => api.reorderLocalFlows(parent, [other.id, last.id, first.id]), /every sibling Flow exactly once/);
  assert.equal(storage.get(keys.flows), persisted, 'cross-group reorder must not write');
});

test('Screen deletion removes canonical data and every Flow reference atomically while preserving remaining order', () => {
  const journey = { ...flow, id: 'fixture.screen-delete', slug: 'fixture-screen-delete', screenGroupId: canonical.screenGroupId, parentGroupId: canonical.screenGroupId, screenIds: ['screen.a', canonical.id, 'screen.b'] };
  const storage = new Map([[keys.screens, JSON.stringify([canonical])], [keys.flows, JSON.stringify([journey])]]);
  let api = runtime(storage).load('@/lib/local-inventory');
  api.deleteLocalScreen(canonical.id);
  api = runtime(storage).load('@/lib/local-inventory');
  assert.equal(api.useScreenInventory().some(item => item.id === canonical.id), false);
  assert.deepEqual(plain(api.useFlowInventory().find(item => item.id === journey.id).screenIds), ['screen.a', 'screen.b']);
  assert.deepEqual(JSON.parse(storage.get(keys.deletedScreens)), [canonical.id]);

  const failing = new Map([[keys.screens, JSON.stringify([canonical])], [keys.flows, JSON.stringify([journey])]]);
  const before = [...failing], set = failing.set.bind(failing);
  failing.set = (key, value) => { if (key === keys.deletedScreens) throw new Error('Quota'); return set(key, value); };
  assert.throws(() => runtime(failing).load('@/lib/local-inventory').deleteLocalScreen(canonical.id), /Quota/);
  assert.deepEqual([...failing], before);
});
test('Screen deletion removes references from every raw compatibility Flow definition', () => {
  const legacy = { ...flow, id: 'pharmacy.authentication', screenIds: ['screen.a', canonical.id, 'screen.b'] };
  const placeholder = { ...flow, id: 'pharmacy.registration-login.login.default-flow', slug: 'login-default-flow', screenGroupId: 'pharmacy.registration-login.login', parentGroupId: 'pharmacy.registration-login.login', screenIds: [canonical.id, 'screen.c'] };
  const storage = new Map([[keys.screens, JSON.stringify([canonical])], [keys.flows, JSON.stringify([legacy, placeholder])]]);
  runtime(storage).load('@/lib/local-inventory').deleteLocalScreen(canonical.id);
  const persisted = JSON.parse(storage.get(keys.flows));
  assert.deepEqual(persisted.find(item => item.id === legacy.id).screenIds, ['screen.a', 'screen.b']);
  assert.deepEqual(persisted.find(item => item.id === placeholder.id).screenIds, ['screen.c']);
});
test('Figma checks persist one latest candidate, refresh timestamps and roll back safely', () => {
  const source = { fileKey: 'abc123', nodeId: '1:2', url: 'https://www.figma.com/design/abc123/QA?node-id=1-2', lastCheckedAt: '2026-10-01T00:00:00.000Z', lastSyncedAt: '2026-10-01T00:00:00.000Z', lastSyncedFingerprint: 'r1', name: 'QA' };
  const linked = { ...canonical, sourceType: 'figma', figmaSource: source, figmaHref: source.url };
  const storage = new Map([[keys.screens, JSON.stringify([linked])], [keys.draft, '{"name":"Keep draft"}']]);
  let api = runtime(storage).load('@/lib/local-inventory');
  const frame = { fileKey: source.fileKey, nodeId: source.nodeId, url: source.url, name: 'QA latest', preview: preview + 'r2', width: 375, height: 812, fingerprint: 'r2' };
  api.recordFigmaCheck(linked.id, source, { changed: true, checkedAt: '2026-10-12T10:00:00.000Z', frame });
  let after = runtime(storage).load('@/lib/local-inventory').useScreenInventory().find(item => item.id === linked.id);
  assert.equal(after.figmaSource.lastCheckedAt, '2026-10-12T10:00:00.000Z');
  assert.equal(after.figmaSource.lastSyncedAt, source.lastSyncedAt);
  assert.equal(after.figmaSource.lastSyncedFingerprint, 'r1');
  assert.equal(after.pendingFigmaUpdate.frame.fingerprint, 'r2');
  assert.equal(after.preview, linked.preview, 'checking must not replace Current');
  assert.equal(storage.get(keys.draft), '{"name":"Keep draft"}');

  api = runtime(storage).load('@/lib/local-inventory');
  const latestFrame = { ...frame, preview: preview + 'r3', fingerprint: 'r3' };
  api.recordFigmaCheck(linked.id, after.figmaSource, { changed: true, checkedAt: '2026-10-12T10:01:00.000Z', frame: latestFrame });
  after = runtime(storage).load('@/lib/local-inventory').useScreenInventory().find(item => item.id === linked.id);
  assert.equal(after.pendingFigmaUpdate.frame.fingerprint, 'r3', 'many provider edits must remain one latest pending update');

  api = runtime(storage).load('@/lib/local-inventory');
  api.recordFigmaCheck(linked.id, after.figmaSource, { changed: false, checkedAt: '2026-10-12T10:02:00.000Z', frame: { ...frame, fingerprint: 'r1' } });
  after = runtime(storage).load('@/lib/local-inventory').useScreenInventory().find(item => item.id === linked.id);
  assert.equal(after.pendingFigmaUpdate, undefined);
  assert.equal(after.figmaSource.lastCheckedAt, '2026-10-12T10:02:00.000Z');

  const before = storage.get(keys.screens);
  assert.throws(() => api.recordFigmaCheck(linked.id, { ...after.figmaSource, url: source.url + '&changed=1' }, { changed: true, checkedAt: '2026-10-12T10:03:00.000Z', frame }), /source changed/i);
  assert.equal(storage.get(keys.screens), before);
  const originalSet = storage.set.bind(storage);
  storage.set = (key, value) => { if (key === keys.screens) throw new Error('Quota exceeded'); return originalSet(key, value); };
  assert.throws(() => api.recordFigmaCheck(linked.id, after.figmaSource, { changed: true, checkedAt: '2026-10-12T10:04:00.000Z', frame }), /Quota/);
  assert.equal(storage.get(keys.screens), before, 'failed pending snapshot persistence must roll back exactly');
});

test('Figma version creation archives the current snapshot, preserves canonical identity and keeps Flow order', () => {
  const source = { fileKey: 'abc123', nodeId: '1:2', url: 'https://www.figma.com/design/abc123/QA?node-id=1-2&mock-update=1', lastCheckedAt: '2026-10-01T00:00:00.000Z', lastSyncedFingerprint: 'local-mock:abc123:1:2:r1', name: 'QA' };
  const current = { sourceType: 'figma', figmaSource: source, id: canonical.id + '.mobile.v1', version: 'v1.0', status: 'current', createdAt: '2026-10-01', lastUpdated: '2026-10-01', uploadedBy: 'Local User', preview, description: canonical.description, whenItAppears: canonical.whenItAppears, purpose: canonical.purpose, jiraTicket: canonical.jiraTicket, relatedTickets: canonical.relatedTickets, figmaHref: source.url, components: canonical.components, variants: canonical.variants, states: canonical.states, annotations: canonical.annotations, evidence: canonical.evidence };
  const linked = { ...canonical, sourceType: 'figma', figmaSource: source, figmaHref: source.url, currentVersion: 'v1.0', versions: [], representations: { mobile: { ...canonical.representations.mobile, currentVersion: 'v1.0', figmaHref: source.url, versionHistory: [current] } }, versionHistory: { mobile: [current] } };
  const journey = { ...flow, id: 'fixture.figma-version', slug: 'fixture-figma-version', screenIds: ['screen.a', linked.id, 'screen.b'] };
  const storage = new Map([[keys.screens, JSON.stringify([linked])], [keys.flows, JSON.stringify([journey])], [keys.draft, '{"name":"Keep draft"}']]);
  const api = runtime(storage).load('@/lib/local-inventory');
  const frame = { fileKey: 'abc123', nodeId: '1:2', url: source.url, name: 'QA', preview: preview + 'r2', width: 375, height: 812, fingerprint: 'local-mock:abc123:1:2:r2' };
  api.createVersionFromFigma(linked.id, 'mobile', frame, '2026-10-05T00:00:00.000Z');
  const after = runtime(storage).load('@/lib/local-inventory').useScreenInventory().find(item => item.id === linked.id);
  assert.equal(after.id, linked.id);
  assert.equal(after.preview, frame.preview);
  assert.equal(after.currentVersion, 'v1.1');
  assert.equal(after.figmaSource.lastSyncedFingerprint, frame.fingerprint);
  assert.equal(after.figmaSource.lastSyncedAt, '2026-10-05T00:00:00.000Z');
  assert.equal(after.pendingFigmaUpdate, undefined);
  assert.deepEqual(plain(after.versionHistory.mobile.map(item => [item.version, item.status])), [['v1.1', 'current'], ['v1.0', 'archived']]);
  const versionResolver = runtime(storage).load('@/lib/screen-platform');
  const archivedContext = versionResolver.resolveScreenVersion(after, 'mobile', 'v1.0');
  assert.equal(archivedContext.isHistorical, true);
  assert.equal(archivedContext.screen.id, linked.id, 'archived selection must preserve the canonical Screen ID');
  assert.equal(archivedContext.screen.preview, preview, 'archived selection must use the immutable stored snapshot');
  const missingContext = versionResolver.resolveScreenVersion(after, 'mobile', 'v0.9');
  assert.equal(missingContext.isHistorical, false);
  assert.equal(missingContext.missingVersion, 'v0.9');
  assert.equal(missingContext.screen.currentVersion, 'v1.1', 'missing archives must fall back to Current');
  assert.deepEqual(plain(runtime(storage).load('@/lib/local-inventory').useFlowInventory().find(item => item.id === journey.id).screenIds), journey.screenIds);
  assert.equal(storage.get(keys.draft), '{"name":"Keep draft"}');

  const persisted = storage.get(keys.screens);
  assert.throws(() => api.createVersionFromFigma(linked.id, 'mobile', frame, '2026-10-05T00:00:01.000Z'), /already.*Current/i);
  assert.equal(storage.get(keys.screens), persisted, 'a duplicate acceptance must not write another version');
  assert.throws(() => api.createVersionFromFigma('deleted.screen', 'mobile', { ...frame, fingerprint: 'local-mock:abc123:1:2:r3' }, '2026-10-05T00:00:01.500Z'), /no longer exists/i);
  assert.equal(storage.get(keys.screens), persisted, 'a deleted Screen must not leave partial version state');

  const manual = { ...plain(after), sourceType: 'upload', figmaSource: undefined };
  const manualStorage = new Map([[keys.screens, JSON.stringify([manual])]]);
  const manualBefore = manualStorage.get(keys.screens);
  assert.throws(() => runtime(manualStorage).load('@/lib/local-inventory').createVersionFromFigma(manual.id, 'mobile', { ...frame, fingerprint: 'local-mock:abc123:1:2:r3' }, '2026-10-05T00:00:01.750Z'), /Attach a Figma source/i);
  assert.equal(manualStorage.get(keys.screens), manualBefore, 'removing the source mid-update must not write');
  const staleFrame = { ...frame, url: source.url + '&source-changed=1', fingerprint: 'local-mock:abc123:1:2:r3' };
  assert.throws(() => api.createVersionFromFigma(linked.id, 'mobile', staleFrame, '2026-10-05T00:00:02.000Z'), /source changed/i);
  assert.equal(storage.get(keys.screens), persisted, 'a stale source result must not write');

  const originalSet = storage.set.bind(storage);
  storage.set = (key, value) => { if (key === keys.screens) throw new Error('Quota exceeded'); return originalSet(key, value); };
  assert.throws(() => api.createVersionFromFigma(linked.id, 'mobile', { ...frame, fingerprint: 'local-mock:abc123:1:2:r3' }, '2026-10-05T00:00:03.000Z'), /Quota/);
  assert.equal(storage.get(keys.screens), persisted, 'failed snapshot persistence must roll back exactly');
  storage.set = originalSet;

  const duplicateCurrent = { ...plain(after.versionHistory.mobile[0]), id: 'duplicate-current' };
  const futureArchived = { ...plain(after.versionHistory.mobile[0]), id: 'future-archived', version: 'v1.2', status: 'archived' };
  const malformed = { ...plain(after), currentVersion: 'v1.1', versions: [], representations: { ...plain(after.representations), mobile: { ...plain(after.representations.mobile), currentVersion: 'v1.1', versions: [], versionHistory: [plain(after.versionHistory.mobile[0]), duplicateCurrent, futureArchived, plain(after.versionHistory.mobile[1])] } }, versionHistory: { ...plain(after.versionHistory), mobile: [plain(after.versionHistory.mobile[0]), duplicateCurrent, futureArchived, plain(after.versionHistory.mobile[1])] } };
  const malformedStorage = new Map([[keys.screens, JSON.stringify([malformed])], [keys.flows, JSON.stringify([journey])]]);
  const malformedApi = runtime(malformedStorage).load('@/lib/local-inventory');
  malformedApi.createVersionFromFigma(linked.id, 'mobile', { ...frame, fingerprint: 'local-mock:abc123:1:2:r3' }, '2026-10-05T00:00:04.000Z');
  const normalized = runtime(malformedStorage).load('@/lib/local-inventory').useScreenInventory().find(item => item.id === linked.id);
  assert.equal(normalized.currentVersion, 'v1.3', 'version labels must skip existing archived labels');
  assert.equal(normalized.versionHistory.mobile.filter(item => item.status === 'current').length, 1);
  assert.equal(new Set(normalized.versionHistory.mobile.map(item => item.version)).size, normalized.versionHistory.mobile.length, 'version history must not contain duplicate labels');

  const legacyLinked = { ...plain(linked), currentVersion: 'v7.0', versions: [], representations: { mobile: { ...plain(linked.representations.mobile), currentVersion: 'v7.0', versions: [], versionHistory: undefined } }, versionHistory: undefined };
  const legacyStorage = new Map([[keys.screens, JSON.stringify([legacyLinked])]]);
  runtime(legacyStorage).load('@/lib/local-inventory').createVersionFromFigma(legacyLinked.id, 'mobile', frame, '2026-10-05T00:00:05.000Z');
  const legacyVersioned = runtime(legacyStorage).load('@/lib/local-inventory').useScreenInventory().find(item => item.id === legacyLinked.id);
  assert.deepEqual(plain(legacyVersioned.versionHistory.mobile.map(item => [item.version, item.status])), [['v7.1', 'current'], ['v7.0', 'archived']], 'legacy linked Screens must gain a complete history');

  const manyArchived = Array.from({ length: 40 }, (_, index) => ({ ...plain(current), id: `archived-${index + 1}`, version: `v1.${index + 1}`, status: 'archived' }));
  const manyLinked = { ...plain(linked), representations: { mobile: { ...plain(linked.representations.mobile), versionHistory: [plain(current), ...manyArchived] } }, versionHistory: { mobile: [plain(current), ...manyArchived] } };
  const manyStorage = new Map([[keys.screens, JSON.stringify([manyLinked])]]);
  runtime(manyStorage).load('@/lib/local-inventory').createVersionFromFigma(manyLinked.id, 'mobile', frame, '2026-10-05T00:00:06.000Z');
  const manyVersioned = runtime(manyStorage).load('@/lib/local-inventory').useScreenInventory().find(item => item.id === manyLinked.id);
  assert.equal(manyVersioned.currentVersion, 'v1.41');
  assert.equal(manyVersioned.versionHistory.mobile.length, 42);
  assert.equal(manyVersioned.versionHistory.mobile.filter(item => item.status === 'current').length, 1);
});
test('deleted generated Flow stays deleted after hydration and failed deletion rolls back', () => {
  const storage = new Map(), app = runtime(storage), api = app.load('@/lib/local-inventory');
  const generated = api.useFlowInventory().find(item => item.slug.startsWith('default-'));
  assert.ok(generated);
  const beforeScreens = plain(api.useScreenInventory());
  api.deleteLocalFlow(generated.id);
  const reloaded = runtime(storage).load('@/lib/local-inventory');
  assert.equal(reloaded.useFlowInventory().some(item => item.id === generated.id), false);
  assert.deepEqual(plain(reloaded.useScreenInventory()), beforeScreens);
  const failing = new Map([[keys.flows, JSON.stringify([flow])]]), before = [...failing], set = failing.set.bind(failing);
  failing.set = (key, value) => { if (key === keys.deletedFlows) throw new Error('Quota'); return set(key, value); };
  assert.throws(() => runtime(failing).load('@/lib/local-inventory').deleteLocalFlow(flow.id), /Quota/);
  assert.deepEqual([...failing], before);
});

test('authentication navigation seed separates structural groups from owned Flows without temporary Screen records', () => {
  const authGroups = seeds.screenGroups.filter(group => group.id === 'pharmacy.registration-login' || group.id.startsWith('pharmacy.registration-login.'));
  const hierarchy = runtime(new Map()).load('@/lib/screen-groups');
  assert.deepEqual(plain(hierarchy.orderedGroups(authGroups).map(group => group.name)), [
    'Đăng ký & Đăng nhập',
    'Đăng ký', 'Luồng default', 'Invalid Cases', 'Nhập OTP qua SMS', 'Nhận OTP qua Zalo',
    'Đăng nhập', 'Luồng default', 'Invalid Cases',
    'Đăng nhập qua VNeID',
  ]);
  assert.equal(new Set(authGroups.map(group => group.id)).size, authGroups.length);
  assert.deepEqual(plain(authGroups.filter(group => group.parentGroupId === 'pharmacy.registration-login').map(group => group.name)), ['Đăng ký', 'Đăng nhập']);
  const authFlows = seeds.flows.filter(item => item.parentGroupId?.startsWith('pharmacy.registration-login'));
  assert.equal(authFlows.length, 8);
  assert.deepEqual(plain(authFlows.filter(item => item.parentGroupId === 'pharmacy.registration-login.registration').map(item => item.name)), ['Luồng default', 'Invalid Cases', 'Nhập OTP qua SMS', 'Nhận OTP qua Zalo']);
  assert.deepEqual(plain(authFlows.filter(item => item.parentGroupId === 'pharmacy.registration-login.login').map(item => item.name)), ['Luồng default', 'Invalid Cases', 'Đăng nhập qua VNeID', 'Đăng nhập Nhà thuốc']);
  assert.deepEqual(plain(authFlows.filter(item => item.parentGroupId === 'pharmacy.registration-login').map(item => item.name)), []);
  assert.ok(authFlows.every(item => item.screenGroupId === item.parentGroupId));
  assert.ok(authFlows.filter(item => item.id !== 'pharmacy.authentication').every(item => authGroups.some(group => group.id === item.id))); // Stable compatibility anchors remain readable.
  assert.equal(seeds.flows.find(item => item.id === 'pharmacy.authentication').parentGroupId, 'pharmacy.registration-login.login');
  assert.equal(seeds.screens.some(screen => [
    'phone-number', 'otp-sms', 'otp-zalo', 'phone-login', 'vneid-login',
  ].includes(screen.slug) && screen.id.startsWith('pharmacy.registration-login.')), false);
});

test('new Flow ownership is additive while legacy Flow records remain unchanged', () => {
  const storage = new Map([[keys.flows, JSON.stringify([flow])], [keys.draft, '{"legacyDraft":"keep"}']]);
  const app = runtime(storage);
  const api = app.load('@/lib/local-inventory');
  const owned = { id: 'pharmacy.registration-login.registration.flow.social-login', slug: 'registration-social-login', name: 'Social Login', description: '', businessUnitId: 'pharmacy', screenGroupId: 'pharmacy.registration-login.registration', parentGroupId: 'pharmacy.registration-login.registration', status: 'active', screenIds: [] };
  api.createLocalFlow(owned);
  const persisted = JSON.parse(storage.get(keys.flows));
  assert.deepEqual(persisted.find(item => item.id === flow.id), flow);
  assert.deepEqual(persisted.find(item => item.id === owned.id), owned);
  assert.equal(storage.get(keys.draft), '{"legacyDraft":"keep"}');
  assert.throws(() => api.createLocalFlow({ ...owned, id: owned.id + '.duplicate', slug: owned.slug + '-duplicate' }), /already exists in this group/);
});

test('custom note types append safely, survive refresh, and never rewrite legacy records', () => {
  const legacyType = { id: 'custom.legacy', name: 'Research', unknownLegacyField: { keep: true } };
  const storage = new Map([
    [keys.noteTypes, JSON.stringify([legacyType])],
    [keys.screens, JSON.stringify([canonical])],
    [keys.draft, '{"legacyDraft":"keep"}'],
  ]);
  const screensBefore = storage.get(keys.screens);
  const draftBefore = storage.get(keys.draft);
  const app = runtime(storage);
  const api = app.load('@/lib/local-inventory');
  assert.deepEqual(plain(api.useCustomNoteTypes()), [legacyType]);
  assert.throws(() => api.createCustomNoteType(' research '), /already exists/);
  assert.throws(() => api.createCustomNoteType('INTERACTION'), /already exists/);
  const created = api.createCustomNoteType('  Product insight  ');
  assert.equal(created.name, 'Product insight');
  assert.match(created.id, /^custom\./);
  const persisted = JSON.parse(storage.get(keys.noteTypes));
  assert.deepEqual(persisted[0], legacyType);
  assert.deepEqual(persisted[1], plain(created));
  assert.deepEqual(plain(runtime(storage).load('@/lib/local-inventory').useCustomNoteTypes()), persisted);
  assert.equal(storage.get(keys.screens), screensBefore);
  assert.equal(storage.get(keys.draft), draftBefore);
  assert.deepEqual(app.writes, [['set', keys.noteTypes]]);
});

test('Flow sections preserve order, canonical identity and legacy storage across flat, sibling and nested groups', () => {
  const storage = new Map([[keys.flows, JSON.stringify([flow])], [keys.screens, JSON.stringify(screens)]]);
  const before = [...storage];
  const app = runtime(storage);
  const { flowSections } = app.load('@/lib/flow-sections');
  const root = { ...group, id: 'pharmacy.root', parentGroupId: null };
  const home = { ...root, id: 'pharmacy.home', name: 'Home Delivery', parentGroupId: root.id };
  const pickup = { ...home, id: 'pharmacy.pickup', name: 'Store Pickup' };
  const nested = { ...home, id: 'pharmacy.nested', name: 'Delivery time', parentGroupId: home.id };
  const allGroups = [root, home, pickup, nested];
  for (const assignments of [[root], [home, home], [home, home, pickup, pickup], [home, nested], [home, pickup, home]]) {
    const journey = assignments.map((g, index) => ({ ...canonical, id: `canonical.${index}`, screenGroupId: g.id }));
    const original = JSON.stringify(journey);
    const sections = flowSections(journey, allGroups);
    const steps = sections.flatMap(section => section.steps);
    assert.equal(steps.length, journey.length);
    steps.forEach((step, index) => { assert.equal(step.screen, journey[index]); assert.equal(step.index, index); });
    assert.equal(JSON.stringify(journey), original);
    if (assignments.length === 1) assert.equal(sections[0].context.length, 0);
    if (assignments[1] === nested) assert.deepEqual(plain(sections[1].context.map(g => g.name)), ['Home Delivery', 'Delivery time']);
    if (assignments.length === 4) assert.equal(sections.length, 2);
    if (assignments.length === 3) assert.equal(sections.length, 3); // Never regroup a later return.
  }
  assert.deepEqual([...storage], before);
  assert.deepEqual(app.writes, []);
});

test('three-level groups create, refresh, rename and delete safely without losing screen or draft content', () => {
  const storage = new Map([[keys.screens, JSON.stringify([canonical])], [keys.draft, '{"legacyDraft":"keep"}'], [keys.flows, JSON.stringify([flow])]]);
  const app = runtime(storage);
  const api = app.load('@/lib/local-inventory');
  const hierarchy = app.load('@/lib/screen-groups');
  const parent = { id: 'pharmacy.test-parent', businessUnitId: 'pharmacy', name: 'Parent', slug: 'test-parent', sequence: 100, description: '', screenIds: [], legacy: 'keep' };
  const child = { ...parent, id: 'pharmacy.test-child', slug: 'test-child', name: 'Child', parentGroupId: parent.id };
  api.createLocalScreenGroup(parent);
  api.createLocalScreenGroup(child);
  const leaf = { ...child, id: 'pharmacy.test-leaf', slug: 'test-leaf', name: 'Leaf', parentGroupId: child.id };
  api.createLocalScreenGroup(leaf);
  const beforeInvalid = [...storage];
  assert.throws(() => api.createLocalScreenGroup({ ...child, id: 'pharmacy.duplicate-child', name: ' CHILD ' }), /already exists under this parent/);
  assert.throws(() => api.createLocalScreenGroup({ ...child, id: 'deep', parentGroupId: leaf.id }), /Maximum group depth/);
  assert.throws(() => api.createLocalScreenGroup({ ...child, id: 'cross-unit', businessUnitId: 'testing' }), /same Business Unit/);
  assert.throws(() => api.createLocalScreenGroup(child), /already exists/);
  assert.throws(() => api.deleteLocalScreenGroup(parent.id), /promote/);
  assert.deepEqual([...storage], beforeInvalid);
  assert.throws(() => api.moveLocalScreenGroup(parent.id, leaf.id), /Maximum group depth/);
  assert.throws(() => api.moveLocalScreenGroup(child.id, leaf.id), /Maximum group depth/);
  assert.deepEqual([...storage], beforeInvalid);
  api.renameLocalScreenGroup(parent.id, 'Renamed parent');
  let groups = runtime(storage).load('@/lib/local-inventory').useScreenGroupInventory();
  assert.equal(groups.find(g => g.id === child.id).parentGroupId, parent.id);
  assert.equal(hierarchy.groupLabel(groups.find(g => g.id === child.id), groups), 'Renamed parent › Child');
  assert.equal(hierarchy.groupLabel(groups.find(g => g.id === leaf.id), groups), 'Renamed parent › Child › Leaf');
  assert.equal(hierarchy.groupPath(groups.find(g => g.id === leaf.id), groups).length, 3);
  const ordered = hierarchy.orderedGroups(groups);
  assert.equal(ordered[ordered.findIndex(g => g.id === parent.id) + 1].id, child.id);
  assert.equal(ordered[ordered.findIndex(g => g.id === parent.id) + 2].id, leaf.id);
  api.moveLocalScreenGroup(leaf.id, parent.id);
  api.moveLocalScreenGroup(leaf.id, child.id);
  api.deleteLocalScreenGroup(parent.id, undefined, 'promote');
  groups = runtime(storage).load('@/lib/local-inventory').useScreenGroupInventory();
  assert.equal(groups.find(g => g.id === child.id).parentGroupId, null);
  assert.equal(groups.find(g => g.id === child.id).legacy, 'keep');
  assert.equal(groups.find(g => g.id === leaf.id).parentGroupId, child.id);
  assert.equal(hierarchy.groupPath(groups.find(g => g.id === leaf.id), groups).length, 2);
  assert.equal(storage.get(keys.screens), JSON.stringify([canonical]));
  assert.equal(storage.get(keys.draft), '{"legacyDraft":"keep"}');
  assert.equal(storage.get(keys.flows), JSON.stringify([flow]));
  const originalGroupId = canonical.screenGroupId;
  assert.throws(() => api.deleteLocalScreenGroup(originalGroupId, undefined, 'promote'), /Reassign/);
  api.deleteLocalScreenGroup(originalGroupId, child.id, 'promote');
  const moved = JSON.parse(storage.get(keys.screens));
  assert.deepEqual(moved.find(s => s.id === canonical.id), { ...canonical, screenGroupId: child.id });
  assert.equal(new Set(moved.map(s => s.id)).size, moved.length);
  assert.ok(moved.every(s => s.screenGroupId === child.id));
  assert.equal(storage.get(keys.draft), '{"legacyDraft":"keep"}');
  assert.equal(storage.get(keys.flows), JSON.stringify([flow]));
});

for (const marked of [false, true]) {
  for (const name of ['hehe', 'foundation test screen', 'otp-note-test', 'LC Login Input Filled', 'LC Profile']) {
    test(`reads preserve legacy data; markers=${marked}, draft=${name}`, () => {
      const draft = { businessUnitId: 'pharmacy', screenGroupId: 'pharmacy.app-entry', name,
        mobile: true, web: false, mobilePlatform: 'iOS', mobilePreview: preview,
        mobileRepresentations: [state, variant], mobileAnnotations: [note], legacyUnknown: 'keep' };
      const storage = new Map([
        [keys.screens, JSON.stringify(screens)], [keys.flows, JSON.stringify([flow])],
        [keys.groups, JSON.stringify([group])], [keys.draft, JSON.stringify(draft)],
        [keys.deletedFlows, '[]'], [keys.deletedGroups, '[]'], ['unknown-library-key', 'unchanged'],
        ...(marked ? markers.map(key => [key, 'complete']) : []),
      ]);
      const before = [...storage];
      // Fresh module instances simulate startup and full page refresh.
      for (let refresh = 0; refresh < 2; refresh++) {
        const app = runtime(storage);
        const inventory = app.load('@/lib/local-inventory');
        const resolver = app.load('@/lib/screen-platform');
        for (let read = 0; read < 2; read++) {
          const hydrated = inventory.useScreenInventory();
          for (const original of screens) {
            const loaded = hydrated.find(s => s.id === original.id);
            assert.deepEqual(plain(loaded), { ...original, screenGroupId: original.screenGroupId === 'pharmacy.app-entry' ? 'pharmacy.registration-login.login' : original.screenGroupId });
            assert.equal(resolver.resolveScreenPreview(loaded, 'mobile'), preview);
            assert.equal(resolver.resolveScreenPlatform(loaded, 'mobile').preview, preview);
            assert.equal(resolver.resolveScreenVersion(loaded, 'mobile').screen.preview, preview);
          }
          assert.deepEqual(plain(inventory.useFlowInventory().find(f => f.id === flow.id)), { ...flow, name: "Luồng default", parentGroupId: "pharmacy.registration-login.login", screenIds: [...flow.screenIds, ...seeds.screens.filter(s => s.screenGroupId === "pharmacy.registration-login.login" && !flow.screenIds.includes(s.id)).map(s => s.id)] });
          assert.deepEqual(plain(inventory.useScreenGroupInventory().find(g => g.id === group.id)), group);
          assert.deepEqual(plain(inventory.loadScreenDraft()), draft);
          assert.deepEqual([...storage], before);
          assert.deepEqual(app.writes, []);
          app.invalidate(); // Cross-tab storage notification must also remain read-only.
        }
      }
    });
  }
}

test('Metadata normalizes legacy values at runtime, preserves Jira URLs and appends reusable tags safely', () => {
  const app = runtime(new Map());
  const helpers = app.load('@/lib/metadata-values');
  const url = 'https://jira.example.com/browse/ABC9-123?source=library';
  assert.deepEqual(plain(helpers.jiraLink(url)), { key: 'ABC9-123', url });
  assert.equal(helpers.jiraLink('javascript:alert(1)'), undefined);
  assert.equal(helpers.jiraLink('DSCR-1234'), undefined);
  assert.equal(helpers.jiraLink('https://jira.example.com/no-ticket'), undefined);
  assert.deepEqual(plain(helpers.addTicketUrls(['ABC9-123'], url)), ['ABC9-123']);
  assert.deepEqual(plain(helpers.addTicketUrls([], url + ',https://jira.example.com/browse/XYZ-7')), [url, 'https://jira.example.com/browse/XYZ-7']);
  assert.throws(() => helpers.addTicketUrls([], 'invalid'), /valid Jira URL/);
  assert.deepEqual(plain(helpers.componentNames('Button, Card, button')), ['Button', 'Card']);
  assert.deepEqual(plain(helpers.componentNames([{id:'old',name:'Button',unknown:7}, 'Card'])), ['Button', 'Card']);
  const original = JSON.stringify([{ ...canonical, components: 'Button, Legacy Component' }]);
  const storage = new Map([[keys.screens, original], [keys.draft, '{"components":"Legacy, Tag","jiraTicket":"OLD-1"}']]);
  const session = runtime(storage); const tags = session.load('@/lib/component-tags');
  const before = [...storage];
  assert.ok(tags.useComponentTags().includes('Legacy Component'));
  assert.deepEqual([...storage], before);
  tags.registerComponentTag(' Reusable Tag ');
  tags.registerComponentTag('reusable tag');
  assert.deepEqual(JSON.parse(storage.get('lc-library.phase1.component-tags')), ['Reusable Tag']);
  assert.ok(runtime(storage).load('@/lib/component-tags').useComponentTags().includes('Reusable Tag'));
  for (const [key,value] of before) assert.equal(storage.get(key),value);
  const draft = { ...JSON.parse(storage.get(keys.draft)), jiraTicket: url, relatedTickets: 'https://jira.example.com/browse/XYZ-7', components: 'Button, Reusable Tag', unknownMetadata: 'keep' };
  session.load('@/lib/local-inventory').saveScreenDraft(draft);
  assert.deepEqual(plain(runtime(storage).load('@/lib/local-inventory').loadScreenDraft()), draft);
  assert.equal(storage.get(keys.screens), original);
  assert.throws(() => tags.registerComponentTag('  '));
  storage.set('lc-library.phase1.component-tags','{"futureFormat":true}');
  assert.throws(() => tags.registerComponentTag('Keep future data'));
  assert.equal(storage.get('lc-library.phase1.component-tags'),'{"futureFormat":true}');
});


test('default Flow projection survives reload without persisting generated records or changing HOME data', () => {
  const orphan = { ...canonical, id: 'home.orphan', businessUnitId: 'future', screenGroupId: 'future.group', sequence: 1 };
  const storage = new Map([
    [keys.screens, JSON.stringify([orphan])],
    [keys.groups, JSON.stringify([{ id: 'future.group', businessUnitId: 'future', name: 'Future group', slug: 'future', sequence: 1, screenIds: [] }])],
    [keys.draft, JSON.stringify({ preview, unknown: 'keep' })],
  ]);
  const before = [...storage];
  const app = runtime(storage);
  const api = app.load('@/lib/local-inventory');
  const flow = api.useFlowInventory().find(f => f.parentGroupId === 'future.group');
  assert.deepEqual(plain(flow.screenIds), [orphan.id]);
  assert.deepEqual(plain(runtime(storage).load('@/lib/local-inventory').useFlowInventory().find(f => f.id === flow.id)), plain(flow));
  assert.deepEqual([...storage], before);
  assert.deepEqual(app.writes, []);
});


test('preview edits preserve unrelated drafts and image removal keeps Screen identity, notes and Flow order', () => {
  const record = { ...canonical, representations: { ...canonical.representations, mobile: { ...canonical.representations.mobile, dimensions: '400 × 800' } } };
  const storage = new Map([[keys.screens, JSON.stringify([record])], [keys.flows, JSON.stringify([flow])], [keys.draft, '{"name":"Unsaved HOME draft","unknown":true}']]);
  const draftBefore = storage.get(keys.draft);
  const flowsBefore = storage.get(keys.flows);
  const api = runtime(storage).load('@/lib/local-inventory');
  api.updateExistingScreenPreview(record.id, 'mobile', null);
  const after = JSON.parse(storage.get(keys.screens))[0];
  assert.equal(after.id, record.id);
  assert.equal(after.preview, null);
  assert.equal(after.representations.mobile.dimensions, '400 × 800');
  assert.deepEqual(after.representations.mobile.variants, (record.representations.mobile.variants ?? []).map(option => option.isDefault ? { ...option, preview: null } : option));
  assert.deepEqual(after.states, record.states);
  assert.deepEqual(after.variants, record.variants.map(variant =>
    variant.isDefault ? { ...variant, preview: null } : variant
  ));
  assert.deepEqual(after.annotations, record.annotations);
  assert.deepEqual(after.legacyUnknown, record.legacyUnknown);
  assert.equal(storage.get(keys.draft), draftBefore);
  assert.equal(storage.get(keys.flows), flowsBefore);
});

test('quota failures retain existing data and produce an actionable error message', () => {
  const storage = new Map([[keys.screens, JSON.stringify([canonical])], [keys.draft, '{"name":"Keep"}']]);
  const before = [...storage];
  storage.set = () => { const error = new Error('Full'); error.name = 'QuotaExceededError'; throw error; };
  const app = runtime(storage);
  const api = app.load('@/lib/local-inventory');
  assert.throws(() => api.saveScreenDraft({ name: 'Unsaved' }), /Full/);
  assert.throws(() => api.updateExistingScreenPreview(canonical.id, 'mobile', preview + 'new'), /Full/);
  assert.deepEqual([...storage], before);
  const { storageErrorMessage } = app.load('@/lib/storage-errors');
  assert.match(storageErrorMessage({ name: 'QuotaExceededError' }), /storage is full/);
});


test('legacy auth records resolve without storage writes; unknown ownership stops instead of guessing', () => {
  const legacyScreen = { ...canonical, screenGroupId: 'pharmacy.app-entry' };
  const legacyFlow = { ...flow, screenGroupId: 'pharmacy.app-entry', parentGroupId: undefined, screenIds: [canonical.id] };
  const storage = new Map([[keys.screens, JSON.stringify([legacyScreen])], [keys.flows, JSON.stringify([legacyFlow])], [keys.groups, JSON.stringify([{ id: 'pharmacy.app-entry', name: 'App Entry & Authentication', slug: 'app-entry', screenIds: [canonical.id] }])]]);
  const before = [...storage];
  const app = runtime(storage), api = app.load('@/lib/local-inventory');
  const loaded = api.useScreenInventory();
  assert.deepEqual(plain(loaded.find(s => s.id === canonical.id)), { ...legacyScreen, screenGroupId: 'pharmacy.registration-login.login' });
  assert.equal(api.useScreenGroupInventory().some(g => g.id === 'pharmacy.app-entry'), false);
  assert.deepEqual(plain(app.load('@/lib/screen-search').searchScreenInventory('App Entry & Authentication', loaded, api.useFlowInventory(), api.useScreenGroupInventory())), []);
  assert.equal(app.load('@/lib/design-library').screenHref(legacyScreen), '/screens/pharmacy/login/' + canonical.slug);
  assert.deepEqual([...storage], before);
  assert.deepEqual(app.writes, []);
  const unmapped = { ...legacyScreen, id: 'home.unknown', name: 'Unmapped HOME record' };
  const unsafe = new Map([[keys.screens, JSON.stringify([unmapped])]]), unsafeBefore = [...unsafe];
  assert.throws(() => runtime(unsafe).load('@/lib/local-inventory').useScreenInventory(), /Auth mapping required for Screen home.unknown/);
  assert.deepEqual([...unsafe], unsafeBefore);
  const helper = app.load('@/lib/flow-context');
  assert.throws(() => helper.flowOwnerGroupId({ ...legacyFlow, id: 'unknown.flow' }), /Auth mapping required for Flow unknown.flow/);
});

test('failed publication restores Flow writes and preserves the draft', () => {
  const storage = new Map([[keys.screens, JSON.stringify([canonical])], [keys.flows, JSON.stringify([flow])], [keys.draft, '{"name":"keep"}']]);
  const before = [...storage], set = storage.set.bind(storage);
  storage.set = (key, value) => { if (key === keys.screens) { const error = new Error('Quota'); error.name = 'QuotaExceededError'; throw error; } return set(key, value); };
  const api = runtime(storage).load('@/lib/local-inventory');
  assert.throws(() => api.publishLocalScreen({ ...canonical, id: 'fixture.new' }, { flowId: flow.id, insertAfterScreenId: null }), /Quota/);
  assert.deepEqual([...storage], before);
});

test('Tree group management preserves IDs and blocks every occupied-group deletion without writes', () => {
  const storage = new Map();
  const app = runtime(storage), inventory = app.load('@/lib/local-inventory');
  const group = { id: 'pharmacy.fixture-tree', slug: 'fixture-tree', businessUnitId: 'pharmacy', name: 'Fixture group', sequence: 999, description: 'keep', screenIds: [], unknown: { retain: true } };
  inventory.createLocalScreenGroup(group);
  inventory.renameLocalScreenGroup(group.id, ' Renamed group ');
  const renamed = inventory.useScreenGroupInventory().find(item => item.id === group.id);
  assert.equal(renamed.name, 'Renamed group');
  assert.equal(renamed.slug, group.slug);
  assert.deepEqual(plain(renamed.unknown), group.unknown);
  assert.throws(() => inventory.renameLocalScreenGroup(group.id, '  '), /Enter a group name/);
  inventory.deleteEmptyLocalScreenGroup(group.id);
  assert.equal(runtime(storage).load('@/lib/local-inventory').useScreenGroupInventory().some(item => item.id === group.id), false);
  for (const kind of ['screen', 'flow', 'child', 'draft', 'legacy-reference']) {
    const values = new Map([[keys.groups, JSON.stringify([{ ...group, screenIds: kind === 'legacy-reference' ? ['legacy'] : [] }])]]);
    if (kind === 'screen') values.set(keys.screens, JSON.stringify([{ ...canonical, id: 'fixture-screen', screenGroupId: group.id }]));
    if (kind === 'flow') values.set(keys.flows, JSON.stringify([{ id: 'fixture-flow', slug: 'fixture-flow', name: 'Empty flow', businessUnitId: 'pharmacy', parentGroupId: group.id, screenGroupId: group.id, screenIds: [], status: 'active' }]));
    if (kind === 'child') values.set(keys.groups, JSON.stringify([group, { ...group, id: 'fixture-child', parentGroupId: group.id }]));
    if (kind === 'draft') values.set(keys.draft, JSON.stringify({ screenGroupId: group.id, preview }));
    const before = [...values];
    const isolated = runtime(values).load('@/lib/local-inventory');
    assert.throws(() => isolated.deleteEmptyLocalScreenGroup(group.id), /Move\/reassign/);
    assert.deepEqual([...values], before);
  }
});

test('acknowledged group cleanup preserves Screens/Flows/drafts and promotes subgroups across reload', () => {
  const parent = { id: 'pharmacy.remove-fixture', slug: 'remove-fixture', name: 'Removal fixture', businessUnitId: 'pharmacy', sequence: 999, description: '', screenIds: ['fixture.keep-screen'] };
  const child = { ...parent, id: 'pharmacy.keep-child', slug: 'keep-child', name: 'Keep child', parentGroupId: parent.id, screenIds: [] };
  const screen = { ...canonical, id: 'fixture.keep-screen', screenGroupId: parent.id };
  const unrelated = { ...canonical, id: 'fixture.unrelated', screenGroupId: 'pharmacy.checkout' };
  const journey = { ...flow, id: 'fixture.keep-flow', slug: 'keep-flow', parentGroupId: parent.id, screenGroupId: parent.id, screenIds: [screen.id, 'future.home-screen'], legacyOrder: true };
  const draft = { businessUnitId: 'pharmacy', screenGroupId: parent.id, flowId: journey.id, preview, unknown: 'retain' };
  const storage = new Map([[keys.groups, JSON.stringify([parent, child])], [keys.screens, JSON.stringify([screen, unrelated])], [keys.flows, JSON.stringify([journey])], [keys.draft, JSON.stringify(draft)]]);
  const app = runtime(storage), api = app.load('@/lib/local-inventory');
  const before = [...storage];
  assert.equal(api.permanentGroupDeletionBlocker(parent.id), undefined);
  assert.deepEqual([...storage], before, 'opening confirmation is read-only');
  api.permanentlyDeleteLocalScreenGroup(parent.id);
  const reloaded = runtime(storage).load('@/lib/local-inventory');
  const groups = reloaded.useScreenGroupInventory();
  assert.equal(groups.some(g => g.id === parent.id), false);
  assert.equal(groups.find(g => g.id === child.id).parentGroupId, null);
  const destination = groups.find(g => g.slug === 'ungrouped');
  assert.ok(destination);
  assert.deepEqual(plain(reloaded.useScreenInventory().find(s => s.id === screen.id)), { ...screen, screenGroupId: destination.id });
  assert.deepEqual(plain(reloaded.useScreenInventory().find(s => s.id === unrelated.id)), unrelated);
  assert.deepEqual(plain(reloaded.useFlowInventory().find(f => f.id === journey.id)), { ...journey, screenGroupId: destination.id, parentGroupId: destination.id });
  assert.deepEqual(JSON.parse(storage.get(keys.draft)), { ...draft, screenGroupId: destination.id });
  assert.ok(!reloaded.useFlowInventory().some(f => f.parentGroupId === parent.id || f.screenGroupId === parent.id));
  assert.ok(!reloaded.useScreenInventory().some(s => s.screenGroupId === parent.id));
});

test('unsafe group cleanup blocks missing records and malformed persisted data without writes', () => {
  const parent = { id: 'pharmacy.blocked', slug: 'blocked', name: 'Blocked', businessUnitId: 'pharmacy', sequence: 999, description: '', screenIds: ['missing-home-screen'] };
  for (const malformed of [false, true]) {
    const storage = new Map([[keys.groups, JSON.stringify([parent])]]);
    if (malformed) storage.set(keys.screens, '{broken');
    const before = [...storage], api = runtime(storage).load('@/lib/local-inventory');
    assert.ok(api.permanentGroupDeletionBlocker(parent.id));
    assert.throws(() => api.permanentlyDeleteLocalScreenGroup(parent.id));
    assert.deepEqual([...storage], before);
  }
  const api = runtime(new Map()).load('@/lib/local-inventory');
  assert.match(api.permanentGroupDeletionBlocker('pharmacy.registration-login.login'), /legacy authentication/);
});

test('permanent group cleanup rolls back all writes on quota failure', () => {
  const parent = { id: 'pharmacy.quota-group', slug: 'quota-group', name: 'Quota', businessUnitId: 'pharmacy', sequence: 999, description: '', screenIds: [] };
  const storage = new Map([[keys.groups, JSON.stringify([parent])], [keys.screens, JSON.stringify([{...canonical, id:'fixture.quota-screen', screenGroupId:parent.id}])]]);
  const before = [...storage];
  const originalSet = storage.set.bind(storage);
  let failed = false;
  storage.set = (key, value) => { if (key === keys.deletedGroups && !failed) { failed = true; throw new Error('Quota exceeded'); } return originalSet(key, value); };
  const api = runtime(storage).load('@/lib/local-inventory');
  assert.throws(() => api.permanentlyDeleteLocalScreenGroup(parent.id), /Quota/);
  assert.deepEqual([...storage], before);
});


test('repository contracts expose identical snapshots, read-only hydration and coordinated Local commands', () => {
  const storage = new Map();
  const app = runtime(storage);
  const { repositories: repo } = app.load('@/lib/repositories/provider');
  const ui = app.load('@/lib/repositories/client');
  const before = [...storage];
  assert.strictEqual(ui.useScreenInventory(), repo.screens.getSnapshot());
  assert.strictEqual(ui.useFlowInventory(), repo.flows.getSnapshot());
  assert.strictEqual(ui.useScreenGroupInventory(), repo.groups.getSnapshot());
  assert.strictEqual(ui.useBusinessUnitInventory(), repo.products.getSnapshot());
  assert.deepEqual([...storage], before);
  assert.deepEqual(app.writes, []);
  assert.strictEqual(ui.publishLocalScreen, repo.screens.publish);
  assert.strictEqual(ui.reorderLocalFlowScreens, repo.flows.reorder);
  assert.strictEqual(ui.deleteLocalScreen, repo.screens.delete);
  assert.equal(repo.identity.current().displayName, 'Local User');
  assert.equal(repo.identity.current().authorName, 'Local User');
  assert.equal(repo.assets.resolve('data:image/png;base64,legacy'), 'data:image/png;base64,legacy');
  const flow = repo.flows.getSnapshot()[0];
  repo.flows.update(flow.id, { name: 'Contract fixture', description: flow.description });
  assert.equal(ui.useFlowInventory().find(item => item.id === flow.id).name, 'Contract fixture');
  assert.equal(runtime(storage).load('@/lib/repositories/provider').repositories.flows.getSnapshot().find(item => item.id === flow.id).name, 'Contract fixture');
});

test('Local route lookup preserves malformed legacy fallback without rewriting stored JSON', () => {
  const storage = new Map([[keys.groups, '{"legacy":true}']]);
  const before = [...storage];
  const app = runtime(storage);
  const seed = app.load('@/data/design-library').screenGroups[0];
  assert.equal(app.load('@/lib/design-library').getGroup(seed.id).id, seed.id);
  assert.deepEqual([...storage], before);
  assert.deepEqual(app.writes, []);
});

test('manual preview with design source checks and versions without losing the manual baseline',()=>{
 const source={fileKey:'abc',nodeId:'1:2',url:'https://www.figma.com/design/abc/Test?node-id=1-2',lastCheckedAt:'',lastSyncedFingerprint:''};
 const manual={...canonical,sourceType:'upload',figmaSource:source};
 const storage=new Map([[keys.screens,JSON.stringify([manual])]]);
 const api=runtime(storage).load('@/lib/local-inventory');
 const before=api.useScreenInventory().find(s=>s.id===manual.id);
 const frame={...source,name:'Design',width:375,height:812,preview:preview+'new',fingerprint:'figma-new'};
 api.recordFigmaCheck(manual.id,source,{changed:true,checkedAt:'2026-10-12T10:00:00Z',frame});
 const pending=api.useScreenInventory().find(s=>s.id===manual.id);
 assert.equal(pending.sourceType,'upload');assert.equal(pending.preview,before.preview);
 assert.equal(pending.pendingFigmaUpdate.frame.fingerprint,'figma-new');
 assert.equal(JSON.stringify(pending.versionHistory),JSON.stringify(before.versionHistory));
 api.createVersionFromFigma(manual.id,'mobile',frame,'2026-10-12T10:01:00Z');
 const after=runtime(storage).load('@/lib/local-inventory').useScreenInventory().find(s=>s.id===manual.id);
 assert.equal(after.id,manual.id);assert.equal(after.preview,frame.preview);
 const archive=after.versionHistory.mobile.find(v=>v.status==='archived');
 assert.equal(archive.preview,before.representations.mobile.preview??before.preview);
 assert.equal(archive.sourceType,'upload');
});
