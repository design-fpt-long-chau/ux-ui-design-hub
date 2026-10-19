"use client";
import { useBusinessUnitInventory } from "@/lib/use-business-units";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { LibraryTree } from "@/components/tree/library-tree";
import { screenHref } from "@/lib/design-library";
import { useScreenGroupInventory, useScreenInventory } from "@/lib/repositories/client";
import { ScreenCard } from "./screen-card";

export function CheckoutGallery() {
  const unitName = useBusinessUnitInventory().find(unit => unit.id === "pharmacy")?.name ?? "Unknown Business Unit";
  const [tab, setTab] = useState("screens");
  const childGroups = useScreenGroupInventory().filter((group) => group.parentGroupId === "pharmacy.checkout");
  const checkoutScreens = useScreenInventory().filter((screen) => screen.screenGroupId === "pharmacy.checkout").sort((a, b) => a.sequence - b.sequence);

  return <div className="flex h-screen overflow-hidden bg-[#f7f8fa]">
    <LibraryTree/>
    <main className="page-enter min-w-0 flex-1 overflow-y-auto">
      <div className="library-page">
        <Link href="/screens/pharmacy" className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-blue-700"><ArrowLeft size={14}/> {unitName}</Link>
        <div className="mt-5"><p className="text-xs font-bold tracking-[.16em] text-blue-700">05 · SCREEN GROUP</p><h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-950">Checkout</h1><p className="mt-1.5 text-sm text-slate-500">Quy trình đặt hàng và thanh toán.</p><p className="mt-3 text-xs font-semibold text-slate-400">{checkoutScreens.length} SCREENS</p></div>
        <div className="mt-5 flex gap-5 border-b border-slate-200">{[["screens","Tất cả màn hình"],["flow","Luồng tổng quan"],["notes","Ghi chú & Tài liệu"]].map(([id,label]) => <button key={id} onClick={() => setTab(id)} className={`border-b-2 px-1 pb-2.5 text-[13px] font-semibold transition ${tab === id ? "border-blue-700 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-900"}`}>{label}</button>)}</div>

        {tab === "screens" && <div className="view-transition mt-6 pb-5">
          {childGroups.length > 0 && <nav aria-label="Subgroups" className="mb-5 flex flex-wrap gap-2">{childGroups.map((group) => <Link key={group.id} href={`/screens/pharmacy/${group.slug}`} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-blue-700">{group.name}</Link>)}</nav>}
          <div data-testid="checkout-journey" className="library-card-grid grid grid-cols-2 min-[1100px]:grid-cols-3 min-[1400px]:grid-cols-4 min-[1700px]:grid-cols-5">
            {checkoutScreens.map((screen) => <ScreenCard key={screen.id} screen={screen} inventory unitName={unitName} groupName="Checkout"/>)}
          </div>
        </div>}

        {tab === "flow" && <div className="mt-8 rounded-xl border border-slate-200 bg-white p-8"><p className="text-sm text-slate-500">Checkout overview connects five verified screens in a single linear flow.</p><div className="library-scroll-rail mt-6 flex items-center gap-4 overflow-x-auto">{checkoutScreens.map((screen,index)=>{const pending=screen.status==="coming-soon"||screen.status==="unavailable";const content=<><span className="block text-[10px] text-blue-700">{String(index+1).padStart(2,"0")}</span>{screen.name}{pending&&<span className="mt-1 block text-[9px] text-slate-400">{screen.status==="coming-soon"?"Coming soon":"Unavailable"}</span>}</>;return <div key={screen.id} className="flex items-center gap-3"><Link href={pending?screenHref(screen):`/screens/pharmacy/checkout/${screen.slug}?view=flow`} className={`w-36 rounded-lg border border-slate-200 p-3 text-xs font-semibold hover:border-blue-400 ${pending?"bg-slate-50 text-slate-400":"text-slate-700"}`}>{content}</Link>{index<4&&<ArrowRight size={14} className="text-slate-300"/>}</div>})}</div></div>}
        {tab === "notes" && <div className="mt-8 rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Tài liệu checkout sẽ được liên kết từ Jira và Figma trong phiên bản sau.</div>}
      </div>
    </main>
  </div>;
}
