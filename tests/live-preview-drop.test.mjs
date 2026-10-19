import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { test } from 'node:test';

const source = readFileSync(new URL('../src/components/manage/add-screen-form.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('form.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const pane = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'PreviewPane');
const form = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'AddScreenForm');
function declaration(name, statements) {
  return statements.find(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(item => item.name.getText(ast) === name)).getText(ast);
}
const jsx = (type, props) => ({ type, props });
function nodes(tree) {
  return Array.isArray(tree) ? tree.flatMap(nodes) : tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [];
}
function setup(preview) {
  let draft = { name: '', status: 'active', mobile: true, mobilePlatform: 'iOS' }, error = '';
  const reads = [];
  const context = {
    get draft() { return draft; }, exports: {}, require: () => ({ jsx, jsxs: jsx }),
    useBusinessUnitInventory: () => [], useScreenGroupInventory: () => [], useState: value => [value, () => {}],
    ImagePlus: 'ImagePlus', ScreenPreview: 'ScreenPreview',
    FileReader: class { readAsDataURL(file) { reads.push(file); this.result = 'data:' + file.type + ';base64,fixture'; this.onload(); } },
    Image: class { naturalWidth = 390; naturalHeight = 844; set src(value) { this.onload(); } },
    setFileError: value => { error = value; }, setDraft: update => { draft = update(draft); },
    setDirty: () => {}, setSaved: () => {}, detectPlatformFromImageDimensions: () => ({ platform: 'mobile', width: 390, height: 844 }),
    screenNameFromFileName: name => name, activePlatform: 'mobile', preview, annotations: [],
  };
  const assetExports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/adapters/local/assets.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: assetExports, FileReader: context.FileReader });
  context.repositories = { assets: assetExports.localAssets };
  const code = [declaration('acceptedTypes', ast.statements), declaration('processImage', form.body.statements), declaration('readImage', form.body.statements), pane.getText(ast), 'exports.PreviewPane = PreviewPane; exports.readImage = readImage;'].join('\n');
  vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, context);
  const tree = context.exports.PreviewPane({ draft, preview, inputRef: { current: null }, onFile: context.exports.readImage, fileError: '', onFileError: context.setFileError });
  const drop = nodes(tree).find(node => node.props?.onDrop);
  const picker = nodes(tree).find(node => node.type === 'input' && node.props.type === 'file');
  return { drop, picker, reads, draft: () => draft, error: () => error };
}
function dropFiles(app, files) {
  let prevented = false, stopped = false;
  app.drop.props.onDrop({ dataTransfer: { files }, preventDefault() { prevented = true; }, stopPropagation() { stopped = true; } });
  assert.ok(prevented && stopped);
}

for (const [extension, type] of [['png', 'image/png'], ['jpg', 'image/jpeg'], ['jpeg', 'image/jpeg'], ['webp', 'image/webp']]) {
  test(`empty preview accepts ${extension} through the same processing path as the picker`, () => {
    const file = { name: 'test.' + extension, type, size: 100 };
    const dropped = setup(), picked = setup();
    assert.ok(dropped.drop, 'drop target must render before an image exists');
    dropFiles(dropped, [file]);
    picked.picker.props.onChange({ target: { files: [file], value: 'test' } });
    assert.deepEqual(dropped.reads, [file]);
    assert.equal(dropped.draft().mobilePreview, 'data:' + type + ';base64,fixture');
    assert.equal(JSON.stringify(dropped.draft()), JSON.stringify(picked.draft()));
    assert.equal(dropped.error(), '');
  });
}
test('invalid, oversized and multiple drops leave the draft intact and explain the rejection', () => {
  for (const files of [[{ type: 'text/plain', size: 5 }], [{ type: 'image/png', size: 3 * 1024 * 1024 }], [{ type: 'image/png' }, { type: 'image/png' }], []]) {
    const app = setup(); const before = JSON.stringify(app.draft());
    dropFiles(app, files);
    assert.equal(JSON.stringify(app.draft()), before);
    assert.equal(app.reads.length, 0);
    assert.ok(app.error());
  }
});
test('existing preview retains the same shared drop target', () => {
  const app = setup('data:image/png;base64,old');
  dropFiles(app, [{ name: 'replacement.png', type: 'image/png', size: 100 }]);
  assert.equal(app.reads.length, 1);
});
