"use client";
import { useBusinessUnitInventory } from "@/lib/use-business-units";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Screen } from "@/types/design-library";
import { getGroup, screenHref } from "@/lib/design-library";
import { ScreenPreview, type ScreenPreviewSize } from "./screen-preview";
import { resolveScreenPreview } from "@/lib/screen-platform";
import { BusinessUnitTag } from "./business-unit-tag";

export function ScreenCard({ screen, large = false, previewSize = "lg", dark = false, href, inventory = false, unitName, groupName }: { screen: Screen; large?: boolean; previewSize?: ScreenPreviewSize; dark?: boolean; href?: string; inventory?: boolean; unitName?: string; groupName?: string }) {
  const businessUnits = useBusinessUnitInventory();
  const group = getGroup(screen.screenGroupId);
  const unit = businessUnits.find(unit => unit.id === screen.businessUnitId);
  const disabled = screen.status === "coming-soon" || screen.status === "unavailable";
  const hasMobile = screen.platforms.some((platform) => platform !== "Web");
  const hasWeb = screen.platforms.includes("Web");
  const platformLabel = hasMobile && hasWeb ? "Mobile + Web" : hasWeb ? "Web" : "Mobile";
  const content = <>
      <div className={`overflow-hidden rounded-lg ring-inset transition ${dark ? "bg-white/[.018] ring-1 ring-white/[.08] group-hover:ring-blue-500/50" : "bg-slate-100/60 ring-1 ring-slate-200 group-hover:ring-blue-300"} ${large ? "p-2.5" : "p-1.5"}`}>
        <div className="card-preview"><ScreenPreview name={screen.name} preview={resolveScreenPreview(screen, screen.platforms.some((platform) => platform !== "Web") ? "mobile" : "web")} status={screen.status} tone={screen.previewTone} size={previewSize} /></div>
      </div>
      <div className={`mt-2 flex items-start justify-between gap-2 px-0.5 ${inventory ? "min-h-[72px]" : ""}`}>
        <div className="min-w-0 flex-1"><div className="mb-1.5 h-5"><BusinessUnitTag businessUnitId={screen.businessUnitId} dark={dark}/></div>{inventory ? <><h3 title={screen.name} className={`line-clamp-2 text-[13px] font-semibold leading-[1.35] ${dark ? "text-slate-100 group-hover:text-blue-300" : "text-slate-950 group-hover:text-blue-700"}`}>{screen.name}</h3><p className="mt-1 truncate text-[10px] text-slate-500">{unitName ?? unit?.name} · {groupName ?? group?.name}</p><div className="mt-1.5 flex items-center gap-1.5"><span className={`text-[9px] font-medium ${dark ? "text-slate-400" : "text-slate-500"}`}>{platformLabel}</span>{disabled && <span className={`rounded px-1.5 py-0.5 text-[8px] font-semibold ${screen.status === "coming-soon" ? "bg-amber-50 text-amber-700" : "bg-slate-200 text-slate-600"}`}>{screen.status === "coming-soon" ? "Coming soon" : "Unavailable"}</span>}</div></> : <><p className={`mb-1 text-[10px] font-medium ${dark ? "text-slate-500" : "text-slate-400"}`}>{screen.platforms[0]}</p><h3 className={`truncate text-[13px] font-semibold ${dark ? "text-slate-100 group-hover:text-blue-300" : "text-slate-950 group-hover:text-blue-700"}`}>{screen.name}</h3>{disabled && <span className={`mt-1 inline-flex text-[9px] font-medium ${dark ? "text-slate-500" : "text-slate-400"}`}>{screen.status === "coming-soon" ? "Coming soon" : "Unavailable"}</span>}<p className="mt-0.5 truncate text-[11px] text-slate-500">{unit?.name} · {group?.name}</p></>}</div>
        {!disabled && <ArrowUpRight className="mt-1 translate-y-1 text-slate-400 opacity-0 transition group-hover:translate-y-0 group-hover:text-blue-700 group-hover:opacity-100" size={16}/>} 
      </div>
    </>;
  return <Link href={href ?? screenHref(screen)} aria-label={`Open ${screen.name} Screen Detail`} className="interactive-card group block min-w-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">{content}</Link>;
}
