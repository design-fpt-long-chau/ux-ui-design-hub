"use client";

import Link from "next/link";
import { ArrowLeft, Clock3, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import type { AvailabilityStatus } from "@/types/design-library";

export function ComingSoonView({ type, itemName, status = "coming-soon", browseHref }: { type: "screen" | "flow" | "product"; itemName: string; status?: Exclude<AvailabilityStatus,"active">; browseHref: string }) {
  const router = useRouter();
  const unavailable = status === "unavailable";
  const description = unavailable ? "Nội dung này hiện tạm thời không khả dụng trong Design Library." : type === "flow" ? "Luồng này đang được cập nhật trong Design Library." : type === "screen" ? "Màn hình này đang được cập nhật trong Design Library." : "Nội dung này đang được cập nhật trong Design Library.";
  const Icon = unavailable ? EyeOff : Clock3;
  return <div className="mx-auto flex min-h-80 max-w-xl items-center justify-center px-6 py-12 text-center">
    <div><div className="mx-auto grid size-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm"><Icon size={18}/></div><p className="mt-5 text-[11px] font-bold uppercase tracking-[.16em] text-blue-700">{unavailable ? "Unavailable" : "Coming soon"}</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{itemName}</h1><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p><div className="mt-6 flex flex-wrap items-center justify-center gap-2"><button type="button" onClick={()=>router.back()} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"><ArrowLeft size={14}/> Quay lại</button><Link href={browseHref} className="rounded-md bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-800">{type === "flow" ? "Xem các luồng khả dụng" : "Xem các màn hình khả dụng"}</Link></div></div>
  </div>;
}
