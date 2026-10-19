"use client";
import { useEffect, useRef, useState } from "react";
import { parseFigmaFrame } from "@/lib/figma-source";
import { figmaIntegrationFailure } from "@/lib/figma-integration-errors";
import { repositories } from "@/lib/repositories/provider";
import type { FigmaSource } from "@/types/design-library";

export function FigmaDesignSourceField({ source, onChange }: { source?: FigmaSource; onChange: (source?: FigmaSource) => void }) {
  const [value, setValue] = useState(source?.url ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const request = useRef(0);
  const lock = useRef(false);
  useEffect(() => () => { request.current += 1; }, []);
  async function attach() {
    if (lock.current) return;
    const id = ++request.current;
    try {
      const input = parseFigmaFrame(value);
      if (!repositories.figma) throw new Error("Figma unavailable");
      lock.current = true; setBusy(true); setError("");
      const frame = await repositories.figma.resolveFrame(input);
      if (id !== request.current) return;
      if (frame.fileKey !== input.fileKey || frame.nodeId !== input.nodeId) throw new Error("Frame mismatch");
      onChange({ ...input, name: frame.name, resolvedAt: new Date().toISOString(), lastCheckedAt: new Date().toISOString(), lastSyncedFingerprint: "" });
    } catch (cause) { if (id === request.current) setError(figmaIntegrationFailure(cause).title); }
    finally { lock.current = false; setBusy(false); }
  }
  return <section className="mt-4 space-y-2">
    <label className="block text-xs font-medium text-slate-600">Figma frame URL (optional)<input value={value} placeholder="No Figma link attached" aria-invalid={Boolean(error)} aria-describedby="design-source-help" onChange={e => { request.current++; setValue(e.target.value); setError(""); }} className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900"/></label>
    <p id="design-source-help" className="text-xs text-slate-500">{source ? "Linked design source. Your uploaded preview is unchanged." : "Optional design reference. Attaching a frame never replaces your uploaded preview."}</p>
    {error && <p role="alert" className="text-xs text-red-700">{error}. Nothing was attached; you can publish without changing the design source.</p>}
    <div className="flex gap-2"><button type="button" disabled={busy || !value.trim() || value === source?.url} onClick={() => void attach()} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-blue-700 disabled:opacity-40">{busy ? "Checking frame..." : "Attach Figma source"}</button>{source && <button type="button" onClick={() => { request.current++; onChange(undefined); setValue(""); setError(""); }} className="rounded-md px-3 py-2 text-xs text-slate-600">Remove Figma link</button>}</div>
  </section>;
}
