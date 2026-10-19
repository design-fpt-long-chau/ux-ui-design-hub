import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { test } from 'node:test';

// Exercise component handlers with isolated hooks and an in-memory inventory.
function setup() {
  const groups = [1, 2, 3].map(level => ({ id: `pharmacy.${level}`, businessUnitId: 'pharmacy', slug: `g${level}`, name: `Group ${level}`, sequence: level, parentGroupId: level > 1 ? `pharmacy.${level - 1}` : null }));
  let selected;
  let current;
  let cursor;
  const cache = new Map();
  const state = new Map();
  const jsx = (type, props) => ({ type, props });
  function load(name) {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === 'react') return {
      useState: initial => { const index = cursor++; if (!(index in current)) current[index] = initial; const owner = current; return [owner[index], value => { owner[index] = typeof value === 'function' ? value(owner[index]) : value; }]; },
      useRef: initial => { const index = cursor++; return current[index] ??= { current: initial }; },
      useMemo: fn => fn(), useId: () => 'test', useEffect: () => {}, useLayoutEffect: () => {},
    };
    if (name === 'react-dom') return { createPortal: node => node };
    if (name === '@/components/manage/delete-group-dialog') return { DeleteGroupDialog: () => null };
    if (name === 'lucide-react') return new Proxy({}, { get: (_, key) => key });
    if (name === '@/lib/repositories/client') return { useScreenInventory: () => [], createLocalScreenGroup: group => {
      if (groups.some(g => g.parentGroupId === group.parentGroupId && g.name.toLowerCase() === group.name.toLowerCase())) throw new Error('Duplicate sibling name');
      groups.push(group);
    } };
    if (cache.has(name)) return cache.get(name);
    const file = name.replace('@/', 'src/') + (name.endsWith('screen-groups') ? '.ts' : '.tsx');
    const exports = {};
    const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(code, { exports, require: load, document: { body: {} } });
    cache.set(name, exports); return exports;
  }
  const component = load('@/components/manage/screen-group-combobox').ScreenGroupCombobox;
  function render(type = component, props = { businessUnitId: 'pharmacy', groups, value: selected ?? '', onChange: id => { selected = id; } }) {
    if (!state.has(type)) state.set(type, []);
    current = state.get(type); cursor = 0; return type(props);
  }
  return { render, groups, selected: () => selected, unmountDraft: () => { for (const key of state.keys()) if (key !== component) state.delete(key); } };
}
function nodes(tree) { return Array.isArray(tree) ? tree.flatMap(nodes) : tree && typeof tree === 'object' && !tree.props?.inert ? [tree, ...nodes(tree.type?.name === 'FieldError' ? tree.type(tree.props) : tree.props?.children)] : []; }
const event = key => ({ key, preventDefault() {}, stopPropagation() {} });
function open(app, level = 1) {
  nodes(app.render()).find(n => n.props.role === 'combobox').props.onClick();
  nodes(app.render()).find(n => n.props['data-group-context'] === `pharmacy.${level}`).props.onFocus();
  return nodes(app.render()).find(n => n.type === 'button' && Array.isArray(n.props.children) && n.props.children.includes(' sub-group'));
}
function draft(app) {
  const child = nodes(app.render()).find(n => typeof n.type === 'function' && n.type.name === 'InlineSubgroup');
  return () => nodes(app.render(child.type, child.props));
}

test('Contextual draft saves once on Enter, assigns parent, and keeps picker open', () => {
  const app = setup(); open(app, 2).props.onClick();
  assert.equal(app.groups.length, 3);
  assert.equal(app.selected(), undefined);
  assert.equal(nodes(app.render()).find(n => n.props.role === 'combobox').props['aria-expanded'], true);
  const render = draft(app);
  let input = render().find(n => n.type === 'input');
  assert.equal(input.props.value, 'Untitled subgroup');
  let selectedText = false; input.props.onFocus({ currentTarget: { select: () => { selectedText = true; } } });
  assert.equal(selectedText, true);
  input.props.onChange({ target: { value: 'New child' } });
  input = render().find(n => n.type === 'input');
  input.props.onKeyDown(event('Enter')); input.props.onBlur?.();
  assert.equal(app.groups.length, 4);
  assert.equal(app.groups[3].parentGroupId, 'pharmacy.2');
  assert.equal(app.selected(), app.groups[3].id);
  assert.equal(nodes(app.render()).find(n => n.props.role === 'combobox').props['aria-expanded'], true);
  const cta = nodes(app.render()).find(n => n.type === 'button' && Array.isArray(n.props.children) && n.props.children.includes(' sub-group'));
  assert.ok(cta.props.children.includes('Group 2'));
});

