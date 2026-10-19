import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { test } from 'node:test';

function runtime() {
  const cache = new Map(), state = [], effects = [];
  let cursor = 0, timer, delay, now = 10000, reduced = false;
  const jsx = (type, props) => ({ type, props });
  function load(name) {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === 'react') return { useState: value => { const i = cursor++; if (!(i in state)) state[i] = value; return [state[i], next => { state[i] = typeof next === 'function' ? next(state[i]) : next; }]; }, useRef: value => { const i = cursor++; return state[i] ??= { current: value }; }, useEffect: fn => effects.push(fn) };
    if (name === 'next/link') return { default: 'a' };
    if (name === 'lucide-react') return new Proxy({}, { get: (_, key) => key });
    if (name === '@/components/screens/screen-preview') return { ScreenPreview: 'Preview' };
    if (cache.has(name)) return cache.get(name);
    const base = name.replace('@/', 'src/'), file = base + (existsSync(base + '.ts') ? '.ts' : '.tsx');
    const exports = {}; cache.set(name, exports);
    vm.runInNewContext(ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, require: load, URLSearchParams, matchMedia: () => ({ matches: reduced, addEventListener() {}, removeEventListener() {} }), Date: { now: () => now }, setTimeout: (fn, ms) => { delay = ms; timer = fn; return 1; }, clearTimeout: () => { timer = undefined; } });
    return exports;
  }
  return { load, render(component, props) { cursor = 0; effects.length = 0; timer = undefined; const result = component(props); effects.forEach(fn => fn()); return result; }, tick() { now += delay; timer?.(); }, delay: () => delay, running: () => Boolean(timer), reduce(value) { reduced = value; } };
}
const nodes = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
test('sparse inventories loop real previews without inventing screens', () => {
  for (const count of [0, 1, 2, 3, 4]) {
    const app = runtime(), { HighlightCarousel } = app.load('@/components/home/business-unit-card');
    const items = Array.from({ length: count }, (_, i) => ({ id: String(i), name: `Screen ${i}`, href: `/screens/${i}`, preview: `real-${i}` }));
    const before = JSON.stringify(items);
    const props = { items, label: 'Fixture', comingSoon: false };
    app.render(HighlightCarousel, props);
    const tree = app.render(HighlightCarousel, props);
    assert.equal(app.running(), count > 1);
    const links = nodes(tree).filter(n => n.props.href);
    assert.equal(links.every(n => items.some(item => item.href === n.props.href)), true);
    assert.equal(new Set(links.map(n => n.props.href)).size, count);
    assert.equal(JSON.stringify(items), before);
  }
});
test('unit highlights use real previews, stable IDs, platform resolution and Tree order only', () => {
  const app = runtime(), seeds = app.load('@/data/design-library'), { businessUnitHighlights } = app.load('@/lib/business-unit-highlights');
  const sample = seeds.screens[0];
  const screens = [{ ...sample, id: 'real', preview: 'data:image/png;base64,fixture', states: [], variants: [], representations: undefined }, { ...sample, id: 'missing', preview: undefined, states: [], variants: [], representations: undefined }];
  const before = JSON.stringify(screens);
  const result = businessUnitHighlights(sample.businessUnitId, [...screens, screens[0]], seeds.screenGroups, seeds.flows);
  assert.deepEqual(JSON.parse(JSON.stringify(result.previews.map(item => item.id))), ['real', 'missing']);
  assert.equal(result.categories.length <= 4, true);
  assert.equal(result.categories.every(group => !group.parentGroupId), true);
  assert.equal(businessUnitHighlights('mother-baby', screens, seeds.screenGroups, seeds.flows).previews.length, 0);
  assert.equal(JSON.stringify(screens), before);
  const sparse = [screens[0], ...Array.from({ length: 5 }, (_, i) => ({ ...screens[1], id: `missing-${i}` }))];
  const filled = businessUnitHighlights(sample.businessUnitId, sparse, seeds.screenGroups, seeds.flows).previews;
  assert.equal(filled.length, 4);
  assert.equal(filled.filter(item => item.preview).length, 1);
  assert.equal(new Set(filled.map(item => item.id)).size, 4);
  const many = Array.from({ length: 6 }, (_, i) => ({ ...screens[0], id: `real-${i}`, sequence: i }));
  assert.deepEqual(JSON.parse(JSON.stringify(businessUnitHighlights(sample.businessUnitId, many, seeds.screenGroups, seeds.flows).previews.map(item => item.id))), ['real-0', 'real-1', 'real-2', 'real-3', 'real-4', 'real-5']);
});
test('independent carousel auto-advances, pauses, resumes, supports drag, and honors reduced motion', () => {
  const app = runtime(), { HighlightCarousel } = app.load('@/components/home/business-unit-card');
  const props = { label: 'Fixture', comingSoon: false, items: [0,1,2,3,4,5].map(i => ({ id: String(i), name: 'Screen ' + i, href: '/screens/' + i, preview: 'data:image/png;base64,fixture' })) };
  let tree = app.render(HighlightCarousel, props); tree = app.render(HighlightCarousel, props);
  assert.equal(app.running(), true); assert.equal(app.delay(), 3000); app.tick(); tree = app.render(HighlightCarousel, props);
  const track = () => nodes(tree).find(n => n.props.className === 'bu-card-track flex');
  assert.match(track().props.style.transform, /-160px/);
  const eventTarget = {}; track().props.onTransitionEnd({ target: eventTarget, currentTarget: eventTarget, propertyName: "transform" }); tree = app.render(HighlightCarousel, props);
  assert.match(track().props.style.transform, /-80px/);
  tree.props.onMouseEnter(); tree = app.render(HighlightCarousel, props); assert.equal(app.running(), false);
  tree.props.onMouseLeave(); tree = app.render(HighlightCarousel, props); assert.equal(app.running(), true);
  tree.props.onFocusCapture(); tree = app.render(HighlightCarousel, props); assert.equal(app.running(), false);
  tree.props.onBlurCapture({ currentTarget: { contains: () => false } }); tree = app.render(HighlightCarousel, props);
  let viewport = nodes(tree).find(n => n.props.className?.includes('bu-card-viewport'));
  viewport.props.onPointerDown({ button: 0, pointerId: 1, clientX: 200 });
  viewport.props.onPointerMove({ pointerId: 1, clientX: 100, currentTarget: { setPointerCapture() {} } });
  tree = app.render(HighlightCarousel, props);
  assert.match(track().props.style.transform, /-152px/);
  viewport.props.onPointerUp({ pointerId: 1, clientX: 100 }); tree = app.render(HighlightCarousel, props);
  assert.match(track().props.style.transform, /-160px/);
  track().props.onTransitionEnd({ target: eventTarget, currentTarget: eventTarget, propertyName: "transform" }); tree = app.render(HighlightCarousel, props);
  assert.equal(app.delay(), 4000);
  nodes(tree).find(n => n.props['aria-label'] === 'Next Fixture screen').props.onClick();
  tree = app.render(HighlightCarousel, props);
  track().props.onTransitionEnd({ target: eventTarget, currentTarget: eventTarget, propertyName: 'transform' });
  tree = app.render(HighlightCarousel, props);
  assert.equal(app.delay(), 4000);
  for (let step = 0; step < 8; step++) { app.tick(); tree = app.render(HighlightCarousel, props); track().props.onTransitionEnd({ target: eventTarget, currentTarget: eventTarget, propertyName: "transform" }); tree = app.render(HighlightCarousel, props); assert.match(track().props.style.transform, /-80px/); }
  app.reduce(true); app.render(HighlightCarousel, props); tree = app.render(HighlightCarousel, props); assert.equal(app.running(), false);
  assert.equal(nodes(tree).find(n => n.props.className?.includes("bu-card-viewport")).props.className.includes("overflow-x-auto"), true);
  app.render(HighlightCarousel, { ...props, items: [] }); assert.equal(app.running(), false);
});
