import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';

const publishedKey = 'lc-library.phase1.published-screens';

function runtime(storage = new Map()) {
  const cache = new Map();
  const writes = [];
  const window = {
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => { writes.push(['set', key]); storage.set(key, value); },
      removeItem: key => { writes.push(['remove', key]); storage.delete(key); },
    },
    addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => {},
  };
  function load(name) {
    if (name === 'react') return { useSyncExternalStore: (_subscribe, snapshot) => snapshot() };
    if (cache.has(name)) return cache.get(name);
    const file = path.join(import.meta.dirname, '..', 'src', name.replace(/^@\//, '') + '.ts');
    const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    } }).outputText;
    const exports = {};
    cache.set(name, exports);
    vm.runInNewContext(code, { exports, require: load, window, Event, URL, URLSearchParams }, { filename: file });
    return exports;
  }
  return { load, storage, writes };
}


function inspect(app) {
  const api = app.load('@/lib/local-inventory'), ctx = app.load('@/lib/flow-context'), paths = app.load('@/lib/screen-groups');
  const units = app.load('@/lib/business-units').getBusinessUnits(), screens = api.useScreenInventory(), flows = api.useFlowInventory();
  const groups = ctx.activeTreeGroups(api.useScreenGroupInventory(), flows);
  for (const records of [units, groups, flows, screens]) assert.equal(new Set(records.map(r => r.id)).size, records.length);
  for (const group of groups) { assert.ok(paths.groupPath(group, groups)); assert.ok(units.some(u => u.id === paths.groupUnitId(group))); }
  for (const flow of flows) {
    assert.ok(groups.some(g => g.id === ctx.flowOwnerGroupId(flow) && paths.groupUnitId(g) === flow.businessUnitId));
    assert.equal(new Set(flow.screenIds).size, flow.screenIds.length);
    for (const id of flow.screenIds) assert.ok(screens.some(s => s.id === id && s.businessUnitId === flow.businessUnitId));
  }
  for (const screen of screens) {
    assert.ok(groups.some(g => g.id === screen.screenGroupId && paths.groupUnitId(g) === screen.businessUnitId));
    assert.ok(flows.some(f => ctx.screensForFlow(f, screens).some(s => s.id === screen.id)));
    for (const option of [...screen.states, ...screen.variants]) assert.ok(!flows.some(f => f.screenIds.includes(option.id)));
  }
  assert.ok(!groups.some(g => g.id === 'pharmacy.app-entry' || g.name === 'App Entry & Authentication'));
  return { units, groups, flows, screens };
}
test('IA v1 seed projection has valid ownership, unique IDs and Screen-only Flow steps without writes', () => {
  const app = runtime(); const { units, groups, flows, screens } = inspect(app);
  assert.equal(units.length, 4); assert.equal(groups.length, 22); assert.equal(flows.length, 24); assert.equal(screens.length, 64);
  const raw = app.load('@/data/design-library').flows.find(f => f.id === 'pharmacy.registration-login.vneid');
  assert.equal(raw.screenGroupId, raw.parentGroupId);
  assert.deepEqual(app.writes, []);
});
test('future products use the same hierarchy and Search context; local identity and unknown data survive', () => {
  const app = runtime(); const baseline = inspect(app);
  const unit = { id: 'future', slug: 'future', name: 'Future unit', groupIds: [], status: 'active', shortName: 'FU' };
  const parent = { id: 'future.parent', slug: 'parent', name: 'Parent', businessUnitId: unit.id, sequence: 1, screenIds: [] };
  const group = { ...parent, id: 'future.child', slug: 'child', name: 'Child', parentGroupId: parent.id };
  const screen = { ...baseline.screens[0], id: 'future.screen', slug: 'screen', businessUnitId: unit.id, screenGroupId: group.id, name: 'Future screen', legacyUnknown: { keep: true } };
  const flow = { id: 'future.journey', slug: 'future-journey', businessUnitId: unit.id, screenGroupId: group.id, parentGroupId: group.id, name: 'Journey', screenIds: [screen.id], status: 'active', description: '' };
  const storage = new Map([
    ['lc-library.phase1.business-unit-overrides', JSON.stringify({ overrides: [unit], deletedIds: [] })],
    ['lc-library.phase1.screen-group-overrides', JSON.stringify([parent, group])],
    ['lc-library.phase1.flow-overrides', JSON.stringify([flow])],
    [publishedKey, JSON.stringify([screen])],
  ]);
  const before = JSON.stringify([...storage]), local = runtime(storage), data = inspect(local);
  const results = local.load('@/lib/screen-search').searchScreenInventory('Journey', data.screens, data.flows, data.groups, data.units);
  const found = results.find(r => r.id === screen.id);
  assert.equal(found.context, 'Future unit · Parent › Child › Journey');
  assert.equal(found.screen.legacyUnknown.keep, true);
  assert.equal(JSON.stringify([...storage]), before); assert.deepEqual(local.writes, []);
});
