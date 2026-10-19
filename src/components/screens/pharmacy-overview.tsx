"use client";
import { useBusinessUnitInventory } from "@/lib/use-business-units";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Smartphone } from "lucide-react";
import { LibraryTree } from "@/components/tree/library-tree";
import { activeTreeGroups } from "@/lib/flow-context";
import { useScreenInventory, useScreenGroupInventory, useFlowInventory } from "@/lib/repositories/client";
import { ScreenCard } from "./screen-card";
import { ScreenPreview } from "./screen-preview";
import { resolveScreenPreview } from "@/lib/screen-platform";

export function PharmacyOverview() {
  const unitName = useBusinessUnitInventory().find(unit => unit.id === "pharmacy")?.name ?? "Unknown Business Unit";
  const pharmacyGroups = activeTreeGroups(useScreenGroupInventory(), useFlowInventory()).filter(group => (group.businessUnitId ?? group.id.split(".")[0]) === "pharmacy");
  const pharmacyScreens = useScreenInventory().filter((screen) => screen.businessUnitId === "pharmacy");
  return <div className="flex h-screen overflow-hidden bg-[#f7f8fa]">
    <LibraryTree/>
    <main className="page-enter min-w-0 flex-1 overflow-y-auto">
      <div className="library-page">
        <Link href="/screens" className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-blue-700"><ArrowLeft size={14}/> All Screens</Link>
        <div className="mt-5 flex items-end justify-between">
          <div><p className="text-xs font-bold tracking-[.16em] text-blue-700">PRODUCT AREA</p><h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-950">{unitName}</h1><p className="mt-1.5 text-sm text-slate-500">Design inventory for Pharmacy experiences.</p></div>
          <div className="flex gap-6 border-l border-slate-200 pl-6 text-sm"><div><strong className="text-lg font-semibold text-slate-950">{pharmacyScreens.length}</strong><p className="text-[11px] text-slate-500">Screens</p></div><div><strong className="text-lg font-semibold text-slate-950">{pharmacyGroups.length}</strong><p className="text-[11px] text-slate-500">Groups</p></div><div><strong className="flex items-center gap-1.5 text-lg font-semibold text-slate-950"><Smartphone size={16}/> 3</strong><p className="text-[11px] text-slate-500">Platforms</p></div></div>
        </div>

        <section className="mt-8">
          <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-slate-950">Screen Groups</h2><p className="text-xs text-slate-500">Organized by product journey</p></div>
          <div data-testid="pharmacy-groups" className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-3">
            {pharmacyGroups.map((group) => {
              const groupScreens = pharmacyScreens.filter((screen) => screen.screenGroupId === group.id);
              return <Link href={`/screens/pharmacy/${group.slug}`} key={group.id} className="interactive-card group flex min-h-[164px] flex-col rounded-lg border border-slate-200 bg-white p-3 hover:border-blue-300">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-bold text-slate-400">{String(group.sequence).padStart(2,"0")}</p><h3 className="mt-0.5 truncate text-sm font-semibold text-slate-950 group-hover:text-blue-700">{group.name}</h3><p className="mt-0.5 text-[11px] text-slate-500">{groupScreens.length} screens</p></div><ArrowRight className="mt-4 shrink-0 text-slate-400 transition-transform motion-duration-fast group-hover:translate-x-1 group-hover:text-blue-700" size={16}/></div>
                <div className="mt-2.5 flex h-[100px] items-start overflow-hidden rounded-md border border-slate-200 bg-slate-50 px-3 pt-2">
                  {groupScreens.slice(0,5).map((screen,index) => <div key={screen.id} className={`card-preview w-11 shrink-0 ${index > 0 ? "-ml-1.5" : ""}`} style={{ zIndex: index + 1 }}><ScreenPreview size="xs" name={screen.name} preview={resolveScreenPreview(screen, "mobile")} status={screen.status} tone={screen.previewTone}/></div>)}
                </div>
              </Link>;
            })}
          </div>
        </section>

        <section className="mt-12 border-t border-slate-200 pt-8"><h2 className="text-lg font-semibold text-slate-950">All Screens</h2><div className="mt-4 grid grid-cols-3 gap-x-4 gap-y-8 xl:grid-cols-4">{pharmacyScreens.map((screen) => <ScreenCard key={screen.id} screen={screen}/>)}</div></section>
      </div>
    </main>
  </div>;
}
