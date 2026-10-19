import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';

const groups = [1, 2, 3].map((level) => ({ id: `pharmacy.level-${level}`, businessUnitId: 'pharmacy', slug: `level-${level}`, name: `Level ${level}`, sequence: level, parentGroupId: level > 1 ? `pharmacy.level-${level - 1}` : null }));
const screen = { id: 'screen', name: 'Legacy screen', slug: 'legacy', businessUnitId: 'pharmacy', screenGroupId: groups[2].id, sequence: 1 };
function harness(creating = false) {
  let uploads = 0;
  let stateIndex = 0;
  const cache = new Map();
  const jsx = (type, props) => ({ type, props });
  function load(name) {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === 'react') return { useState: (value) => [creating && [0, 4].includes(stateIndex++) ? true : value, () => {}], useRef: () => ({ current: { click: () => uploads++ } }), useEffect: () => {}, useLayoutEffect: () => {}, useMemo: (fn) => fn(), useId: () => 'fixture' };
    if (name === '@/lib/repositories/provider') return { repositories: { assets: { importFile: () => {} } } };
    if (name === '@/lib/use-identity') return { useIdentity: () => ({ id: 'qa', displayName: 'QA' }) };
    if (name === '@/lib/use-business-units') return { useBusinessUnitInventory: () => load('@/data/design-library').businessUnits };
    if (name === '@/components/layout/sidebar-layout') return { SidebarLayout: 'SidebarLayout' };
    if (name === '@/lib/business-units') return { getBusinessUnits: () => load('@/data/design-library').businessUnits };
    if (name === '@/components/tree/tree-product-name') return { TreeProductName: 'TreeProductName' };
    if (name === 'react-dom') return { createPortal: (node) => node };
    if (name === 'next/link') return { default: 'a' };
    if (name === 'next/navigation') return { usePathname: () => '/screens/pharmacy/level-3/legacy', useRouter: () => ({ push: () => {} }) };
    if (name === '@/lib/design-library') return { screenHref: screen => '/screens/pharmacy/level-3/' + screen.slug };
    if (name === '@/lib/screen-platform') return { resolveScreenPlatform: screen => screen, screenPlatformHref: screen => `/screens/${screen.id}` };
    if (name === 'lucide-react') return new Proxy({}, { get: (_, key) => key });
    if (name === '@/data/design-library') return { businessUnits: [{ id: 'pharmacy', slug: 'pharmacy', name: 'Pharmacy' }], pharmacyNavigationGroupIds: groups.map(group => group.id) };
    if (name === '@/lib/repositories/client') return { useScreenInventory: () => [screen], useScreenGroupInventory: () => groups, useFlowInventory: () => load('@/lib/flow-context').withDefaultFlows([], groups, [screen]), useCustomNoteTypes: () => [], createLocalFlow: () => {}, createCustomNoteType: name => ({ id: 'custom.fixture', name: name.trim() }) };
    if (name.includes('app-sidebar')) return { Brand: 'Brand' };
    if (name.includes('screen-card')) return { ScreenCard: 'ScreenCard' };
    if (name === './screen-preview' || name === '@/components/screens/screen-preview') return { ScreenPreview: 'ScreenPreview' };
    if (name === './contextual-annotations') return { ContextualAnnotations: 'Annotations' };
    if (cache.has(name)) return cache.get(name);
    const base = name.replace('@/', 'src/');
    const extension = existsSync(base + '.ts') ? '.ts' : '.tsx';
    const code = ts.transpileModule(readFileSync(base + extension, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports = {};
    vm.runInNewContext(code, { exports, require: load, document: { body: {} }, URLSearchParams });
    cache.set(name, exports);
    return exports;
  }
  return { load, uploads: () => uploads };
}
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children)];
}

