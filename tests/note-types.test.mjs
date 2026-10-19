import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';

function loadNoteTypes() {
  const code = ts.transpileModule(readFileSync('src/lib/note-types.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: () => ({}) });
  return exports;
}

test('note type validation preserves predefined types and rejects invalid custom names', () => {
  const { predefinedNoteTypes, validateNoteTypeName } = loadNoteTypes();
  assert.deepEqual(Array.from(predefinedNoteTypes, type => type.name), ['Interaction', 'Behavior', 'Validation', 'Component', 'Content', 'Navigation', 'Accessibility']);
  assert.equal(validateNoteTypeName('  ', predefinedNoteTypes), 'Type name is required.');
  assert.equal(validateNoteTypeName(' interaction ', predefinedNoteTypes), 'This type already exists.');
  assert.equal(validateNoteTypeName('x'.repeat(41), predefinedNoteTypes), 'Type name must be 40 characters or fewer.');
  assert.equal(validateNoteTypeName('Research', predefinedNoteTypes), undefined);
});

test('legacy annotation labels resolve to stable IDs without changing the record', () => {
  const { predefinedNoteTypes, resolveNoteTypeId } = loadNoteTypes();
  const legacy = { type: 'Interaction', title: 'Legacy note', unknownLegacyField: { keep: true } };
  const before = JSON.stringify(legacy);
  assert.equal(resolveNoteTypeId(legacy.type, undefined, predefinedNoteTypes), 'builtin.interaction');
  assert.equal(JSON.stringify(legacy), before);
  assert.equal(resolveNoteTypeId('Research', 'custom.existing', predefinedNoteTypes), 'custom.existing');
});
