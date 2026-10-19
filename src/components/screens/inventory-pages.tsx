"use client";
import { useBusinessUnitInventory } from "@/lib/use-business-units";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useFlowInventory, useScreenGroupInventory, useScreenInventory } from "@/lib/repositories/client";
import { LibraryTree } from "@/components/tree/library-tree";
import { ScreenCard } from "@/components/screens/screen-card";
import { groupParent } from "@/lib/screen-groups";
import { screenHref } from "@/lib/design-library";
import { addScreenHref } from "@/lib/add-screen-context";
import { activeTreeGroups, screensInGroup } from "@/lib/flow-context";

export function BusinessUnitOverview({ unitSlug }: { unitSlug: string }) {
  const businessUnits = useBusinessUnitInventory();
  const inventory = useScreenInventory();
  const screenGroups = useScreenGroupInventory();
  const flows = useFlowInventory();
  const unit = businessUnits.find((item) => item.slug === unitSlug);
  if (!unit) return <div className="p-8 text-sm text-slate-500">Product area not found.</div>;
  const groups = activeTreeGroups(screenGroups, flows).filter((group) => (group.businessUnitId ?? group.id.split(".")[0]) === unit.id);
  const unitScreens = inventory.filter((screen) => screen.businessUnitId === unit.id);
  return <div className="flex h-screen overflow-hidden bg-[#f7f8fa]"><LibraryTree/><main className="min-w-0 flex-1 overflow-y-auto"><div className="library-page"><Link href="/screens" className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-blue-700"><ArrowLeft size={14}/> All Screens</Link><div className="mt-5"><p className="text-[11px] font-bold tracking-[.14em] text-blue-700">PRODUCT AREA</p><h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-950">{unit.name}</h1><p className="mt-1.5 text-sm text-slate-500">{unit.description}</p><p className="mt-3 text-xs text-slate-400">{unitScreens.length} screens · {groups.length} groups</p></div><section className="mt-8"><h2 className="text-lg font-semibold text-slate-950">Screen Groups</h2><div className="mt-4 library-card-grid grid md:grid-cols-2 xl:grid-cols-3">{groups.map((group) => { const count = screensInGroup(group, flows, inventory).length; return <Link key={group.id} href={`/screens/${unit.slug}/${group.slug}`} className="interactive-card group rounded-lg border border-slate-200 bg-white p-4 hover:border-blue-300"><div className="flex items-center justify-between gap-4"><div><h3 className="text-sm font-semibold text-slate-950 group-hover:text-blue-700">{group.name}</h3><p className="mt-1 text-[11px] text-slate-500">{count} screens</p></div><ArrowRight size={15} className="text-slate-400 group-hover:text-blue-700"/></div></Link>; })}</div></section><section className="mt-10 border-t border-slate-200 pt-7"><h2 className="text-lg font-semibold text-slate-950">All Screens</h2><div className="mt-4 library-card-grid grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4">{unitScreens.map((screen) => <ScreenCard key={screen.id} screen={screen}/>)}</div>{unitScreens.length === 0 && <p className="mt-4 text-sm text-slate-400">No screens published yet.</p>}</section></div></main></div>;
}

export function ScreenGroupGallery({ unitSlug, groupSlug }: { unitSlug: string; groupSlug: string }) {
  const businessUnits = useBusinessUnitInventory();
  const flows = useFlowInventory();
  const inventory = useScreenInventory();
  const screenGroups = useScreenGroupInventory();
  const unit = businessUnits.find((item) => item.slug === unitSlug);
  const group = screenGroups.find((item) => item.slug === (unitSlug === "pharmacy" && groupSlug === "app-entry" ? "login" : groupSlug) && (item.businessUnitId ?? item.id.split(".")[0]) === unit?.id);
  if (!unit || !group) return <div className="p-8 text-sm text-slate-500">Screen group not found.</div>;
  const groupScreens = screensInGroup(group, flows, inventory);
  const parent = groupParent(group, screenGroups);
  const children = activeTreeGroups(screenGroups, flows).filter((item) => groupParent(item, screenGroups)?.id === group.id);
  return <div className="flex h-screen overflow-hidden bg-[#f7f8fa]">
    <LibraryTree/>
    <main className="min-w-0 flex-1 overflow-y-auto">
      <div className="library-page">
        <Link href={`/screens/${unit.slug}`} className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-blue-700"><ArrowLeft size={14}/> {unit.name}</Link>
        <p className="mt-5 text-[11px] font-bold tracking-[.14em] text-blue-700">SCREEN GROUP</p>
        {parent && <Link href={`/screens/${unit.slug}/${parent.slug}`} className="mt-2 inline-block text-xs text-blue-700">{parent.name}</Link>}
        <h1 className="mt-1.5 break-words text-3xl font-semibold tracking-tight text-slate-950">{group.name}</h1>
        {group.description && <p className="mt-1.5 break-words text-sm text-slate-500">{group.description}</p>}
        <p className="mt-3 text-xs text-slate-500">{groupScreens.length} screens</p>
        {children.length > 0 && <nav aria-label="Subgroups" className="mt-5 flex flex-wrap gap-2">{children.map((child) => <Link key={child.id} href={`/screens/${unit.slug}/${child.slug}`} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-blue-700">{child.name}</Link>)}</nav>}
        <div aria-label={`${group.name} screens`} className="mt-6 library-card-grid grid grid-cols-2 min-[1100px]:grid-cols-3 min-[1400px]:grid-cols-4 min-[1700px]:grid-cols-5">
          {groupScreens.map((screen) => <ScreenCard key={screen.id} screen={screen} inventory unitName={unit.name} groupName={group.name} href={screenHref(screen)}/>)}
        </div>
        {groupScreens.length === 0 && children.length === 0 && <div className="mt-6"><p className="text-sm text-slate-500">No screens in this group yet.</p><Link href={addScreenHref({ businessUnitId: unit.id, screenGroupId: group.id })} className="mt-3 inline-flex rounded-md bg-blue-700 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-blue-800">+ Add screen</Link></div>}
      </div>
    </main>
  </div>;
}
