import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function loadTypeScriptModule(path) {
 const moduleExports = {};
 const output = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
 vm.runInNewContext(output, { exports: moduleExports, URL, Headers, Request, Response, fetch });
 return moduleExports;
}

const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync("src/lib/figma-source.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, URL });
const { parseFigmaFrame, resolveFigmaFrame } = exports;
const { createFigmaApi, figmaIntegrationStatus } = loadTypeScriptModule("src/lib/server/figma-api-core.ts");
const { figmaIntegrationFailure } = loadTypeScriptModule("src/lib/figma-integration-errors.ts");
const url = "https://www.figma.com/design/abc123/Example?node-id=1-2";
const durable = "data:image/png;base64,AA==";

function json(body, status = 200) {
 return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function rejectsWithCode(promise, code) {
 await assert.rejects(promise, error => error?.code === code);
}
function adapter({ resolved = {}, preview = durable } = {}) {
  return {
    parseFrameUrl: parseFigmaFrame,
    resolveFrame: async input => ({ ...input, name: "QA Frame", width: 240, height: 480, fingerprint: "fixture:r1", ...resolved }),
    getPreview: async () => preview,
    checkForUpdate: async source => ({ changed: false, checkedAt: "now", frame: { ...source, name: "QA Frame", preview, width: 240, height: 480, fingerprint: source.lastSyncedFingerprint } }),
  };
}
test("exact frame links normalize node ID and reject file-only/foreign links", () => {
 assert.equal(parseFigmaFrame(url).nodeId, "1:2");
 for (const value of ["invalid", "https://figma.com/design/abc123/Example", "https://evil.com/design/abc123/x?node-id=1-2", "https://figma.com.evil.com/design/abc123/x?node-id=1-2"]) assert.throws(() => parseFigmaFrame(value));
});
test("unconfigured resolver never claims URL verification", async () => { await assert.rejects(resolveFigmaFrame(url), /not connected/); });
test("resolved snapshot preserves exact frame identity, fingerprint and durable asset", async () => {
 const frame = await resolveFigmaFrame(url, adapter());
 assert.equal(frame.source.fileKey, "abc123"); assert.equal(frame.source.nodeId, "1:2"); assert.equal(frame.source.url, url);
 assert.equal(frame.source.lastSyncedFingerprint, "fixture:r1"); assert.ok(frame.source.lastCheckedAt); assert.ok(frame.source.resolvedAt);
});
test("wrong node and expiring image URLs cannot be accepted as snapshots", async () => {
 await assert.rejects(resolveFigmaFrame(url, adapter({ resolved: { nodeId: "9:9" } })), /durable/);
 await assert.rejects(resolveFigmaFrame(url, adapter({ preview: "https://example.com/temporary.png" })), /durable/);
});
test("provider-agnostic contract exposes parse, resolve, preview and update checks", () => {
 const contract = readFileSync("src/lib/repositories/contracts.ts", "utf8");
 for (const method of ["parseFrameUrl", "resolveFrame", "getPreview", "checkForUpdate"]) assert.match(contract, new RegExp(method));
 assert.match(readFileSync("src/lib/repositories/provider.ts", "utf8"), /figma: localFigmaIntegration/);
});

test("Add Screen auto-checks frame links and requires explicit candidate confirmation", () => {
 const field = readFileSync("src/components/manage/figma-source-field.tsx", "utf8");
 const failureCopy = readFileSync("src/lib/figma-integration-errors.ts", "utf8");
 for (const copy of ["Checking frame...", "Frame connected", "Retry", "Change link", "Use this frame", "File name", "Last checked"]) assert.match(field, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
 for (const copy of ["Invalid link", "Figma connection is not configured", "No access", "Frame not found", "Figma rate limit reached", "Figma API unavailable", "Preview unavailable"]) assert.match(failureCopy, new RegExp(copy));
 assert.doesNotMatch(field, />Resolve frame</);
 assert.doesNotMatch(field, /candidate\.fileKey|candidate\.nodeId/);
 assert.match(field, /previous frame candidate is still available/i);
 const resolution = field.indexOf("const frame = await resolveFigmaFrame");
 const failedCheck = field.slice(field.indexOf("} catch (cause) {", resolution), field.indexOf("} finally", resolution));
 assert.doesNotMatch(failedCheck, /setCandidate/);
 const form = readFileSync("src/components/manage/add-screen-form.tsx", "utf8");
 assert.match(form, /onUse=\{useFrame\}/);
 assert.match(form, /disabled=\{!sourceReady\}/);
 assert.match(form, /sourceChoice === "figma"[\s\S]*PreviewPane[\s\S]*onFile=\{readImage\}/);
});

test("configured adapter exports the exact Figma node PNG and never invents a preview", () => {
 const adapter = readFileSync("src/lib/adapters/local/figma.ts", "utf8");
 const api = readFileSync("src/lib/server/figma-api.ts", "utf8");
 const core = readFileSync("src/lib/server/figma-api-core.ts", "utf8");
 assert.match(adapter, /getPreview\(frame\)/);
 assert.match(adapter, /\/api\/figma\/frame\/preview/);
 assert.match(core, /\/images\/\$\{encodeURIComponent\(fileKey\)\}\?ids=\$\{encodeURIComponent\(nodeId\)\}&format=png/);
 assert.match(core, /\/files\/\$\{encodeURIComponent\(fileKey\)\}\/nodes\?ids=\$\{encodeURIComponent\(nodeId\)\}/);
 assert.match(api, /import "server-only"/);
 assert.match(api, /process\.env\.FIGMA_ACCESS_TOKEN/);
 assert.match(core, /"X-Figma-Token": token/);
 assert.doesNotMatch(api + core, /FIGMA_OAUTH_TOKEN|NEXT_PUBLIC_|Authorization:/);
 assert.doesNotMatch(adapter, /FIGMA_ACCESS_TOKEN|X-Figma-Token/);
 assert.doesNotMatch(adapter + api + core, /canvas|paintPreview|FALLBACK_PREVIEW|mock-update|mock-error/);
});

test("safe runtime status reports configuration without returning a token", () => {
 assert.equal(figmaIntegrationStatus(undefined), "NOT CONFIGURED");
 assert.equal(figmaIntegrationStatus("  "), "NOT CONFIGURED");
 assert.equal(figmaIntegrationStatus("secret-fixture"), "CONFIGURED");
 const route = readFileSync("src/app/api/figma/status/route.ts", "utf8");
 assert.match(route, /FIGMA INTEGRATION: \$\{status\}/);
 assert.match(route, /getFigmaIntegrationStatus/);
 assert.doesNotMatch(route, /FIGMA_ACCESS_TOKEN|token/i);
 assert.match(readFileSync(".gitignore", "utf8"), /^\.env\*/m);
});

test("mocked Figma API verifies the exact node and exports its real PNG", async () => {
 const calls = [];
 const token = "secret-fixture";
 const fetcher = async (input, init) => {
  calls.push({ url: String(input), tokenHeader: init?.headers?.get("X-Figma-Token") });
  if (String(input).startsWith("https://api.figma.com/v1/files/")) return json({ name: "Checkout file", version: "42", nodes: { "1:2": { document: { id: "1:2", name: "Checkout frame", absoluteBoundingBox: { width: 390, height: 844 } } } } });
  if (String(input).startsWith("https://api.figma.com/v1/images/")) return json({ images: { "1:2": "https://images.example.test/rendered.png" } });
  return new Response(new Uint8Array([137, 80, 78, 71]), { headers: { "Content-Type": "image/png" } });
 };
 const api = createFigmaApi(token, fetcher);
 const frame = await api.verifyFrame("abc123", "1:2");
 const image = await api.exportFramePng("abc123", "1:2");
 assert.deepEqual({ name: frame.name, fileName: frame.fileName, width: frame.width, height: frame.height }, { name: "Checkout frame", fileName: "Checkout file", width: 390, height: 844 });
 assert.equal(image.headers.get("content-type"), "image/png");
 assert.match(calls[0].url, /\/files\/abc123\/nodes\?ids=1%3A2&depth=1$/);
 assert.match(calls[1].url, /\/images\/abc123\?ids=1%3A2&format=png$/);
 assert.equal(calls[0].tokenHeader, token);
 assert.equal(calls[1].tokenHeader, token);
 assert.ok(calls.every(call => !call.url.includes(token)));
 assert.doesNotMatch(JSON.stringify(frame), new RegExp(token));
});

test("mocked Figma failures preserve distinct integration states", async () => {
 let called = false;
 await rejectsWithCode(createFigmaApi(undefined, async () => { called = true; return json({}); }).verifyFrame("abc123", "1:2"), "not_configured");
 assert.equal(called, false);
 for (const status of [401, 403]) await rejectsWithCode(createFigmaApi("token", async () => json({}, status)).verifyFrame("abc123", "1:2"), "no_access");
 await rejectsWithCode(createFigmaApi("token", async () => json({}, 404)).verifyFrame("abc123", "1:2"), "not_found");
 await rejectsWithCode(createFigmaApi("token", async () => json({}, 429)).verifyFrame("abc123", "1:2"), "rate_limited");
 await rejectsWithCode(createFigmaApi("token", async () => json({}, 503)).verifyFrame("abc123", "1:2"), "api_unavailable");
 await rejectsWithCode(createFigmaApi("token", async () => { throw new Error("offline"); }).verifyFrame("abc123", "1:2"), "api_unavailable");
 await rejectsWithCode(createFigmaApi("token", async () => new Response("{", { headers: { "Content-Type": "application/json" } })).verifyFrame("abc123", "1:2"), "api_unavailable");
 await rejectsWithCode(createFigmaApi("token", async () => json({ unexpected: true })).verifyFrame("abc123", "1:2"), "api_unavailable");
 await rejectsWithCode(createFigmaApi("token", async () => json({ nodes: { "1:2": null } })).verifyFrame("abc123", "1:2"), "not_found");
 await rejectsWithCode(createFigmaApi("token", async () => json({ images: { "1:2": null } })).exportFramePng("abc123", "1:2"), "preview_unavailable");
});

test("every server error maps to the required Add Screen state", () => {
 const expected = {
  not_configured: "Figma connection is not configured",
  no_access: "No access",
  not_found: "Frame not found",
  rate_limited: "Figma rate limit reached",
  api_unavailable: "Figma API unavailable",
  preview_unavailable: "Preview unavailable",
 };
 for (const [code, title] of Object.entries(expected)) assert.equal(figmaIntegrationFailure({ code }).title, title);
 assert.equal(figmaIntegrationFailure(new Error("Use a Figma design/frame link with a node-id.")).title, "Invalid link");
});

test("Screen Detail exposes explicit latest-vs-current version sync UX", () => {
 const card = readFileSync("src/components/screens/figma-update-card.tsx", "utf8") + readFileSync("src/components/screens/open-in-figma.tsx", "utf8");
 for (const copy of ["Connected", "Update available", "Check for updates", "Checking Figma frame...", "Có cập nhật mới từ Figma", "Frame liên kết đã thay đổi kể từ phiên bản hiện tại.", "So sánh thay đổi", "Tạo phiên bản mới", "LC Current snapshot", "Figma Latest", "Open in Figma", "Last checked", "Last synced"]) assert.match(card, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
 assert.match(card, /figmaIntegrationFailure\(cause\)/);
 assert.match(card, /createLock\.current/);
 assert.match(card, /createVersionFromFigma\(screen.id, platform, effectiveCheck.frame, effectiveCheck.checkedAt\)/);
 assert.match(card, /setCheck\(result\)/);
 assert.doesNotMatch(card, /source\.fileKey|source\.nodeId|Figma Current/);
 const metadata = readFileSync("src/components/metadata/metadata-panel.tsx", "utf8");
 assert.match(metadata, /aria-label="Version history"/);
 assert.match(metadata, /Current" : "Archived"/);
 assert.match(metadata, /Back to current/);
});

test("using a resolved frame updates the existing draft only after image decode", () => {
 const text=readFileSync("src/components/manage/add-screen-form.tsx","utf8");
 const ast=ts.createSourceFile("form.tsx",text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const form=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==="AddScreenForm");
 const fn=form.body.statements.find(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(ast)==="useFrame")).getText(ast);
 let draft={name:"Preserved",businessUnitId:"qa",screenGroupId:"qa.group",description:"Keep metadata",mobile:true,mobilePreview:"old",mobileAnnotations:[{id:"note"}],legacy:{keep:true}};
 let image,step="source";
 const scope={exports:{},Image:class {naturalWidth=240;naturalHeight=480;constructor(){image={onload:()=>this.onload()};} set src(value){this.value=value;}},setDraft:fn=>{draft=fn(draft)},detectPlatformFromImageDimensions:()=>({platform:"mobile"}),setDirty:()=>{},setSaved:()=>{},setFileError:()=>{},step,setStep:value=>{step=value}};
 vm.runInNewContext(ts.transpileModule(fn+";exports.useFrame=useFrame",{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,scope);
 const source={fileKey:"abc",nodeId:"1:2",url:"https://figma.com/design/abc/x?node-id=1-2",name:"Frame",resolvedAt:"now",lastCheckedAt:"now",lastSyncedFingerprint:"fixture:r1"};
 scope.exports.useFrame({source,name:"Frame",preview:durable});
 assert.equal(draft.mobilePreview,"old"); image.onload();
 assert.equal(draft.sourceType,"figma");assert.equal(draft.figmaSource,source);assert.equal(draft.name,"Preserved");assert.equal(draft.description,"Keep metadata");assert.equal(draft.mobileAnnotations[0].id,"note");assert.equal(draft.legacy.keep,true);assert.equal(step,"source");
});


test("Figma 429 exposes only a safe retry delay for seconds and HTTP-date headers", async () => {
 for (const header of ['30', new Date(Date.now()+60000).toUTCString()]) {
  const api = createFigmaApi('test-only', async () => new Response('{}', { status:429, headers:{'Retry-After':header} }));
  await assert.rejects(api.verifyFrame('abc123','1:2'), e => e.code==='rate_limited' && e.retryAfterMs>0 && e.retryAfterMs<=60000);
 }
});
test("429 retains selected diagnostic headers without secrets", async () => {
 const api=createFigmaApi("secret",async()=>new Response("",{status:429,headers:{"Retry-After":"2","X-Figma-Plan-Tier":"starter","X-Figma-Rate-Limit-Type":"low","X-Figma-Upgrade-Link":"https://figma.com/plans","X-Secret":"hidden"}}));
 await assert.rejects(api.verifyFrame("abc123","1:2"),e=>{
 assert.equal(e.retryAfterMs,2000); assert.equal(e.rateLimit.retryAfter,"2");
 assert.equal(e.rateLimit.planTier,"starter"); assert.equal(e.rateLimit.type,"low");
 assert.equal(e.rateLimit.upgradeLink,"https://figma.com/plans");
 assert.ok(!JSON.stringify(e).includes("secret")); assert.ok(!JSON.stringify(e).includes("hidden")); return true;
 });
});
test("adapter coalesces and caches node and preview calls for five minutes",async()=>{
 let now=1000,calls=0;
 class Clock extends Date {static now(){return now;}}
 class Reader {readAsDataURL(){this.result="data:image/png;base64,AA==";this.onload();}}
 const out={};
 const code=ts.transpileModule(readFileSync("src/lib/adapters/local/figma.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports:out,require:()=>({parseFigmaFrame}),Date:Clock,Map,URLSearchParams,FileReader:Reader,fetch:async url=>{calls++;return url.includes("/preview?")?new Response("png",{headers:{"Content-Type":"image/png"}}):json({name:"Frame",fingerprint:"v1",width:100,height:200});}});
 const a=out.localFigmaIntegration,input=parseFigmaFrame(url);
 const [frame]=await Promise.all([a.resolveFrame(input),a.resolveFrame(input)]);
 await Promise.all([a.getPreview(frame),a.getPreview(frame)]);
 await a.resolveFrame(input);await a.getPreview(frame);assert.equal(calls,2);
 const newerUrl = `${url}&t=new-confirmed-link`;
 const newerFrame = await a.resolveFrame(parseFigmaFrame(newerUrl));
 assert.equal(newerFrame.url, newerUrl);
 assert.equal(frame.url, url);
 assert.equal(calls, 2, 'same-node metadata reuse must preserve each caller URL');
 now+=300000;await a.resolveFrame(input);await a.getPreview(frame);assert.equal(calls,4);
});
test("external Figma links preserve exact persisted URLs and reject unsafe destinations",()=>{
 const {figmaLink}=exports;
 const first="https://www.figma.com/design/abc123/Name?node-id=1-2&t=original&extra=value";
 const second="https://www.figma.com/file/xyz789/Other?node-id=9%3A8";
 assert.equal(figmaLink({url:first,fileKey:"wrong",nodeId:"8:8"}).href,first);
 assert.equal(figmaLink({url:second}).href,second);
 assert.ok(figmaLink().error);
 for(const url of ["javascript:alert(1)","https://evil.com/design/abc?node-id=1-2","broken","https://figma.com/design/abc"]){assert.equal(figmaLink({url,fileKey:"abc",nodeId:"1:2"}).href,undefined);}
 assert.equal(parseFigmaFrame(figmaLink({fileKey:"abc",nodeId:"1:2"}).href).nodeId,"1:2");
 const shared=readFileSync("src/components/screens/open-in-figma.tsx","utf8");
 assert.match(shared,/target="_blank"/);assert.match(shared,/rel="noopener noreferrer"/);
 for(const file of ["screen-detail-client","dynamic-screen-detail"]){
  const code=readFileSync(`src/components/screens/${file}.tsx`,"utf8");
  assert.match(code,/<FigmaUpdateCard canonicalScreen=\{resolveScreenPlatform\(screen, platform\)\}/);
  assert.match(code,/<MetadataPanel canonicalScreen=\{resolveScreenPlatform\(screen, platform\)\}/);
 }
});

test("source Next requires accepted preview and never publishes while advancing",()=>{
 const form=readFileSync("src/components/manage/add-screen-form.tsx","utf8");
 const expression=form.match(/const sourceReady = ([\s\S]*?);\r?\n/)[1];
 const ready=(sourceChoice,draft,preview)=>vm.runInNewContext(expression,{sourceChoice,draft,preview,Boolean});
 assert.equal(ready("upload",{sourceType:"upload"},"preview"),true);
 assert.equal(ready("upload",{sourceType:"upload"},undefined),false);
 assert.equal(ready("figma",{},"candidate-only"),false);
 const draft={sourceType:"figma",figmaSource:{resolvedAt:"now",fileKey:"abc",nodeId:"1:2"}};
 assert.equal(ready("figma",draft,"preview"),true);
 assert.equal(ready("upload",draft,"preview"),false);
 assert.equal(ready("figma",draft,undefined),false);
 const footer=form.slice(form.indexOf("<footer"),form.indexOf("</footer>"));
 assert.match(footer,/step === "source"[\s\S]*navigateFromStepper\("information"\)/);
 assert.match(footer,/step === "review" && <button[^>]*onClick=\{publish\}/);
 assert.doesNotMatch(form,/>Continue<\/button>/);
 assert.match(form,/setDraft\(\(current\) => \(\{ \.\.\.current, currentStep: next \}\)\)/);
});
