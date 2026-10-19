"use client";
/* eslint-disable @next/next/no-img-element -- Adapter returns a durable frame snapshot data URL. */
import { useEffect, useRef, useState } from "react";
import { repositories } from "@/lib/repositories/provider";
import { resolveFigmaFrame } from "@/lib/figma-source";
import { figmaIntegrationFailure, type FigmaIntegrationFailure } from "@/lib/figma-integration-errors";
import type { FigmaSource } from "@/types/design-library";

export type ResolvedFrame = Awaited<ReturnType<typeof resolveFigmaFrame>>;

function fileName(frame: ResolvedFrame) {
  if (frame.fileName?.trim()) return frame.fileName;
  try {
    const slug = new URL(frame.url).pathname.split("/")[3];
    return decodeURIComponent(slug || "Figma file").replace(/[-_]+/g, " ");
  } catch { return "Figma file"; }
}

export function FigmaSourceField({ source, url, hasPreview, onUse }: { source?: FigmaSource; url?: string; hasPreview: boolean; onUse: (frame: ResolvedFrame) => void }) {
  const initialUrl = source?.url ?? url ?? "";
  const [value, setValue] = useState(initialUrl);
  const [candidate, setCandidate] = useState<ResolvedFrame>();
  const [failure, setFailure] = useState<FigmaIntegrationFailure>();
  const [checking, setChecking] = useState(false);
  const [editingLink, setEditingLink] = useState(!initialUrl);
  const [confirm, setConfirm] = useState(false);
  const requestId = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const interacted = useRef(false);
  const candidateIsCurrent = candidate?.source.url === value.trim();
  useEffect(() => () => { requestId.current += 1; }, []);

  async function check(requestedUrl: string) {
    const id = ++requestId.current;
    setFailure(undefined);
    try {
      repositories.figma?.parseFrameUrl(requestedUrl);
    } catch (cause) {
      if (id === requestId.current) { setChecking(false); setFailure(figmaIntegrationFailure(cause)); }
      return;
    }
    setChecking(true);
    try {
      const frame = await resolveFigmaFrame(requestedUrl, repositories.figma);
      if (id === requestId.current) { setCandidate(frame); setFailure(undefined); setEditingLink(false); }
    } catch (cause) {
      if (id === requestId.current) setFailure(figmaIntegrationFailure(cause));
    } finally {
      if (id === requestId.current) setChecking(false);
    }
  }

  useEffect(() => {
    if (!interacted.current) return;
    const requestedUrl = value.trim();
    if (!requestedUrl) return;
    const timer = setTimeout(() => { void check(requestedUrl); }, 350);
    return () => clearTimeout(timer);
  }, [value]);

  function apply() {
    if (!candidate || !candidateIsCurrent || checking) return;
    onUse(candidate);
    setConfirm(false);
  }

  function changeLink() {
    requestId.current += 1;
    setChecking(false);
    setFailure(undefined);
    setEditingLink(true);
    requestAnimationFrame(() => { input.current?.focus(); input.current?.select(); });
  }

  return <section className="mt-4 min-w-0 space-y-3">
    {(editingLink || !candidate) && <label className="block text-xs font-medium text-slate-600">Figma frame URL<input ref={input} value={value} placeholder="Paste exact Figma frame URL" aria-invalid={Boolean(failure)} aria-describedby={failure ? "figma-frame-status" : undefined} onChange={event => { interacted.current = true; requestId.current += 1; setValue(event.target.value); setChecking(false); setFailure(undefined); setConfirm(false); }} className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900"/></label>}
    {checking && <div id="figma-frame-status" role="status" className="flex items-center gap-2 text-xs font-medium text-blue-700"><span aria-hidden className="size-3 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700"/>Checking frame...</div>}
    {!checking && failure && <div id="figma-frame-status" role="alert" className={`overflow-hidden rounded-xl border bg-white shadow-sm ${candidate ? "border-amber-200" : "border-red-200"}`}>
      <div className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 ${candidate ? "border-amber-100 bg-amber-50" : "border-red-100 bg-red-50"}`}><div><p className={`text-xs font-semibold ${candidate ? "text-amber-800" : "text-red-700"}`}>{failure.title}</p><p className={`mt-1 text-xs ${candidate ? "text-amber-700" : "text-red-600"}`}>{failure.detail}</p></div>{candidate && <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-amber-700">Previous frame candidate is still available</span>}</div>
      {!candidate && <div className="grid min-h-64 place-items-center bg-slate-50/80 px-6 py-10 text-center sm:min-h-72"><div><div aria-hidden className="mx-auto grid size-11 place-items-center rounded-full border border-red-200 bg-white text-lg font-semibold text-red-500">!</div><p className="mt-3 text-sm font-semibold text-slate-700">Preview unavailable</p><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">Fix the frame link or retry the connection. Nothing has been applied to this Screen.</p></div></div>}
      <div className="flex justify-end border-t border-slate-100 px-4 py-3"><button type="button" onClick={() => void check(value.trim())} disabled={!value.trim()} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-blue-200 hover:text-blue-700 disabled:opacity-40">Retry</button></div>
    </div>}
    {candidate && <div aria-label="Connected Figma frame preview" className="overflow-hidden rounded-xl border semantic-success-border bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b semantic-success-border semantic-success-surface px-4 py-3 sm:px-5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span aria-hidden className="size-2 rounded-full semantic-success-dot"/><p className="text-xs font-semibold semantic-success-text">{candidateIsCurrent ? "Frame connected" : "Previous frame candidate"}</p></div><p className="mt-1 truncate text-sm font-semibold text-slate-900">{candidate.name}</p></div><span className="shrink-0 rounded-full border semantic-success-border semantic-success-badge px-2.5 py-1 text-[10px] font-semibold semantic-success-text shadow-sm">{candidateIsCurrent ? "Ready to use" : "Kept safe"}</span></div>
      <div className="flex min-h-80 items-center justify-center overflow-hidden bg-slate-50/70 p-4 sm:min-h-[420px] sm:p-6 lg:min-h-[480px]"><img src={candidate.preview} alt={`Rendered Figma frame ${candidate.name}`} className="block h-auto max-h-[min(62vh,640px)] w-auto max-w-full object-contain drop-shadow-[0_16px_34px_rgba(15,23,42,0.16)]"/></div>
      <div className="border-t border-slate-100 px-4 py-4 sm:px-5"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><dl className="grid min-w-0 flex-1 gap-3 text-xs sm:grid-cols-2"><div className="min-w-0"><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">File name</dt><dd className="mt-1 truncate font-medium text-slate-700" title={`${fileName(candidate)} · ${candidate.name}`}>{fileName(candidate)} · {candidate.name}</dd></div><div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Last checked</dt><dd className="mt-1 text-slate-600">{new Date(candidate.source.lastCheckedAt).toLocaleString()}</dd></div></dl><div className="flex shrink-0 flex-wrap gap-2 md:justify-end"><button type="button" onClick={changeLink} className="rounded-md border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:border-blue-200 hover:text-blue-700">Change link</button><button type="button" disabled={!candidateIsCurrent || checking} onClick={() => hasPreview ? setConfirm(true) : apply()} className="rounded-md bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-40">Use this frame</button></div></div></div>
    </div>}
    {candidate && !candidateIsCurrent && <p role="status" className="text-xs text-slate-500">Resolve the current link before using this frame. Your existing preview is unchanged.</p>}
    {!candidate && source && !checking && !failure && <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500"><span className="rounded semantic-success-surface px-2 py-1 font-semibold semantic-success-text">Linked</span><span>{source.name ?? "Figma frame"}</span><span>Last checked {new Date(source.lastCheckedAt).toLocaleString()}</span></div>}
    {!candidate && !source && !checking && !failure && <p className="text-[10px] text-slate-400">No Figma link attached. Paste an exact frame URL to check it.</p>}
    {confirm && <div role="alertdialog" aria-label="Replace preview source?" className="rounded-lg border border-slate-200 bg-white p-3"><p className="text-sm font-semibold text-slate-900">Replace preview source?</p><p className="mt-2 text-xs text-slate-600">Your existing preview and source will be replaced only after confirmation. Notes are kept; review their positions after replacement.</p><div className="mt-3 flex gap-2"><button type="button" autoFocus onClick={() => setConfirm(false)} onKeyDown={event => { if (event.key === "Escape") setConfirm(false); }} className="px-3 py-2 text-xs">Cancel</button><button type="button" onClick={apply} className="rounded bg-blue-700 px-3 py-2 text-xs text-white">Replace source</button></div></div>}
  </section>;
}
