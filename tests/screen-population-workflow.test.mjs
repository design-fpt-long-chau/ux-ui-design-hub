import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';

const publishedKey = 'lc-library.phase1.published-screens';
const draftKey = 'lc-library.phase1.add-screen-draft';

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

test('logical group CTA context overrides only location and preserves the rest of a legacy draft', () => {
  const app = runtime();
  const { screenGroups } = app.load('@/data/design-library');
  const { flows } = app.load('@/data/design-library');
  const { addScreenHref, applyAddScreenContext, screenNameFromFileName } = app.load('@/lib/add-screen-context');
  const group = screenGroups.find(item => item.id === 'pharmacy.registration-login.registration.default-flow');
  assert.ok(group);

  const legacyDraft = {
    businessUnitId: 'vaccination', screenGroupId: 'vaccination.booking', name: 'Keep my draft name',
    mobile: true, web: false, mobilePlatform: 'iOS', description: 'Keep description', whenItAppears: '',
    purpose: '', uploadedBy: 'Mai', status: 'active', legacyUnknown: { keep: true }, currentStep: 'review',
  };
  const contextual = applyAddScreenContext(legacyDraft, {
    businessUnitId: 'pharmacy', screenGroupId: group.id,
  }, screenGroups);

  assert.equal(contextual.businessUnitId, 'pharmacy');
  assert.equal(contextual.screenGroupId, group.id);
  assert.equal(contextual.name, legacyDraft.name);
  assert.deepEqual(contextual.legacyUnknown, { keep: true });
  assert.equal(contextual.currentStep, 'information');
  assert.equal(addScreenHref({ businessUnitId: 'pharmacy', screenGroupId: group.id }),
    '/manage/screens/new?businessUnitId=pharmacy&screenGroupId=pharmacy.registration-login.registration.default-flow');
  assert.equal(screenNameFromFileName('04_login-phone_default.PNG'), 'Login phone default');
  assert.equal(screenNameFromFileName('screen.webp'), 'Screen');

  const flow = flows.find(item => item.id === 'pharmacy.registration-login.registration.default-flow');
  const fromFlow = applyAddScreenContext(legacyDraft, {
    businessUnitId: 'pharmacy', screenGroupId: 'pharmacy.registration-login.registration', flowId: flow.id,
  }, screenGroups, flows);
  assert.equal(fromFlow.screenGroupId, 'pharmacy.registration-login.registration');
  assert.equal(fromFlow.flowMode, 'existing');
  assert.equal(fromFlow.flowId, flow.id);
  assert.equal(fromFlow.insertAfterScreenId, null);
});

test('fixture publication synchronizes inventory and shared preview resolution without changing schema keys', () => {
  const storage = new Map([[draftKey, JSON.stringify({ name: 'fixture draft' })]]);
  const app = runtime(storage);
  const inventory = app.load('@/lib/local-inventory');
  const { resolveAvailableScreenPlatform, resolveScreenPreview } = app.load('@/lib/screen-platform');
  const preview = 'data:image/png;base64,c2NyZWVuLXByZXZpZXc=';
  const screen = {
    id: 'pharmacy.registration-login.registration.default-flow.fixture', slug: 'fixture', sequence: 1,
    name: 'Fixture only', businessUnitId: 'pharmacy',
    screenGroupId: 'pharmacy.registration-login.registration.default-flow', status: 'active',
    platforms: ['iOS'], preview, description: 'Fixture', whenItAppears: 'Fixture', purpose: 'Fixture',
    previewTone: 'blue', currentVersion: 'v1.0', jiraTicket: '', relatedTickets: [], versions: [],
    components: [], variants: [], states: [], annotations: [],
    evidence: { status: 'Unverified', lastVerified: '', source: '', verifiedBy: '', notes: '' },
    representations: { mobile: { status: 'active', preview, variants: [], states: [], annotations: [] } },
  };

  inventory.publishLocalScreen(screen);
  const published = inventory.useScreenInventory().find(item => item.id === screen.id);
  assert.ok(published);
  assert.equal(published.screenGroupId, screen.screenGroupId);
  assert.equal(resolveScreenPreview(published, 'mobile'), preview);
  assert.equal(storage.has(draftKey), false);
  assert.deepEqual([...storage.keys()], [publishedKey]);
  assert.deepEqual(app.writes, [['set', publishedKey], ['remove', draftKey]]);
  assert.equal(resolveAvailableScreenPlatform({ platforms: ['Web'] }, 'mobile'), 'web');
  assert.equal(resolveAvailableScreenPlatform({ platforms: ['iOS'] }, 'web'), 'mobile');
  assert.equal(resolveAvailableScreenPlatform({ platforms: ['iOS', 'Web'] }, 'mobile'), 'mobile');
  assert.equal(resolveAvailableScreenPlatform({ platforms: ['iOS', 'Web'] }, 'web'), 'web');
});

test('gallery and Add Screen retain click/drop upload and same-group continuation wiring', () => {
  const gallery = readFileSync(path.join(import.meta.dirname, '..', 'src/components/screens/inventory-pages.tsx'), 'utf8');
  const form = readFileSync(path.join(import.meta.dirname, '..', 'src/components/manage/add-screen-form.tsx'), 'utf8');
  assert.match(gallery, /No screens in this group yet\./);
  assert.match(gallery, /\+ Add screen/);
  assert.match(gallery, /addScreenHref\(\{ businessUnitId: unit\.id, screenGroupId: group\.id \}\)/);
  assert.match(form, /onDrop=\{replaceFromDrop\}/);
  assert.match(form, /inputRef\.current\?\.click\(\)/);
  assert.match(form, /accept="\.png,\.jpg,\.jpeg,\.webp,image\/png,image\/jpeg,image\/webp"/);
  assert.match(form, /Add another screen to this group/);
});


test('legacy previewless options remain editable without relaxing new representation validation', () => {
  const app = runtime();
  const { representationDrafts, previewOptionalIds, representationValid, originalOptions } = app.load('@/lib/edit-representations');
  const screen = { variants: [{ id: 'legacy.default', name: 'Default', isDefault: true, legacy: 'keep' }], states: [{ id: 'legacy.state', name: 'Default', previewTone: 'blue', unknown: { keep: true } }] };
  const before = JSON.stringify(screen);
  const drafts = representationDrafts(screen, 'mobile');
  assert.equal(drafts[0].stateType, 'Other / Custom');
  assert.equal(representationValid(drafts[0], previewOptionalIds(screen, 'mobile')), true);
  assert.equal(representationValid({ ...drafts[0], id: 'new.state' }, previewOptionalIds(screen, 'mobile')), false);
  assert.equal(representationValid({ ...drafts[0], name: '' }, previewOptionalIds(screen, 'mobile')), false);
  assert.equal(originalOptions(screen, 'mobile').states[0].unknown.keep, true);
  assert.equal(originalOptions(screen, 'mobile').variants[0].id, 'legacy.default');
  assert.equal(JSON.stringify(screen), before);
});
