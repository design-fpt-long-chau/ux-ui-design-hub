import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';

function modules() {
  const cache = new Map();
  function load(name) {
    if (cache.has(name)) return cache.get(name);
    const file = path.join(import.meta.dirname, '..', 'src', name.replace(/^@\//, '') + '.ts');
    const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports = {};
    cache.set(name, exports);
    vm.runInNewContext(code, { exports, require: load }, { filename: file });
    return exports;
  }
  return { load };
}

const plain = value => JSON.parse(JSON.stringify(value));

test('search indexes each Flow membership once and preserves canonical result identities', () => {
  const app = modules();
  const context = app.load('@/lib/flow-context');
  const original = context.screensForFlow;
  let calls = 0;
  context.screensForFlow = (...args) => { calls++; return original(...args); };
  const {screens, flows, screenGroups, businessUnits} = app.load('@/data/design-library');
  const {searchScreenInventory} = app.load('@/lib/screen-search');
  const results = searchScreenInventory('Nhà thuốc', screens, flows, screenGroups, businessUnits);
  assert.ok(results.some(result => result.kind === 'screen'));
  assert.ok(calls <= flows.length);
  assert.equal(new Set(results.map(result => result.id)).size, results.length);
  for (const result of results.filter(result => result.kind === 'screen')) {
    assert.ok(screens.some(screen => screen.id === result.id));
  }
});

test('auth Flows belong to stable structural Tree parents and selector scope excludes unrelated journeys', () => {
  const app = modules();
  const { flows } = app.load('@/data/design-library');
  const { flowsForGroup, flowOwnerGroupId, isFlowCompatibilityGroup } = app.load('@/lib/flow-context');
  const { screenGroups } = app.load('@/data/design-library');
  const registration = flowsForGroup(flows, 'pharmacy', 'pharmacy.registration-login.registration');
  const login = flowsForGroup(flows, 'pharmacy', 'pharmacy.registration-login.login');
  const root = flowsForGroup(flows, 'pharmacy', 'pharmacy.registration-login');

  assert.deepEqual(plain(registration.map(flow => flow.name)), ['Luồng default', 'Invalid Cases', 'Nhập OTP qua SMS', 'Nhận OTP qua Zalo']);
  assert.deepEqual(plain(login.map(flow => flow.name)), ['Luồng default', 'Invalid Cases', 'Đăng nhập qua VNeID', 'Đăng nhập Nhà thuốc']);
  assert.deepEqual(plain(root.map(flow => flow.name)), []);
  assert.equal(registration.some(flow => flow.id === 'pharmacy.checkout'), false);
  assert.equal(registration.every(flow => flowOwnerGroupId(flow) === 'pharmacy.registration-login.registration'), true);
  assert.equal(flowOwnerGroupId(flows.find(flow => flow.id === 'pharmacy.authentication')), 'pharmacy.registration-login.login');
  assert.equal(flows.find(flow => flow.id === 'pharmacy.authentication').parentGroupId, 'pharmacy.registration-login.login');
  assert.equal(isFlowCompatibilityGroup(screenGroups.find(group => group.id === registration[0].id), flows), true);
  assert.equal(isFlowCompatibilityGroup(screenGroups.find(group => group.id === 'pharmacy.registration-login.registration'), flows), false);
});

test('Flow screen order keeps canonical IDs and appends legacy group-backed screens without cloning', () => {
  const { screensForFlow } = modules().load('@/lib/flow-context');
  const flow = { id: 'flow', businessUnitId: 'pharmacy', screenGroupId: 'group', name: 'Flow', slug: 'flow', description: '', status: 'active', screenIds: ['a', 'b'] };
  const screens = [
    { id: 'b', screenGroupId: 'group', sequence: 2 },
    { id: 'legacy-2', screenGroupId: 'flow', sequence: 2 },
    { id: 'a', screenGroupId: 'group', sequence: 1 },
    { id: 'legacy-1', screenGroupId: 'flow', sequence: 1 },
  ];
  const result = screensForFlow(flow, screens);
  assert.deepEqual(plain(result.map(screen => screen.id)), ['a', 'b', 'legacy-1', 'legacy-2']);
  assert.equal(new Set(result.map(screen => screen.id)).size, result.length);
  assert.deepEqual(plain(flow.screenIds), ['a', 'b']);
});

test('identical Flow names are searchable and distinguishable by Big Unit and Section', () => {
  const { flowLocation, matchesFlowSearch } = modules().load('@/lib/flow-context');
  const units = [
    { id: 'testing', name: 'Xét nghiệm' },
    { id: 'vaccination', name: 'Tiêm chủng' },
  ];
  const groups = [
    { id: 'testing.registration', businessUnitId: 'testing', name: 'Đăng ký xét nghiệm', parentGroupId: null },
    { id: 'vaccination.registration', businessUnitId: 'vaccination', name: 'Đăng ký tiêm', parentGroupId: null },
  ];
  const flows = [
    { id: 'testing.default', name: 'Luồng mặc định', businessUnitId: 'testing', screenGroupId: groups[0].id, parentGroupId: groups[0].id },
    { id: 'vaccination.default', name: 'Luồng mặc định', businessUnitId: 'vaccination', screenGroupId: groups[1].id, parentGroupId: groups[1].id },
  ];
  assert.equal(matchesFlowSearch(flows[0], 'Xét nghiệm', units, groups), true);
  assert.equal(matchesFlowSearch(flows[0], 'Đăng ký tiêm', units, groups), false);
  assert.equal(matchesFlowSearch(flows[1], 'Đăng ký tiêm', units, groups), true);
  assert.deepEqual(plain(flowLocation(flows[0], units, groups)), {
    unitName: 'Xét nghiệm', sectionName: 'Đăng ký xét nghiệm', sectionPath: 'Đăng ký xét nghiệm',
    breadcrumb: 'Xét nghiệm / Đăng ký xét nghiệm / Luồng mặc định',
  });
  assert.deepEqual(plain(flowLocation({ ...flows[0], businessUnitId: 'missing', parentGroupId: 'missing' }, units, groups)), {
    unitName: 'Not assigned', sectionName: 'Not assigned', sectionPath: 'Not assigned',
    breadcrumb: 'Not assigned / Not assigned / Luồng mặc định',
  });
  assert.notEqual(flows[0].id, flows[1].id);
});

test('Tree, Flow detail, Add Screen and global index are wired to the shared Flow context', () => {
  const read = file => readFileSync(path.join(import.meta.dirname, '..', file), 'utf8');
  const tree = read('src/components/tree/library-tree.tsx');
  const detail = read('src/components/flows/dynamic-flow-detail.tsx');
  const add = read('src/components/manage/add-screen-form.tsx');
  const index = read('src/components/flows/flows-page.tsx');
  const combobox = read('src/components/manage/flow-combobox.tsx');
  assert.match(tree, /<TreeFlowName/);
  assert.match(read('src/components/tree/tree-flow-name.tsx'), /<GitBranch/);
  assert.match(read('src/components/tree/tree-flow-name.tsx'), /href=\{`\/flows\/\$\{flow\.slug\}`\}/);
  assert.match(tree, /Create new flow/);
  assert.match(detail, /flowId: flow\.id/);
  assert.match(detail, /No screens in this flow yet\./);
  assert.match(add, /flowsForGroup\(placementFlows, draft\.businessUnitId, draft\.screenGroupId\)/);
  assert.match(add, /parentGroupId: group\.id/);
  assert.match(index, /<FlowGroupSections/);
  assert.match(read('src/components/flows/flow-group-sections.tsx'), /groupLabel/);
  assert.match(combobox, /role="combobox"/);
  assert.match(combobox, /location\.unitName} · \{location\.sectionName/);
  assert.match(combobox, /matchesFlowSearch/);
  assert.match(tree, /SortableFlowList/);
  assert.match(tree, /reorderLocalFlows/);
  assert.match(read('src/components/flows/flow-group-sections.tsx'), /orderedFlows/);
  assert.match(combobox, /orderedFlows/);
});


test('default journeys cover empty, single, many and future-unit inventories without mutating records', () => {
  const { withDefaultFlows, screensForFlow } = modules().load('@/lib/flow-context');
  const groups = [{ id: 'future.group', businessUnitId: 'future', name: 'Group', slug: 'group', sequence: 1 }];
  assert.deepEqual(plain(withDefaultFlows([], groups, [])), []);
  const screens = [3, 1, 2].map(n => ({ id: 'screen.' + n, businessUnitId: 'future', screenGroupId: groups[0].id, sequence: n, states: [{ id: 'state.' + n }], variants: [{ id: 'variant.' + n }], legacyUnknown: 'keep' }));
  for (const fixture of [screens.slice(0, 1), screens]) {
    const before = JSON.stringify(fixture);
    const result = withDefaultFlows([], groups, fixture);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'Luồng default');
    assert.equal(result[0].parentGroupId, groups[0].id);
    assert.deepEqual(plain(result[0].screenIds), [...fixture].sort((a,b) => a.sequence-b.sequence).map(s => s.id));
    screensForFlow(result[0], fixture).forEach(s => assert.ok(fixture.includes(s)));
    assert.equal(JSON.stringify(fixture), before);
    assert.deepEqual(plain(withDefaultFlows(result, groups, fixture)), plain(result));
  }
});

test('existing journeys keep order and metadata; only unassigned screens join the default', () => {
  const { withDefaultFlows } = modules().load('@/lib/flow-context');
  const group = { id: 'unit.group', businessUnitId: 'unit' };
  const screens = ['a', 'b', 'c', 'd'].map((id,sequence) => ({ id, sequence, businessUnitId: 'unit', screenGroupId: group.id }));
  const named = { id: 'named', slug: 'named', name: 'Named journey', businessUnitId: 'unit', screenGroupId: group.id, screenIds: ['b', 'a'], metadata: { keep: true } };
  const fallback = { ...named, id: 'default', slug: 'default', name: 'Luồng default', screenIds: ['c'] };
  const before = JSON.stringify([named, fallback, screens]);
  const result = withDefaultFlows([named, fallback], [group], screens);
  assert.equal(result[0], named);
  assert.deepEqual(plain(result[1].screenIds), ['c', 'd']);
  assert.equal(result[1].metadata, fallback.metadata);
  assert.equal(JSON.stringify([named, fallback, screens]), before);
  const generated = withDefaultFlows([named], [group], screens);
  assert.deepEqual(plain(generated[1].screenIds), ['c', 'd']);
});

test('every seeded canonical screen is exposed through a Flow without cloning Screen data', () => {
  const app = modules();
  const { withDefaultFlows, screensForFlow } = app.load('@/lib/flow-context');
  const { screens, flows, screenGroups } = app.load('@/data/design-library');
  const result = withDefaultFlows(flows, screenGroups, screens);
  const shown = new Set(result.flatMap(f => screensForFlow(f, screens).map(s => s.id)));
  assert.equal(screens.every(s => shown.has(s.id)), true);
  flows.forEach((flow, index) => assert.equal(result[index], flow));
  for (const prefix of ['pharmacy.product-search', 'pharmacy.my-orders']) {
    assert.ok(result.some(f => f.parentGroupId?.startsWith(prefix) && f.name === 'Luồng default'));
  }
});


test('legacy auth moves only Tree ownership, preserving Flow counts, IDs, order and every Screen reference', () => {
  const app = modules();
  const { withDefaultFlows, activeTreeGroups, flowOwnerGroupId, screensForFlow } = app.load('@/lib/flow-context');
  const { screens, flows, screenGroups } = app.load('@/data/design-library');
  const legacy = flows.find(f => f.id === 'pharmacy.authentication');
  const orphan = { ...screens.find(s => s.screenGroupId === 'pharmacy.registration-login.login'), id: 'home.orphan', preview: 'data:image/png;base64,fixture', states: [{ id: 'state' }], variants: [{ id: 'variant' }], annotations: [{ id: 'note' }], versionHistory: { mobile: [{ id: 'version' }] }, unknown: { keep: true } };
  for (const inventory of [[], screens, [...screens, orphan]]) {
    const before = JSON.stringify([flows, screenGroups, inventory]);
    const projected = withDefaultFlows(flows, screenGroups, inventory);
    const moved = projected.filter(f => (f.parentGroupId ?? f.screenGroupId) === 'pharmacy.app-entry');
    moved.forEach(f => assert.equal(flowOwnerGroupId(f), 'pharmacy.registration-login.login'));
    assert.equal(projected.find(f => f.id === legacy.id), legacy);
    assert.deepEqual(plain(projected.find(f => f.id === legacy.id).screenIds), plain(legacy.screenIds));
    const active = activeTreeGroups(screenGroups, projected);
    assert.equal(active.some(g => g.id === 'pharmacy.app-entry'), false);
    assert.ok(active.some(g => g.id === flowOwnerGroupId(legacy)));
    const reachable = new Set(projected.flatMap(f => screensForFlow(f, inventory).map(s => s.id)));
    assert.equal(reachable.size, inventory.length);
    assert.equal(new Set(inventory.map(s => s.id)).size, inventory.length);
    assert.equal(JSON.stringify([flows, screenGroups, inventory]), before);
    for (const f of flows.filter(f => f.id !== legacy.id && f.id !== 'pharmacy.registration-login.login.default-flow')) assert.equal(projected.find(item => item.id === f.id), f);
    assert.deepEqual(plain(withDefaultFlows(projected, screenGroups, inventory)), plain(projected));
  }
});


test('login consolidation keeps legacy ID/order and aliases the former default without mutating inputs', () => {
  const app = modules();
  const { consolidateLoginFlow, resolveFlowId, resolveFlowSlug, screensForFlow, activeTreeGroups } = app.load('@/lib/flow-context');
  const { flows, screens, screenGroups } = app.load('@/data/design-library');
  const original = flows.find(f => f.id === 'pharmacy.authentication');
  const defaultId = 'pharmacy.registration-login.login.default-flow';
  for (const extra of [[], [original.screenIds[2], 'home.extra', 'home.future']]) {
    const fixture = flows.map(f => f.id === defaultId ? { ...f, screenIds: extra, customDefaultMetadata: 'keep' } : f);
    const before = JSON.stringify([fixture, screens]);
    const result = consolidateLoginFlow(fixture, screens);
    const merged = result.find(f => f.id === original.id);
    assert.equal(merged.name, 'Luồng default');
    assert.equal(merged.parentGroupId, 'pharmacy.registration-login.login');
    assert.deepEqual(plain(merged.screenIds), [...new Set([...original.screenIds, ...extra])]);
    assert.equal(merged.customDefaultMetadata, 'keep');
    assert.equal(merged.description, original.description);
    assert.equal(result.some(f => f.id === defaultId || f.name === 'Đăng nhập Nhà thuốc'), false);
    assert.equal(result.length, fixture.length - 1);
    assert.equal(resolveFlowId(defaultId, result), original.id);
    assert.equal(resolveFlowSlug('login-default-flow', result), merged);
    assert.equal(resolveFlowSlug(original.slug, result), merged);
    assert.equal(activeTreeGroups(screenGroups, result).some(g => g.id === defaultId), false);
    assert.equal(new Set(screensForFlow(merged, screens).map(s => s.id)).size, original.screenIds.length);
    fixture.filter(f => ![original.id, defaultId].includes(f.id)).forEach(f => assert.equal(result.find(item => item.id === f.id), f));
    assert.equal(JSON.stringify([fixture, screens]), before);
    assert.deepEqual(plain(consolidateLoginFlow(result, screens)), plain(result));
    const search = app.load('@/lib/screen-search').searchScreenInventory('LC Login', screens, result, screenGroups);
    assert.ok(search.length > 0);
    assert.ok(search.filter(r => r.kind === 'screen').every(r => r.context.includes('Đăng nhập › Luồng default')));
  }
});


test('Gallery scope and Flow leaf resolution share canonical IDs without duplicate steps', () => {
  const app = modules();
  const { screensInGroup, screensForFlow } = app.load('@/lib/flow-context');
  const group = { id: 'unit.group', businessUnitId: 'unit' };
  const screen = { id: 'same-screen', businessUnitId: 'unit', screenGroupId: 'legacy.group' };
  const flow = { id: 'flow', businessUnitId: 'unit', parentGroupId: group.id, screenIds: [screen.id, screen.id, 'future.home.screen'] };
  assert.deepEqual(plain(screensForFlow(flow, [screen]).map(s => s.id)), [screen.id]);
  assert.deepEqual(plain(screensInGroup(group, [flow], [screen]).map(s => s.id)), [screen.id]);
  assert.equal(screensInGroup(group, [flow], [screen])[0], screen);
  assert.deepEqual(plain(flow.screenIds), [screen.id, screen.id, 'future.home.screen']);
  assert.deepEqual(plain(screensInGroup(group, [], [])), []);
});
