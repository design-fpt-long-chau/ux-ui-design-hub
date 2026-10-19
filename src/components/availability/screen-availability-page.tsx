"use client";
import { useBusinessUnitInventory } from "@/lib/use-business-units";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { LibraryTree } from "@/components/tree/library-tree";
import { ComingSoonView } from "@/components/availability/coming-soon-view";
import { getGroup } from "@/lib/design-library";
import type { Screen } from "@/types/design-library";

export function ScreenAvailabilityPage({ screen }: { screen: Screen }) {
  const businessUnits = useBusinessUnitInventory();
  const unit=businessUnits.find(unit => unit.id === screen.businessUnitId); const group=getGroup(screen.screenGroupId); const status=screen.status === "unavailable" ? "unavailable" : "coming-soon";
  return <div className="flex h-screen overflow-hidden bg-[#f7f8fa]"><LibraryTree selectedScreenId={screen.id}/><section className="flex min-w-0 flex-1 flex-col"><header className="border-b border-slate-200 bg-white px-6 py-5"><nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[11px] text-slate-400"><Link href="/screens" className="hover:text-blue-700">Long Châu</Link><ChevronRight size={11}/><span>{unit?.name}</span><ChevronRight size={11}/><span>{group?.name}</span><ChevronRight size={11}/><span className="text-slate-600">{screen.name}</span></nav></header><main className="min-h-0 flex-1 overflow-y-auto"><ComingSoonView type="screen" itemName={screen.name} status={status} browseHref="/screens"/></main></section></div>;
}
