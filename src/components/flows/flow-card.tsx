"use client";

import Link from "next/link";
import { ArrowRight, GitBranch, Pencil, Trash2 } from "lucide-react";
import type { Flow } from "@/types/design-library";
import type { ReactNode } from "react";

export function FlowCard({ flow, context, onEdit, onDelete, nameEditor }: {
  nameEditor?: ReactNode;
  flow: Flow;
  context: string;
  onEdit: (flow: Flow) => void;
  onDelete: (flow: Flow) => void;
}) {
  const coming = flow.status !== "active";
  return <article className="flow-card group relative min-w-0 rounded-lg border border-slate-200 bg-white library-card-padding transition-colors hover:border-blue-300 focus-within:border-blue-300">
    <Link href={`/flows/${flow.slug}`} className="absolute inset-0 rounded-lg" aria-label={`Open flow ${flow.name}`}/>
    <div className="flex min-h-9 items-start justify-between gap-3">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <div className="grid size-9 shrink-0 place-items-center rounded-md bg-blue-50 text-blue-700"><GitBranch aria-hidden size={17}/></div>
        {coming && <span className="rounded bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-500">{flow.status === "coming-soon" ? "Coming soon" : "Unavailable"}</span>}
      </div>
      <div className="flow-card-actions relative z-10 flex shrink-0 items-center gap-1">
        <button type="button" aria-label={`Edit ${flow.name}`} title="Edit flow" onClick={event => { event.preventDefault(); event.stopPropagation(); onEdit(flow); }} className="flow-card-edit grid size-8 place-items-center rounded-md text-slate-400 hover:bg-blue-50 hover:text-blue-700 focus-visible:bg-blue-50 focus-visible:text-blue-700"><Pencil aria-hidden size={14}/></button>
        <button type="button" aria-label={`Delete ${flow.name}`} title="Delete flow" onClick={event => { event.preventDefault(); event.stopPropagation(); onDelete(flow); }} className="flow-card-delete grid size-8 place-items-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 focus-visible:bg-red-50 focus-visible:text-red-600"><Trash2 aria-hidden size={14}/></button>
      </div>
    </div>
    {nameEditor ? <div className="relative z-10 mt-4">{nameEditor}</div> : <h2 className="mt-4 break-words text-base font-semibold text-slate-950 group-hover:text-blue-700">{flow.name}</h2>}
    <p className="mt-1 break-words text-xs leading-5 text-slate-500">{flow.description}</p>
    <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-100 pt-3 text-[10px] text-slate-400">
      <span className="min-w-0 break-words">{context}</span>
      <span className="flex shrink-0 items-center gap-1 font-semibold text-blue-700">{coming ? "View status" : "Open flow"}<ArrowRight aria-hidden size={12}/></span>
    </div>
  </article>;
}
