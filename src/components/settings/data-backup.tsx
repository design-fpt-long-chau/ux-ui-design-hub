"use client";
import { useEffect, useRef, useState } from "react";
import { Download, Upload, Archive } from "lucide-react";
import { repositories } from "@/lib/repositories/provider";
import { MAX_PACKAGE_BYTES } from "@/lib/portability/zip";
import type { ImportPlan, ImportStrategy } from "@/lib/portability/contracts";
const button = "inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40";
export function DataBackup() {
  const [busy,setBusy] = useState(false), [message,setMessage] = useState(""), [error,setError] = useState("");
  const [plan,setPlan] = useState<ImportPlan>(), [strategy,setStrategy] = useState<ImportStrategy>("keep-existing"), [ack,setAck] = useState(false);
  const [download,setDownload] = useState<{url:string;filename:string}>();
  useEffect(() => () => { if (download) URL.revokeObjectURL(download.url); }, [download]);
  const input = useRef<HTMLInputElement>(null), selected = useRef<Uint8Array | null>(null);
  const exportPackage = async (kind: "export" | "backup") => {
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await repositories.portability.exportLibrary(kind);
      const url = URL.createObjectURL(new Blob([result.bytes as Uint8Array<ArrayBuffer>],{type:"application/zip"}));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = result.filename; anchor.click();
      setDownload({url,filename:result.filename});
      setMessage(`${kind === "backup" ? "Backup" : "Export"} downloaded. ${Object.entries(result.counts).map(([key,value]) => `${value} ${key}`).join(" · ")}${result.warnings.length ? ` · ${result.warnings.length} asset warnings; see manifest.json.` : ""}`);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Export failed. No Library data was changed."); }
    finally { setBusy(false); }
  };
  const review = async (bytes: Uint8Array, next: ImportStrategy) => {
    setBusy(true); setPlan(undefined); setAck(false); setError(""); setMessage("");
    try { setPlan(await repositories.portability.previewImport(bytes,next)); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Invalid package. No data was changed."); }
    finally { setBusy(false); }
  };
  const apply = async () => {
    if (!plan || !ack) return;
    setBusy(true); setError("");
    try { await repositories.portability.applyImport(plan.token); setPlan(undefined); selected.current = null; if (input.current) input.current.value = ""; setMessage("Import complete. Library views have been refreshed."); }
    catch (failure) { setPlan(undefined); setAck(false); setError(failure instanceof Error ? failure.message : "Import failed. Review the package again."); }
    finally { setBusy(false); }
  };
  return <section aria-labelledby="data-backup-title" className="mt-6 max-w-2xl rounded-xl border border-slate-200 bg-white p-6">
    <h2 id="data-backup-title" className="text-sm font-semibold text-slate-900">Data &amp; Backup</h2>
    <p className="mt-2 text-sm text-slate-500">Move your Library between browsers with a portable ZIP. Available local previews are included. Keep backups somewhere safe.</p>
    <p className="mt-2 text-xs text-slate-500">Exports include Library content and a recovery copy of local records/drafts. Identity and device preferences stay on this device. External previews may require their original source.</p>
    <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => exportPackage("export")} className={button}><Download size={14}/>Export library</button><button type="button" disabled={busy} onClick={() => input.current?.click()} className={button}><Upload size={14}/>Import library</button><button type="button" disabled={busy} onClick={() => exportPackage("backup")} className={button}><Archive size={14}/>Create backup</button></div>
    {download && <a href={download.url} download={download.filename} className="mt-3 inline-block text-xs font-medium text-blue-700 underline">Download ZIP</a>}
    <input ref={input} type="file" accept=".zip,application/zip" aria-label="Library package" className="sr-only" onChange={async event => {
      const file = event.target.files?.[0]; selected.current = null; setPlan(undefined);
      if (!file) return;
      if (file.size > MAX_PACKAGE_BYTES) { setError("Package exceeds 100 MB."); return; }
      setBusy(true);
      try { const bytes = new Uint8Array(await file.arrayBuffer()); selected.current = bytes; await review(bytes,strategy); }
      catch { setError("Could not read this file. No data was changed."); setBusy(false); }
    }}/>
    <label className="mt-5 block text-xs font-medium text-slate-600">Import strategy<select disabled={busy} value={strategy} onChange={event => { const next = event.target.value as ImportStrategy; setStrategy(next); setAck(false); if (selected.current) void review(selected.current,next); }} className="mt-2 block h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900"><option value="keep-existing">Merge — keep existing conflicts</option><option value="use-incoming">Merge — use incoming conflicts</option><option value="restore-clean">Restore into a clean Local Library</option></select></label>
    <p className="mt-2 text-xs text-slate-500">Merge retains unrelated records. Incoming conflicts replace matching fields/ordered lists only. Clean restore is blocked if this browser has any saved Library records or draft.</p>
    {plan && <div className="mt-5 border-t border-slate-200 pt-4"><h3 className="text-sm font-semibold text-slate-900">Review import</h3><p className="mt-2 text-xs text-slate-600">{Object.entries(plan.summary.counts).map(([key,value]) => `${value} ${key}`).join(" · ")}</p><p className="mt-2 text-sm text-slate-700">{plan.summary.added} new · {plan.summary.identical} identical · {plan.summary.conflicts.length} conflicts</p>
      {plan.summary.conflicts.length > 0 && <ul aria-label="Import conflicts" className="mt-3 max-h-40 overflow-y-auto text-xs text-slate-600">{plan.summary.conflicts.map(item => <li key={`${item.entity}:${item.id}`} className="break-words py-1">{item.entity}: {item.name} — {item.id}</li>)}</ul>}
      <ul className="mt-3 max-h-32 overflow-y-auto text-xs text-slate-500">{plan.summary.warnings.map((warning,index) => <li key={index} className="break-words py-1">{warning}</li>)}</ul>
      <label className="mt-4 flex items-start gap-2 text-xs text-slate-700"><input type="checkbox" checked={ack} disabled={busy} onChange={event => setAck(event.target.checked)}/>I reviewed the summary and selected strategy. Apply this import.</label>
      <div className="mt-4 flex gap-2"><button type="button" disabled={busy || !ack} onClick={apply} className="rounded-md bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-40">Apply import</button><button type="button" disabled={busy} className={button} onClick={() => { setPlan(undefined); selected.current = null; setAck(false); if (input.current) input.current.value = ""; }}>Cancel</button></div>
    </div>}
    {busy && <p role="status" className="mt-3 text-xs text-slate-500">Processing package…</p>}
    {error && <p role="alert" className="mt-3 break-words text-sm text-red-600">{error}</p>}
    <p role="status" className="mt-3 text-xs text-slate-600">{message}</p>
  </section>;
}
