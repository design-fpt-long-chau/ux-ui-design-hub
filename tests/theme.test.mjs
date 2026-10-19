import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { test } from 'node:test';
const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/theme.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,{exports});
for (const saved of [null, 'light', 'dark', 'system', 'unknown']) for (const systemDark of [false,true]) test('pre-paint theme: '+saved+' / OS dark='+systemDark,()=>{
  const dataset = {}, reads=[];
  vm.runInNewContext(exports.themeBootstrap,{document:{documentElement:{dataset}},localStorage:{getItem:key=>{reads.push(key);return saved;}},matchMedia:()=>({matches:systemDark})});
  assert.equal(dataset.theme,exports.resolvedTheme(exports.validTheme(saved),systemDark));
  assert.equal(dataset.themeMode,exports.validTheme(saved));
  assert.deepEqual(reads,[exports.THEME_KEY]);
});
test('blocked preference storage follows System without affecting Library data',()=>{
  const dataset={};vm.runInNewContext(exports.themeBootstrap,{document:{documentElement:{dataset}},localStorage:{getItem:()=>{throw new Error('blocked');}},matchMedia:()=>({matches:true})});
  assert.equal(dataset.theme,'dark');assert.equal(dataset.themeMode,'system');
});
test('dark foreground tokens meet WCAG AA on Library surfaces',()=>{
  const css=readFileSync('src/app/theme.css','utf8');
  const color=name=>css.match(new RegExp('--'+name+': (#[0-9a-f]+);'))[1];
  const luminance=hex=>hex.slice(1).match(/../g).map(c=>parseInt(c,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0);
  for(const fg of ['text-primary','text-secondary','text-muted','accent-text','danger-text','success-text','warning-text'])for(const bg of ['surface','surface-muted','surface-hover']){const a=luminance(color(fg)),b=luminance(color(bg));assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,fg+' on '+bg);}
});


test('semantic foregrounds meet AA in both theme palettes, including disabled controls', () => {
 const css=readFileSync('src/app/theme.css','utf8');
 const luminance=hex=>hex.slice(1).match(/../g).map(c=>parseInt(c,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0);
 const ratio=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
 for(const mode of ['light','dark']) {
  const selector=mode==='dark'?':root[data-theme="dark"]':':root:not([data-theme="dark"])';
  const palette={};
  for(const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) if(match[1].trim().endsWith(selector)) for(const token of match[2].matchAll(/--([\w-]+): (#[0-9a-f]+);/g)) palette[token[1]]=token[2];
  for(const tone of ['accent','success','warning','danger']) {
   for(const bg of [tone+'-surface','surface','surface-muted']) assert.ok(ratio(palette[tone+'-text'],palette[bg])>=4.5,mode+' '+tone+' on '+bg);
  }
  for(const bg of ['surface','surface-muted','surface-hover']) for(const fg of ['text-primary','text-secondary','text-muted']) assert.ok(ratio(palette[fg],palette[bg])>=4.5,mode+' '+fg+' on '+bg);
  assert.ok(ratio(palette['disabled-text'],palette['disabled-surface'])>=4.5,mode+' disabled');
 }
});