test('Tree keeps every group structural and exposes canonical leaves through shared Flow rows', () => {
  const app = harness();
  const tree = app.load('@/components/tree/library-tree').LibraryTree({});
  const sortableNodes = nodes(tree).filter(n => n.type === app.load('@/components/tree/sortable-flow-list').SortableFlowList).flatMap(n => n.props.flows.flatMap(flow => nodes([n.props.renderRow(flow, { dragging: false }), n.props.renderChildren(flow)])));
  const flowNodes = [...nodes(tree), ...sortableNodes].filter(n => n.type === app.load('@/components/tree/tree-flow-name').TreeFlowName).flatMap(n => nodes(n.type(n.props)));
  const groupNodes = nodes(tree).filter(n => n.type === app.load('@/components/tree/tree-group-name').TreeGroupName).flatMap(n => nodes(n.type(n.props)));
  const links = [...nodes(tree), ...sortableNodes, ...flowNodes, ...groupNodes].filter(n => n.props.href);
  for (const group of groups) {
    assert.equal(links.some(n => n.props.href === `/screens/pharmacy/${group.slug}`), false);
    const toggle = groupNodes.find(n => n.type === 'button' && n.props['aria-label'] === `Thu gọn ${group.name}`);
    assert.equal(toggle.props['aria-expanded'], true);
  }
  assert.ok(links.some(n => n.props.href === "/flows/default-pharmacy.level-3"));
  assert.equal(links.filter(n => n.props.href === '/screens/pharmacy/level-3/legacy').length, 1);
  assert.equal(flowNodes.filter(n => n.type === 'GitBranch').length, 1);
  assert.equal(nodes(tree).filter(n => n.type === 'Plus').length, 5); // Group/Flow CTAs plus global product creation.
  const leaf = links.find(n => n.props.href === '/screens/pharmacy/level-3/legacy');
  assert.equal(nodes(leaf).some(n => n.type === 'ChevronRight'), false);
  assert.equal(nodes(tree).filter(n => n.props.className?.includes('tree-children')).every(n => n.props.className.includes('ml-3.5')), true);
  const gallery = app.load('@/components/screens/inventory-pages').ScreenGroupGallery;
  for (const group of groups) {
    const rendered = nodes(gallery({ unitSlug: 'pharmacy', groupSlug: group.slug }));
    assert.ok(rendered.some(n => n.type === 'h1' && n.props.children === group.name));
    assert.equal(rendered.filter(n => n.type === 'ScreenCard').length, group === groups[2] ? 1 : 0);
  }
});

test('Full Flow renders contextual sections with global numbering and no inter-section connectors', () => {
  const app = harness();
  const component = app.load('@/components/flow/checkout-flow').CheckoutFlow;
  const screens = [groups[0], groups[1], groups[1], groups[2], groups[1]].map((group, index) => ({ ...screen, id: `screen-${index}`, screenGroupId: group.id }));
  const rendered = nodes(component({ selected: screens[0], platform: 'mobile', screens, flowName: 'Fixture' }));
  assert.equal(rendered.filter(n => n.type === 'ScreenPreview').length, 5);
  assert.equal(rendered.filter(n => n.type === 'section').length, 4);
  assert.equal(rendered.filter(n => n.type === 'ArrowRight').length, 1);
  assert.deepEqual(rendered.filter(n => n.type === 'p' && /^0[1-5]$/.test(n.props.children)).map(n => n.props.children), ['01', '02', '03', '04', '05']);
  const flat = nodes(component({ selected: screens[0], platform: 'mobile', screens: screens.map(s => ({ ...s, screenGroupId: groups[0].id })), flowName: 'Flat' }));
  assert.equal(flat.filter(n => n.type === 'section').length, 0);
  assert.equal(flat.filter(n => n.type === 'ArrowRight').length, 4);
});

test('Bottom creation creates top-level groups without a conflicting parent selector', () => {
  const app = harness(true);
  const component = app.load('@/components/manage/screen-group-combobox').ScreenGroupCombobox;
  const rendered = nodes(component({ businessUnitId: 'pharmacy', groups, value: '', onChange: () => {} }));
  const options = rendered.filter(n => n.type === 'option');
  assert.equal(options.length, 0);
});

test('Annotation subtree has no upload click or keyboard ancestor; explicit upload still opens input', () => {
  const app = harness();
  const editor = app.load('@/components/screens/existing-screen-preview-editor').ExistingScreenPreviewEditor;
  for (const preview of [null, 'legacy-preview.png']) {
    const rendered = editor({ screen, platform: 'mobile', preview, annotations: [] });
    function inspect(node, ancestors = []) {
      if (Array.isArray(node)) return node.forEach(n => inspect(n, ancestors));
      if (!node || typeof node !== 'object') return;
      if (node.type === 'Annotations') {
        assert.ok(ancestors.every(n => !n.props.onClick && !n.props.onKeyDown));
        assert.ok(ancestors.every(n => n.type !== 'button'));
      }
      inspect(node.props.children, [...ancestors, node]);
    }
    inspect(rendered);
    if (!preview) {
      const button = nodes(rendered).find(n => n.props['aria-label'] === 'Add preview image');
      assert.equal(button.type, 'button');
      button.props.onClick();
      assert.equal(app.uploads(), 1);
    }
  }
});
