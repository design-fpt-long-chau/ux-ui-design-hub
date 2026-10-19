"use client";
import { useBusinessUnitInventory } from "@/lib/use-business-units";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ComingSoonView } from "@/components/availability/coming-soon-view";
import { LibraryTree } from "@/components/tree/library-tree";
import { screenHref } from "@/lib/design-library";
import { addScreenHref } from "@/lib/add-screen-context";
import { groupLabel } from "@/lib/screen-groups";
import { screensForFlow, flowOwnerGroupId, resolveFlowSlug } from "@/lib/flow-context";
import { useFlowInventory, useScreenGroupInventory, useScreenInventory } from "@/lib/repositories/client";

export function DynamicFlowDetail({ slug }: { slug: string }) {
  const businessUnits = useBusinessUnitInventory();
  const router = useRouter();
  const flows = useFlowInventory();
  const screens = useScreenInventory();
  const groups = useScreenGroupInventory();
  const flow = resolveFlowSlug(slug, flows);
  const flowScreens = flow ? screensForFlow(flow, screens) : [];
  const firstScreen = flowScreens[0];
  const parent = flow ? groups.find((group) => group.id === flowOwnerGroupId(flow)) : undefined;
  const unit = flow ? businessUnits.find((item) => item.id === flow.businessUnitId) : undefined;

  useEffect(() => { if (flow?.status === "active" && firstScreen) router.replace(`${screenHref(firstScreen)}?view=flow`); }, [firstScreen, flow, router]);

  if (!flow) return <div className="grid h-screen place-items-center bg-[#f7f8fa] text-sm text-slate-500">Flow not found. <Link href="/flows" className="ml-1 font-semibold text-blue-700">Back to Flows</Link></div>;
  if (flow.status === "active" && firstScreen) return <div className="grid h-screen place-items-center bg-[#f7f8fa] text-sm text-slate-500">Opening {flow.name}…</div>;
  if (flow.status === "active" && parent) return <div className="flex h-screen overflow-hidden bg-[#f7f8fa]"><LibraryTree/><section className="min-w-0 flex-1 overflow-y-auto"><header className="border-b border-slate-200 bg-white library-gutter py-4"><div className="flex items-center gap-3"><Link href="/flows" className="text-xs font-semibold text-blue-700">← Flows</Link></div><p className="mt-5 text-[11px] font-bold tracking-[.14em] text-blue-700">FLOW</p><h1 className="mt-1.5 text-2xl font-semibold text-slate-950">{flow.name}</h1><p className="mt-1 text-xs text-slate-500">{unit?.name} · {groupLabel(parent, groups)}</p><p className="mt-2 text-sm text-slate-500">{flow.description}</p></header><main className="library-page"><div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center"><p className="text-sm font-medium text-slate-700">No screens in this flow yet.</p><p className="mt-1 text-xs text-slate-500">Add the first canonical Screen to start this journey.</p><Link href={addScreenHref({ businessUnitId: flow.businessUnitId, screenGroupId: parent.id, flowId: flow.id })} className="mt-5 inline-flex rounded-md bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-800">+ Add screen</Link></div></main></section></div>;
  return <div className="flex h-screen overflow-hidden bg-[#f7f8fa]"><LibraryTree/><section className="min-w-0 flex-1 overflow-y-auto"><header className="border-b border-slate-200 bg-white library-gutter py-4"><div className="flex items-center gap-3"><Link href="/flows" className="text-xs font-semibold text-blue-700">← Flows</Link></div><h1 className="mt-2 text-xl font-semibold text-slate-950">{flow.name}</h1><p className="mt-1 text-xs text-slate-500">{flow.description}</p></header><ComingSoonView type="flow" itemName={flow.name} status={flow.status === "unavailable" ? "unavailable" : "coming-soon"} browseHref="/flows"/></section></div>;
}
