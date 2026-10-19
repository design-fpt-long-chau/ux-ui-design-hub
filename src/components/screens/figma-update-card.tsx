"use client";
import { OpenInFigma } from "./open-in-figma";
/* eslint-disable @next/next/no-img-element -- Adapter returns durable browser-local snapshots. */
import { RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { figmaIntegrationFailure, type FigmaIntegrationFailure } from "@/lib/figma-integration-errors";
import { isFigmaCheckStale, requestFigmaUpdateCheck } from "@/lib/figma-update-policy";
import { createVersionFromFigma, recordFigmaCheck } from "@/lib/repositories/client";
import { repositories } from "@/lib/repositories/provider";
import { storageErrorMessage } from "@/lib/storage-errors";
import type { FigmaUpdateCheck, Screen, ScreenPlatform } from "@/types/design-library";

function checkedLabel(value?: string) {
  if (!value) return "Not checked yet";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function newerCheck(local?: FigmaUpdateCheck, persisted?: FigmaUpdateCheck) {
  if (!local) return persisted;
  if (!persisted) return local;
  return new Date(local.checkedAt).getTime() >= new Date(persisted.checkedAt).getTime() ? local : persisted;
}

export function FigmaUpdateCard({ screen, canonicalScreen = screen, platform, currentPreview, historical = false }: { screen: Screen; canonicalScreen?: Screen; platform: ScreenPlatform; currentPreview?: string | null; historical?: boolean }) {
  const source = screen.figmaSource;
  const adapter = repositories.figma;
  const shouldCheckOnOpen = !historical && Boolean(source && adapter) && isFigmaCheckStale(source?.lastCheckedAt);
  const [check, setCheck] = useState<FigmaUpdateCheck | undefined>(screen.pendingFigmaUpdate);
  const [busy, setBusy] = useState(shouldCheckOnOpen);
  const [creating, setCreating] = useState(false);
  const [compare, setCompare] = useState(false);
  const [failure, setFailure] = useState<FigmaIntegrationFailure>();
  const [coolingDown, setCoolingDown] = useState(false);
  const [retrySeconds, setRetrySeconds] = useState(0);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"notice" | "error">("notice");
  const createLock = useRef(false);
  const mounted = useRef(true);
  const effectiveCheck = newerCheck(check, screen.pendingFigmaUpdate);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!shouldCheckOnOpen || !source || !adapter) return;
    void requestFigmaUpdateCheck(screen.id, source, adapter, recordFigmaCheck)
      .then((result) => {
        if (!mounted.current) return;
        setCheck(result);
        setFailure(undefined);
      })
      .catch((cause) => {
        if (!mounted.current) return;
        setFailure(figmaIntegrationFailure(cause));
        setCoolingDown(Boolean(cause && typeof cause === "object" && "retryAt" in cause));
        setRetrySeconds(Math.max(0, Math.ceil(((figmaIntegrationFailure(cause).retryAt ?? Date.now()) - Date.now()) / 1000)));
      })
      .finally(() => { if (mounted.current) setBusy(false); });
  }, [adapter, screen.id, shouldCheckOnOpen, source]);

  useEffect(() => {
    if (!failure?.retryAt) return;
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((failure.retryAt! - Date.now()) / 1000));
      setRetrySeconds(remaining);
      if (!remaining) { setCoolingDown(false); clearInterval(timer); }
    }, 250);
    return () => clearInterval(timer);
  }, [failure]);

  if (screen.sourceType !== "figma" && !source) return null;
  if (!source) {
    return <section aria-label="Figma source status" className="mb-4 rounded-lg border border-red-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2"><p className="text-xs font-semibold text-slate-900">Figma source</p><span className="rounded bg-red-100 px-2 py-1 text-[10px] font-semibold text-red-700">Error</span></div>
      <p role="alert" className="mt-2 text-xs text-red-700">The linked Figma source is missing. Reattach the exact frame in Edit Screen; the Current version remains unchanged.</p>
    </section>;
  }

  const available = Boolean(effectiveCheck?.changed);
  const rateLimited = failure?.code === "rate_limited";
  const status = available ? "Update available" : rateLimited ? "Rate limited" : failure || (message && messageTone === "error") ? "Error" : "Connected";
  const statusClass = status === "Error" ? "bg-red-100 text-red-700" : (status === "Update available" || status === "Rate limited") ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700";

  const manualCheck = () => {
    if (!adapter || busy || creating || coolingDown) return;
    setFailure(undefined);
    setMessage("");
    setMessageTone("notice");
    setBusy(true);
    void requestFigmaUpdateCheck(screen.id, source, adapter, recordFigmaCheck)
      .then((result) => {
        if (!mounted.current) return;
        setCheck(result);
        setCompare(result.changed ? compare : false);
      })
      .catch((cause) => {
        if (!mounted.current) return;
        setFailure(figmaIntegrationFailure(cause));
        setCoolingDown(Boolean(cause && typeof cause === "object" && "retryAt" in cause));
        setRetrySeconds(Math.max(0, Math.ceil(((figmaIntegrationFailure(cause).retryAt ?? Date.now()) - Date.now()) / 1000)));
      })
      .finally(() => { if (mounted.current) setBusy(false); });
  };

  const createVersion = async () => {
    if (!effectiveCheck?.changed || !adapter || createLock.current || busy) return;
    createLock.current = true;
    setCreating(true);
    setFailure(undefined);
    setMessage("");
    setMessageTone("notice");
    try {
      // Publish the already resolved candidate, even when a newer check is unavailable.
      // Repository guards reject changed source identities and already-synced fingerprints.
      createVersionFromFigma(screen.id, platform, effectiveCheck.frame, effectiveCheck.checkedAt);
      setCheck(undefined);
      setCompare(false);
    } catch (cause) {
      if (mounted.current) {
        if (cause && typeof cause === "object" && "code" in cause) setFailure(figmaIntegrationFailure(cause));
        else {
          setMessageTone("error");
          setMessage(storageErrorMessage(cause));
        }
      }
    } finally {
      createLock.current = false;
      if (mounted.current) setCreating(false);
    }
  };

  return <section aria-label="Figma source status" aria-busy={busy || creating} className="figma-source-status rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold text-slate-900">Figma source</p>
          {historical ? <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">Archived snapshot · read only</span> : <span className={`rounded px-2 py-1 text-[10px] font-semibold ${statusClass}`}>{status}</span>}
        </div>
        <p className="mt-1 truncate text-[11px] text-slate-500">{source.name || "Linked Figma frame"}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400">
          <span>Last checked: {checkedLabel(effectiveCheck?.checkedAt ?? source.lastCheckedAt)}</span>
          <span>Last synced: {checkedLabel(source.lastSyncedAt ?? source.resolvedAt)}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <OpenInFigma screen={canonicalScreen} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-blue-700"/>
        {!historical && <button type="button" onClick={manualCheck} disabled={busy || creating || coolingDown || !adapter} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-blue-200 hover:text-blue-700 disabled:opacity-40"><RefreshCw size={13}/>Check for updates</button>}
      </div>
    </div>
    {busy && <p role="status" className="mt-3 flex items-center gap-2 text-xs text-slate-500"><RefreshCw className="animate-spin" size={13}/>Checking Figma frame...</p>}
    {failure && (available || rateLimited) && <div role="status" className="mt-3 rounded-md border border-amber-200 bg-slate-50 p-3"><p className="text-xs font-semibold text-amber-900">{rateLimited ? failure.title : "Không thể kiểm tra bản cập nhật mới nhất lúc này."}</p><p className="mt-1 text-[11px] text-amber-800">{rateLimited ? (retrySeconds > 0 ? `Try again in ${retrySeconds}s.` : "You can retry now.") : "Đang hiển thị bản cập nhật đã phát hiện trước đó."}</p>{rateLimited && process.env.NODE_ENV === "development" && <p className="mt-2 text-[11px] text-slate-500">Plan tier: {failure.rateLimit?.planTier ?? "Unknown"} · Rate limit type: {failure.rateLimit?.type ?? "Unknown"} · Retry after: {retrySeconds}s</p>}{rateLimited && available && <p className="mt-1 text-[11px] text-amber-800">Đang hiển thị bản cập nhật đã phát hiện trước đó.</p>}{!historical && <button type="button" onClick={manualCheck} disabled={busy || creating || coolingDown} className="mt-2 rounded-md border border-amber-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 disabled:opacity-40">Retry check</button>}</div>}
    {failure && !available && !rateLimited && <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3"><p role="alert" className="text-xs font-semibold text-red-700">{failure.title}</p><p className="mt-1 text-[11px] text-red-600">{failure.detail} The LC Current snapshot was kept unchanged.</p>{!historical && <button type="button" onClick={manualCheck} disabled={busy || creating || coolingDown} className="mt-2 rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 disabled:opacity-40">Retry check</button>}</div>}
    {message && <p role={messageTone === "error" ? "alert" : "status"} className={`mt-3 text-xs ${messageTone === "error" ? "text-red-600" : "text-slate-600"}`}>{message}</p>}
    {available && <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-semibold text-amber-900">Có cập nhật mới từ Figma</p><p className="mt-1 text-xs text-amber-800">Frame liên kết đã thay đổi kể từ phiên bản hiện tại.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => setCompare(value => !value)} disabled={busy || creating} className="rounded-md border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 disabled:opacity-40">So sánh thay đổi</button><button type="button" onClick={() => void createVersion()} disabled={busy || creating} className="rounded-md bg-blue-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{creating ? "Đang tạo phiên bản…" : "Tạo phiên bản mới"}</button></div></div>}
    {compare && effectiveCheck && <div className="mt-4" aria-label="Figma snapshot comparison"><div className="figma-compare-grid"><figure className="rounded-lg border border-slate-200 bg-slate-50 p-3"><figcaption className="mb-3 text-xs font-semibold text-slate-700">LC Current snapshot</figcaption>{currentPreview ? <img src={currentPreview} alt="LC Current snapshot" className="figma-compare-image"/> : <div className="grid h-56 place-items-center text-xs text-slate-400">No current preview</div>}</figure><figure className="rounded-lg border border-blue-200 bg-blue-50/40 p-3"><figcaption className="mb-3 text-xs font-semibold text-blue-800">Figma Latest</figcaption><img src={effectiveCheck.frame.preview} alt="Figma Latest snapshot" className="figma-compare-image"/></figure></div><p className="mt-2 text-[10px] text-slate-400">Side-by-side snapshot review. No pixel-level diff is applied.</p></div>}
  </section>;
}
