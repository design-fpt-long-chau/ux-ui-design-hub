import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { screenVersionHref } from "@/lib/screen-platform";
import type { Screen, ScreenPlatform, VersionSnapshot } from "@/types/design-library";

export function VersionHistoryPanel({ screen, platform, history, selectedVersion, onClose }: { screen: Screen; platform: ScreenPlatform; history: VersionSnapshot[]; selectedVersion: string; onClose: () => void }) {
  const platformLabel = platform === "mobile" ? "Mobile" : "Web";
  return <aside className="library-metadata-panel relative h-full w-[336px] shrink-0 overflow-y-auto border-l border-slate-200 bg-white">
    <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur"><button type="button" onClick={onClose} className="mb-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-blue-700"><ArrowLeft size={13}/> Screen information</button><h2 className="text-sm font-semibold text-slate-950">Version history</h2><p className="mt-1 text-[11px] leading-4 text-slate-500">{screen.name}<br/>{platformLabel} · {history.length} recorded versions</p></div>
    <div className="version-history-list p-3">{history.length > 0 ? history.map(snapshot => {
      const selected = snapshot.version === selectedVersion;
      return <Link key={snapshot.id} scroll={false} href={screenVersionHref(screen, platform, snapshot.status === "current" ? undefined : snapshot.version)} aria-current={selected ? "page" : undefined} className={`mb-2 block rounded-lg border p-3 transition ${selected ? "border-blue-300 bg-blue-50/60" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/70"}`}>
        <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-950">{snapshot.version}</p><p className="mt-1 text-[10px] text-slate-400">{snapshot.lastUpdated}</p></div><span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${snapshot.status === "current" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{snapshot.status === "current" ? "Current" : "Archived"}</span></div>
        <p className="mt-2 text-[11px] text-slate-600">Uploaded by {snapshot.uploadedBy}</p><p className={`mt-1 flex items-center gap-1 text-[10px] ${snapshot.evidence.status === "Unverified" ? "text-slate-400" : "text-emerald-700"}`}><CheckCircle2 size={11}/>{snapshot.evidence.status}</p>{snapshot.changelog && <p className="mt-2 text-[10px] text-slate-400">{snapshot.changelog.length} documented changes</p>}
      </Link>;
    }) : <p className="px-2 py-8 text-center text-xs text-slate-400">No version history documented.</p>}</div>
  </aside>;
}
