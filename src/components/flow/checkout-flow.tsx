"use client";

import Link from "next/link";
import { ArrowRight, GripVertical, Minus, Plus, Scan } from "lucide-react";
import { useState } from "react";
import { addScreenHref } from "@/lib/add-screen-context";
import { flowOwnerGroupId } from "@/lib/flow-context";
import type { Screen, Flow } from "@/types/design-library";
import type { ScreenPlatform } from "@/types/design-library";
import { resolveScreenPlatform, screenPlatformHref } from "@/lib/screen-platform";
import { ScreenPreview } from "@/components/screens/screen-preview";

import { reorderLocalFlowScreens, useScreenGroupInventory } from "@/lib/repositories/client";
import { flowSections } from "@/lib/flow-sections";

const FIT_ZOOM = 85;

export function CheckoutFlow({ selected, platform, screens, flowName, journey }: { selected: Screen; platform: ScreenPlatform; screens: Screen[]; flowName: string; journey?: Flow }) {
  const [zoom, setZoom] = useState(FIT_ZOOM);
  const [draggedScreenId, setDraggedScreenId] = useState<string>();
  const groups = useScreenGroupInventory();
  const sections = flowSections(screens, groups);
  const hasContext = sections.some((section) => section.context.length > 0);
  const moveScreen = (targetId: string) => { if (!journey || !draggedScreenId || draggedScreenId === targetId) return; const next = journey.screenIds.filter((id) => id !== draggedScreenId); const target = next.indexOf(targetId); if (target < 0) return; next.splice(target, 0, draggedScreenId); reorderLocalFlowScreens(journey.id, next); setDraggedScreenId(undefined); };
  const renderSteps = (steps: { screen: Screen; index: number }[]) => (<div className="mx-auto grid w-full origin-center items-center transition-transform motion-duration-base" style={{ maxWidth: steps.length > 5 ? 1580 : 980, gridTemplateColumns: `repeat(${Math.max(0, steps.length - 1)}, minmax(86px, 1fr) 18px) minmax(86px, 1fr)`, transform: `scale(${zoom / FIT_ZOOM})` }}>
        {steps.map(({screen: canonicalScreen,index}, stepIndex)=>{const screen=resolveScreenPlatform(canonicalScreen,platform);const active=screen.id===selected.id;const disabled=screen.status==="coming-soon"||screen.status==="unavailable";const reorderable=Boolean(journey?.screenIds.includes(canonicalScreen.id));return <div key={screen.id} className="contents">
          <div data-selected={active} draggable={reorderable} onDragStart={reorderable ? event => { event.dataTransfer.effectAllowed = "move"; setDraggedScreenId(canonicalScreen.id); } : undefined} onDragOver={reorderable ? event => { if (draggedScreenId) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; } } : undefined} onDrop={reorderable ? event => { event.preventDefault(); moveScreen(canonicalScreen.id); } : undefined} onDragEnd={() => setDraggedScreenId(undefined)} className={`flow-screen-card relative min-w-0 rounded-lg bg-white p-2 ${draggedScreenId === canonicalScreen.id ? "opacity-50" : disabled?"border border-slate-200 opacity-60 hover:border-blue-300":active?"z-[1] border-2 border-blue-600 shadow-md shadow-blue-200/70":"border border-slate-200 opacity-[.92] hover:border-blue-300 hover:opacity-100"}`}>
            {reorderable&&<span title="Drag to reorder" className="absolute right-1.5 top-1.5 z-20 cursor-grab rounded bg-white/90 p-1 text-slate-400 shadow-sm"><GripVertical aria-hidden size={13}/><span className="sr-only">Drag {screen.name} to reorder</span></span>}
            {active&&<span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-blue-700 px-2.5 py-1 text-[10px] font-bold text-white">Current screen</span>}
            <p className={`mb-2 text-[11px] font-bold ${active?"text-blue-700":"text-slate-400"}`}>{String(index+1).padStart(2,"0")}</p>
            <div className="flow-preview-wrap card-preview relative mx-auto w-full max-w-[128px]">
              <Link scroll={false} href={screenPlatformHref(canonicalScreen,platform,true)} aria-current={active?"page":undefined} aria-label={`${disabled?"View status":"Select"} ${screen.name}`} className="block rounded-[.8rem]"><ScreenPreview size="sm" name={screen.name} preview={screen.preview} status={screen.status} tone={screen.previewTone}/></Link>
              <Link href={screenPlatformHref(canonicalScreen,platform)} aria-label={`${disabled?"View status":"View details"} ${screen.name}`} className="flow-detail-overlay"><span>{disabled?(screen.status==="unavailable"?"Unavailable":"Coming soon"):"View details"}</span></Link>
            </div>
            <Link scroll={false} href={screenPlatformHref(canonicalScreen,platform,true)} className={`mt-2 block min-h-8 rounded text-[11px] font-semibold leading-4 hover:text-blue-700 ${disabled?"text-slate-500":"text-slate-800"}`}><span className="line-clamp-2 break-words" title={screen.name}>{screen.name}</span>{disabled&&<span className="mt-1 block text-[9px] font-medium text-slate-400">{screen.status==="coming-soon"?"Coming soon":"Unavailable"}</span>}</Link>
          </div>
          {stepIndex<steps.length-1&&<div className="flex items-center justify-center"><span className="h-px flex-1 bg-slate-300"/><ArrowRight size={15} className="-ml-0.5 shrink-0 text-slate-400"/></div>}
        </div>})}
      </div>);
  return <div className="view-transition flex min-h-full flex-col bg-slate-100/70 library-page">
    <div className="library-toolbar mx-auto w-full max-w-[1240px]">
      <div><p className="text-xs font-bold tracking-[.16em] text-blue-700">{flowName.toLocaleUpperCase("vi")} · FLOW</p><h2 className="mt-1.5 text-lg font-semibold text-slate-950">Full Flow {flowName}</h2><p className="mt-1 text-xs text-slate-500">Select a screen to view its context.</p></div>
      <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white p-1 text-xs text-slate-600 shadow-sm"><button aria-label="Zoom out" onClick={()=>setZoom(value=>Math.max(55,value-10))} className="grid size-7 place-items-center rounded hover:bg-slate-100"><Minus size={14}/></button><span className="w-10 text-center font-semibold">{zoom}%</span><button aria-label="Zoom in" onClick={()=>setZoom(value=>Math.min(105,value+10))} className="grid size-7 place-items-center rounded hover:bg-slate-100"><Plus size={14}/></button><span className="mx-1 h-4 w-px bg-slate-200"/><button onClick={()=>setZoom(FIT_ZOOM)} className="flex items-center gap-1.5 rounded px-2 py-1.5 hover:bg-slate-100"><Scan size={13}/> Fit to screen</button></div>
    </div>
    <div className="flex min-h-[520px] flex-1 items-center overflow-x-auto py-5">
      {hasContext ? <div className="mx-auto w-full max-w-[1240px] space-y-6">
        {sections.map((section) => <section key={section.steps[0].index} aria-label={section.context.length ? section.context.map((group) => group.name).join(" › ") : undefined} className={section.context.length ? "rounded-lg border border-slate-200 bg-white/40 px-4 pb-5 pt-3" : "py-5"}>
          {section.context.length > 0 && <header className="mb-6 flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500">{section.context.map((group, index) => <span key={group.id} className="flex items-center gap-1.5">{index > 0 && <span aria-hidden="true" className="text-slate-300">›</span>}{group.name}</span>)}</header>}
          {renderSteps(section.steps)}
        </section>)}
      </div> : renderSteps(screens.map((screen, index) => ({screen, index})))}

      {journey && <Link href={addScreenHref({ businessUnitId: journey.businessUnitId, screenGroupId: flowOwnerGroupId(journey), flowId: journey.id })} className="ml-5 flex min-h-32 w-36 shrink-0 items-center justify-center gap-2 rounded-lg border border-dashed border-blue-300 bg-white p-4 text-center text-xs font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><Plus aria-hidden size={16}/> Add more screens</Link>}
    </div>
  </div>;
}
