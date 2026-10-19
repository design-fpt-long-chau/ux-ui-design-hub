import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(file,require=()=>({})){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require,URL,Date});return exports;}
const parsing=load('src/lib/figma-source.ts');
const errors=load('src/lib/figma-integration-errors.ts');
test('optional design source attaches metadata only, rejects invalid input, replaces and removes safely',async()=>{
 let cursor=0,calls=0,source,pending;let delayed=false;const cleanups=[];const slots=[];const draft={preview:'manual-png',history:['v1'],notes:['keep']};
 const jsx=(type,props)=>({type,props});
 const c=load('src/components/manage/figma-design-source-field.tsx',name=>{
  if(name==='react/jsx-runtime')return{jsx,jsxs:jsx};
  if(name==='react')return{useEffect(fn){cleanups.push(fn());},useRef(value){return slots[cursor++]??={current:value};},useState(value){const i=cursor++;if(!(i in slots))slots[i]=value;return[slots[i],v=>{slots[i]=v;}];}};
  if(name.endsWith('/figma-source'))return parsing;
  if(name.endsWith('/figma-integration-errors'))return errors;
  if(name.endsWith('/repositories/provider'))return{repositories:{figma:{resolveFrame:async input=>{calls++;if(delayed)return new Promise(resolve=>{pending=()=>resolve({...input,name:'Frame'});});return{...input,name:'Frame'};},getPreview:()=>assert.fail('attachment must not download/replace preview')}}};
  return{};
 });
 let nodes=[];const render=()=>{cursor=0;nodes=[];const visit=n=>{if(Array.isArray(n))n.forEach(visit);else if(n&&typeof n==='object'){nodes.push(n);visit(n.props?.children);}};visit(c.FigmaDesignSourceField({source,onChange:v=>{source=v;}}));};
 const fill=value=>{render();nodes.find(n=>n.type==='input').props.onChange({target:{value}});render();};
 const attach=async()=>{await nodes.find(n=>n.type==='button').props.onClick();await new Promise(resolve=>setImmediate(resolve));render();};
 fill('javascript:alert(1)');await attach();assert.equal(calls,0);assert.equal(source,undefined);assert.ok(nodes.some(n=>n.props?.role==='alert'));
 const url='https://www.figma.com/design/abc/Frame?node-id=1-2&t=exact';fill(url);await attach();assert.equal(source.url,url);assert.equal(source.fileKey,'abc');assert.equal(source.nodeId,'1:2');assert.equal(source.lastSyncedFingerprint,'');assert.equal(calls,1);
 fill('https://figma.com/design/xyz/Other?node-id=3-4');await attach();assert.equal(source.nodeId,'3:4');
 nodes.find(n=>n.type==='button'&&n.props.children==='Remove Figma link').props.onClick();assert.equal(source,undefined);
 assert.deepEqual(draft,{preview:'manual-png',history:['v1'],notes:['keep']});
 delayed=true;fill(url);nodes.find(n=>n.type==='button').props.onClick();cleanups[0]();pending();await new Promise(resolve=>setImmediate(resolve));assert.equal(source,undefined,'late resolver must not attach after leaving the source form');
});
