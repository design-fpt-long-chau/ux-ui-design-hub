"use client";
import { useBusinessUnitInventory } from "@/lib/use-business-units";

import Link from "next/link";
import { BusinessUnitQuickAccess } from "@/components/home/business-unit-quick-access";
import { BusinessUnitCard } from "@/components/home/business-unit-card";
import { ArrowRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useFlowInventory, useScreenGroupInventory, useScreenInventory } from "@/lib/repositories/client";
import { resolveScreenPlatform, screenPlatformHref } from "@/lib/screen-platform";
import { LibraryTree } from "@/components/tree/library-tree";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { ScreenCard } from "@/components/screens/screen-card";

type HomeSort = "latest" | "name";
type HomeScope = "all" | "mobile" | "web";


function updatedAt(screen: ReturnType<typeof useScreenInventory>[number]) {
  const value = screen.lastUpdated ?? screen.versions[0]?.date;
  const timestamp = value ? Date.parse(value) : Number.NaN;
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function HomePage() {
  const businessUnits = useBusinessUnitInventory();
  const screens = useScreenInventory();
  const flows = useFlowInventory();
  const groups = useScreenGroupInventory();
  const [sort, setSort] = useState<HomeSort>("latest");
  const [scope, setScope] = useState<HomeScope>("all");

  const recentScreens = useMemo(() => screens
    .filter((screen) => scope === "all" || (scope === "mobile" ? screen.platforms.some((platform) => platform !== "Web") : screen.platforms.includes("Web")))
    .map((source) => {
      if (scope === "web") return { source, display: { ...resolveScreenPlatform(source, "web"), platforms: ["Web" as const] }, href: screenPlatformHref(source, "web") };
      if (scope === "mobile") return { source, display: { ...resolveScreenPlatform(source, "mobile"), platforms: source.platforms.filter((platform) => platform !== "Web") }, href: screenPlatformHref(source, "mobile") };
      return { source, display: source, href: screenPlatformHref(source, "mobile") };
    })
    .sort((a, b) => sort === "name"
      ? a.display.name.localeCompare(b.display.name, "vi")
      : updatedAt(b.display) - updatedAt(a.display) || Number(Boolean(b.display.preview)) - Number(Boolean(a.display.preview)) || a.display.sequence - b.display.sequence)
    .slice(0, 4), [screens, scope, sort]);


  return <div className="flex min-h-screen bg-[#f7f8fa] text-slate-950">
    <LibraryTree/>
    <main className="home-main page-enter h-screen min-w-0 flex-1 overflow-y-auto">
      <WorkspaceHeader platform={scope} onPlatformChange={setScope}/>

      <section className="border-b border-slate-200 bg-white library-gutter">
        <div className="w-full py-8">
          <p className="text-[10px] font-semibold tracking-[.14em] text-blue-700">INTERNAL DESIGN REFERENCE</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-5">
            <div>
              <h1 className="text-[28px] font-semibold leading-tight tracking-[-.025em] text-slate-950">Long Châu Design Library</h1>
              <p className="mt-2 text-sm text-slate-500">Screens, flows and product patterns across Long Châu.</p>
              <p className="mt-3 text-xs tabular-nums text-slate-400">{screens.length} screens <span aria-hidden className="mx-2">·</span> {flows.length} flows <span aria-hidden className="mx-2">·</span> {businessUnits.length} product areas</p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link href="/screens" className="flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors motion-duration-fast hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-[.99]">Browse screens <ArrowRight aria-hidden size={15}/></Link>
              <Link href="/manage/screens/new" className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors motion-duration-fast hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"><Plus aria-hidden size={15}/> Add screen</Link>
            </div>
          </div>
        </div>
      </section>



      <section className="library-page">
        <BusinessUnitQuickAccess units={businessUnits}/>
        <div className="w-full min-w-0">
        <div className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><h2 className="text-lg font-semibold tracking-tight text-slate-950">{sort === "latest" ? "Recently updated" : "Screens A–Z"}</h2><p className="mt-1 text-xs text-slate-500">{sort === "latest" ? "The latest screens in your library." : "Current library records ordered by screen name."}</p></div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-slate-500"><span className="sr-only">Sort recent screens</span><select value={sort} onChange={(event) => setSort(event.target.value as HomeSort)} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"><option value="latest">Latest</option><option value="name">A–Z</option></select></label>
              <Link href="/screens" className="shrink-0 rounded text-xs font-semibold text-blue-700 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">View all →</Link>
            </div>
          </div>
          <div aria-label="Home library cards" className="home-library-cards library-scroll-rail mt-6 flex w-full flex-nowrap items-stretch justify-start overflow-x-auto pb-3">
            {recentScreens.map(({ source, display, href }) => <div key={source.id} className="home-screen-card"><ScreenCard screen={display} href={href} previewSize="md"/></div>)}
            {businessUnits.map(unit => <BusinessUnitCard key={unit.id} unit={unit} screens={screens} groups={groups} flows={flows}/>)}
          </div>
          {recentScreens.length === 0 && <p className="mt-4 text-xs text-slate-500">No recent screens in this platform scope.</p>}
        </div>
        </div>
      </section>
    </main>
  </div>;
}
