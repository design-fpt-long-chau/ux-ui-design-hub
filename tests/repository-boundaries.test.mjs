import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import path from 'node:path';
function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? sourceFiles(path.join(dir, entry.name)) : /\.tsx?$/.test(entry.name) ? [path.join(dir, entry.name)] : []);
}
test('UI consumes repository boundaries without storage or concrete Local adapter imports', () => {
  for (const file of sourceFiles('src/components')) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /\b(?:localStorage|indexedDB|FileReader)\s*[.(]|@\/lib\/(?:adapters\/local|local-inventory)/, file);
  }
});
test('contracts do not depend on Local implementation, browser storage, or React', () => {
  const source = readFileSync('src/lib/repositories/contracts.ts', 'utf8');
  assert.doesNotMatch(source, /from ["'](?:react|.*adapters\/local)|\b(?:localStorage|indexedDB)\b/);
  for (const name of ['ScreenRepository', 'FlowRepository', 'GroupRepository', 'AssetRepository', 'IdentityProvider']) assert.match(source, new RegExp('export interface ' + name + '\\b'));
});