test('Escape and blur never save; empty and duplicate names remain editable', () => {
  const app = setup(); open(app).props.onClick(); const render = draft(app);
  let input = render().find(n => n.type === 'input');
  input.props.onChange({ target: { value: '' } }); render().find(n => n.type === 'input').props.onKeyDown(event('Enter'));
  assert.equal(app.groups.length, 3);
  input = render().find(n => n.type === 'input'); input.props.onChange({ target: { value: 'Group 2' } });
  render().find(n => n.type === 'input').props.onKeyDown(event('Enter'));
  assert.ok(render().some(n => n.props.role === 'alert'));
  assert.equal(app.groups.length, 3);
  input = render().find(n => n.type === 'input'); render().find(n => n.type === 'div' && n.props.onKeyDown).props.onKeyDown(event('Escape')); input.props.onBlur?.();
  assert.equal(app.groups.length, 3);
  const other = setup(); open(other).props.onClick(); const next = draft(other);
  next().find(n => n.type === 'input').props.onChange({ target: { value: 'Blur child' } });
  next().find(n => n.type === 'input').props.onBlur?.();
  assert.equal(other.groups.length, 3);
});

test('Level three has no contextual create action', () => { assert.equal(open(setup(), 3), undefined); });

test('Repeated parent actions create siblings and hide on pointer leave', () => {
  const app = setup();
  for (const name of ['Login method', 'OTP']) {
    open(app).props.onClick();
    const render = draft(app);
    render().find(n => n.type === 'input').props.onChange({ target: { value: name } });
    render().find(n => n.type === 'input').props.onKeyDown(event('Enter'));
    app.unmountDraft();
  }
  assert.deepEqual(app.groups.slice(3).map(g => g.parentGroupId), ['pharmacy.1', 'pharmacy.1']);
  const parent = nodes(app.render()).find(n => n.props['data-group-context'] === 'pharmacy.1');
  parent.props.onBlur({ currentTarget: { contains: () => false }, relatedTarget: null });
  parent.props.onMouseEnter(); parent.props.onMouseLeave();
  assert.equal(nodes(app.render()).filter(n => n.type === 'button' && Array.isArray(n.props.children) && n.props.children.includes(' sub-group')).length, 0);
});

test('Keyboard focus overrides a different hovered parent; CTA is outside selectable option', () => {
  const app = setup(); open(app);
  const rows = nodes(app.render());
  rows.find(n => n.props['data-group-context'] === 'pharmacy.1').props.onMouseEnter();
  rows.find(n => n.props['data-group-context'] === 'pharmacy.2').props.onFocus();
  const tree = nodes(app.render());
  const actions = tree.filter(n => n.type === 'button' && Array.isArray(n.props.children) && n.props.children.includes(' sub-group'));
  assert.equal(actions.length, 1);
  assert.ok(actions[0].props.children.includes('Group 2'));
  for (const option of tree.filter(n => n.props.role === 'option')) assert.ok(!nodes(option).includes(actions[0]));
});

test('Explicit draft cancel matches Escape without saving or closing the picker', () => {
  const app = setup(); open(app).props.onClick(); const render = draft(app);
  const cancel = render().find(n => n.type === 'button' && n.props['aria-label']?.startsWith('Cancel subgroup'));
  assert.equal(cancel.props.type, 'button');
  cancel.props.onClick(event('click'));
  assert.equal(app.groups.length, 3);
  assert.equal(app.selected(), undefined);
  assert.equal(nodes(app.render()).find(n => n.props.role === 'combobox').props['aria-expanded'], true);
  assert.equal(nodes(app.render()).filter(n => typeof n.type === 'function' && n.type.name === 'InlineSubgroup').length, 0);
});
