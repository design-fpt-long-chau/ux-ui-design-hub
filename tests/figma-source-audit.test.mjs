import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, context) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(file, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX}}).outputText, {exports, URL, URLSearchParams, Date, ...context});
  return exports;
}

test('source selection cannot accept a stale candidate after changing the URL', () => {
  let cursor=0; const slots=[]; const effects=[]; let applied=0;
  const url='https://figma.com/design/abc/Frame?node-id=1-2';
  const frame={name:'Frame',url,preview:'data:image/png;base64,AA==',source:{url,lastCheckedAt:'2026-10-12'}};
  const jsx=(type,props)=>({type,props});
  const {FigmaSourceField}=load('src/components/manage/figma-source-field.tsx',{require:name=>{
    if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};
    if(name==='react')return {useEffect:fn=>effects.push(fn),useRef:value=>slots[cursor++]??={current:value},useState:value=>{const i=cursor++;if(!(i in slots))slots[i]=value;return [slots[i],v=>slots[i]=v];}};
    return {};
  }});
  let nodes=[];const render=()=>{cursor=0;nodes=[];const visit=n=>{if(Array.isArray(n))n.forEach(visit);else if(n&&typeof n==='object'){nodes.push(n);visit(n.props?.children);}};visit(FigmaSourceField({source:{url},hasPreview:false,onUse:()=>applied++}));};
  render(); slots[1]=frame; slots[4]=true; render();
  let use=nodes.find(n=>n.type==='button'&&n.props.children==='Use this frame');
  assert.equal(use.props.disabled,false);use.props.onClick();assert.equal(applied,1);
  nodes.find(n=>n.type==='input').props.onChange({target:{value:'https://figma.com/design/abc/Other?node-id=9-9'}});
  render();use=nodes.find(n=>n.type==='button'&&n.props.children==='Use this frame');
  assert.equal(use.props.disabled,true);use.props.onClick();assert.equal(applied,1);
});

test('source and preview calls respect shared Retry-After and recover without API spam', async () => {
  let now=1000,calls=0;
  class Clock extends Date {static now(){return now;}}
  const {localFigmaIntegration:a}=load('src/lib/adapters/local/figma.ts',{Date:Clock,require:()=>({}),fetch:async()=>{
    calls++;return calls===1?new Response(JSON.stringify({retryAfterMs:10000}),{status:429}):new Response(JSON.stringify({name:'Frame',fingerprint:'r1'}));
  }});
  const input={fileKey:'abc',nodeId:'1:2',url:'https://figma.com/design/abc/Frame?node-id=1-2'};
  await assert.rejects(a.resolveFrame(input),e=>e.code==='rate_limited'&&e.retryAt===11000);
  await assert.rejects(a.resolveFrame({...input,nodeId:'3:4'}),e=>e.code==='rate_limited');
  await assert.rejects(a.getPreview({...input,fingerprint:'r1'}),e=>e.code==='rate_limited');
  assert.equal(calls,1);
  now=11001;assert.equal((await a.resolveFrame(input)).name,'Frame');assert.equal(calls,2);
});

test('source resolution backs off exponentially when Retry-After is absent', async () => {
  let now=0,calls=0;
  class Clock extends Date {static now(){return now;}}
  const {localFigmaIntegration:a}=load('src/lib/adapters/local/figma.ts',{Date:Clock,require:()=>({}),fetch:async()=>{calls++;return new Response('{}',{status:429});}});
  const input={fileKey:'abc',nodeId:'1:2',url:'https://figma.com/design/abc/Frame?node-id=1-2'};
  await assert.rejects(a.resolveFrame(input),e=>e.retryAt===5000);
  now=5000;await assert.rejects(a.resolveFrame(input),e=>e.retryAt===15000);
  now=10000;await assert.rejects(a.resolveFrame(input),e=>e.retryAt===15000);
  assert.equal(calls,2);
});
