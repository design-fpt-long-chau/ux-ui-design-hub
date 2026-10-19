"use client";

import { OpenInFigma } from "@/components/screens/open-in-figma";
import { TicketValue } from "@/components/manage/metadata-controls";
import { componentNames, ticketValues } from "@/lib/metadata-values";

import { CheckCircle2, Copy, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { screenVersionHref } from "@/lib/screen-platform";
import type { ReactNode } from "react";
import type { Screen, ScreenPlatform, VersionSnapshot } from "@/types/design-library";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="border-b border-slate-200 px-4 py-3.5"><div className="flex items-center gap-3"><h3 className="shrink-0 text-[11px] font-semibold tracking-[.08em] text-slate-500">{title}</h3><span className="h-px flex-1 bg-slate-200"/></div><div className="mt-2.5">{children}</div></section>;
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="mb-3 last:mb-0"><p className="text-[11px] font-medium text-slate-400">{label}</p><p className="mt-0.5 text-xs leading-5 text-slate-700">{value}</p></div>;
}

function EmptyValue({ children }: { children: ReactNode }) { return <p className="text-xs text-slate-400">{children}</p>; }

export function MetadataPanel({ screen, canonicalScreen = screen, platform = "mobile", historical = false, history, selectedVersion, historyCount, changelog }: { screen: Screen; canonicalScreen?: Screen; platform?: ScreenPlatform; historical?: boolean; history?: VersionSnapshot[]; selectedVersion?: string; historyCount?: number; changelog?: string[] }) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const pending = screen.status === "coming-soon" || screen.status === "unavailable";
  const platformLabel = platform === "mobile" ? "Mobile" : "Web";
  const variantsAndStates = screen.variants.length > 0 ? screen.variants : screen.states;

  useEffect(() => { if (!copied) return; const timer = window.setTimeout(() => setCopied(false), 2000); return () => window.clearTimeout(timer); }, [copied]);
  const copyToClipboard = async () => { try { await navigator.clipboard.writeText(window.location.href); } catch { const input = document.createElement("textarea"); input.value = window.location.href; input.style.position = "fixed"; input.style.opacity = "0"; document.body.appendChild(input); input.select(); document.execCommand("copy"); input.remove(); } };

  return <aside className="library-metadata-panel relative h-full w-[336px] shrink-0 overflow-y-auto border-l border-slate-200 bg-white">
    <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur"><p className="text-sm font-semibold text-slate-950">Screen information</p><p className="mt-0.5 text-[11px] text-slate-400">{platformLabel} representation</p></div>
    <div key={`${screen.id}-${platform}-${screen.currentVersion}`} className="metadata-content">
      <Section title="GENERAL INFORMATION"><div className="grid grid-cols-2 gap-x-3"><Row label="Platform" value={platformLabel}/><Row label="Status" value={historical ? "Archived" : pending ? screen.status === "coming-soon" ? "Coming soon" : "Unavailable" : "Active"}/><Row label="Uploaded by" value={screen.uploadedBy ?? "Not documented"}/><Row label="Last updated" value={screen.lastUpdated ?? "Not documented"}/></div><Row label="Description" value={screen.description}/><Row label="When it appears" value={screen.whenItAppears}/><Row label="Purpose" value={screen.purpose}/></Section>
      <Section title="JIRA">{screen.jiraTicket ? <><div className="flex items-center justify-between"><div><p className="text-[11px] text-slate-400">Main ticket</p><p className="mt-0.5 text-sm font-semibold text-blue-700">{<TicketValue value={screen.jiraTicket}/>}</p></div><ExternalLink size={14} className="text-slate-400"/></div>{ticketValues(screen.relatedTickets).length > 0 && <div className="mt-3"><p className="mb-1.5 text-[11px] text-slate-400">Related tickets</p><div className="flex flex-wrap gap-1.5">{ticketValues(screen.relatedTickets).map(ticket => <span key={ticket} className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600"><TicketValue value={ticket}/></span>)}</div></div>}</> : <EmptyValue>Not documented</EmptyValue>}</Section>
      <Section title="VERSION">{screen.currentVersion ? <><div className="flex items-center justify-between gap-2"><p className="text-lg font-semibold text-slate-950">{screen.currentVersion} <span className={`text-[11px] font-medium ${historical ? "text-slate-500" : "text-emerald-600"}`}>{historical ? "Archived" : "Current"}</span></p></div>{history && history.length > 1 && <select aria-label="Version history" value={history.find(item => item.version === (selectedVersion ?? screen.currentVersion))?.status === "current" ? "" : selectedVersion ?? screen.currentVersion} onChange={event => router.push(screenVersionHref(screen, platform, event.target.value || undefined))} className="mt-3 h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700">{history.map(item => <option key={item.id} value={item.status === "current" ? "" : item.version}>{item.version} · {item.status === "current" ? "Current" : "Archived"}</option>)}</select>}{historical && <button type="button" onClick={() => router.push(screenVersionHref(screen, platform))} className="mt-2 text-[11px] font-semibold text-blue-700 hover:underline">Back to current</button>}<p className="mt-1 text-[11px] text-slate-400">{historyCount ?? screen.versions.length} recorded versions{screen.lastUpdated ? ` · ${screen.lastUpdated}` : screen.versions[0]?.date ? ` · ${screen.versions[0].date}` : ""}</p></> : <EmptyValue>Not documented</EmptyValue>}</Section>
      <Section title="COMPONENTS">{componentNames(screen.components).length > 0 ? <div className="flex flex-wrap gap-1.5">{componentNames(screen.components).map(component => <span key={component} className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600">{component}</span>)}</div> : <EmptyValue>Not documented</EmptyValue>}</Section>
      <Section title="VARIANTS & STATES">{variantsAndStates.length > 0 ? <div className="flex flex-wrap gap-1.5">{variantsAndStates.slice(0, 6).map(option => <button key={option.id} className="rounded border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:border-blue-300 hover:text-blue-700">{option.name}</button>)}</div> : <EmptyValue>Not documented</EmptyValue>}</Section>
      <Section title="EVIDENCE"><div className={`mb-3 flex items-center gap-2 text-xs font-semibold ${screen.evidence.status === "Unverified" ? "text-slate-500" : "text-emerald-700"}`}><CheckCircle2 size={14}/>{screen.evidence.status}</div><div className="grid grid-cols-2 gap-x-3"><Row label="Last verified" value={screen.evidence.lastVerified}/><Row label="Verified by" value={screen.evidence.verifiedBy}/></div><Row label="Source" value={screen.evidence.source}/><Row label="Notes" value={screen.evidence.notes}/></Section>
      {changelog && changelog.length > 0 && <Section title="WHAT CHANGED"><ul className="space-y-1.5 text-[11px] leading-4 text-slate-600">{changelog.map(item => <li key={item} className="flex gap-2"><span className="text-slate-300">•</span><span>{item}</span></li>)}</ul></Section>}
    </div>
    <div className="sticky bottom-0 flex gap-2 border-t border-slate-200 bg-white/95 p-3 backdrop-blur"><OpenInFigma screen={canonicalScreen} className="flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-700 px-3 py-2.5 text-xs font-semibold text-white hover:bg-blue-800"/><button onClick={() => { setCopied(true); void copyToClipboard(); }} className="grid size-9 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="Copy Link"><Copy size={14}/></button></div>
    {copied && <div role="status" className="toast-in fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-md bg-slate-950 px-4 py-3 text-xs font-medium text-white shadow-lg"><CheckCircle2 size={15} className="text-emerald-400"/>Đã sao chép liên kết</div>}
  </aside>;
}
