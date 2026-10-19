"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { FieldError } from "@/components/ui/field-error";
import { createLocalFlowInGroup } from "@/lib/repositories/client";
import { storageErrorMessage } from "@/lib/storage-errors";
import type { Flow, ScreenGroup } from "@/types/design-library";

export function FlowCreateForm({ group, compact = false, onCancel, onCreated }: { group: ScreenGroup; flows: Flow[]; compact?: boolean; onCancel: () => void; onCreated?: (flow: Flow) => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  const save = () => {
    try {
      const flow = createLocalFlowInGroup(group.id, name);
      setError("");
      onCreated?.(flow);
    } catch (cause) { setError(storageErrorMessage(cause)); }
  };
  return <div className={compact ? "relative py-1" : "rounded-lg border border-blue-200 bg-blue-50/40 p-3"}>
    {!compact && <p className="mb-2 text-xs font-semibold text-slate-800">New flow in {group.name}</p>}
    <div className="flex items-center gap-2">
      <input ref={input} aria-label={`New flow in ${group.name}`} aria-invalid={Boolean(error)} value={name} placeholder="Flow name" onChange={(event) => { setName(event.target.value); setError(""); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); save(); } if (event.key === "Escape") { event.preventDefault(); onCancel(); } }} className="h-9 min-w-0 flex-1 rounded-md border border-blue-300 bg-white px-3 text-xs text-slate-900 outline-none focus:border-blue-500"/>
      <button type="button" aria-label="Save new flow" onClick={save} className="grid size-8 shrink-0 place-items-center rounded-md bg-blue-700 text-white"><Check size={14}/></button>
      <button type="button" aria-label="Cancel flow creation" onClick={onCancel} className="grid size-8 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-white"><X size={14}/></button>
    </div>
    <FieldError>{error}</FieldError>
    {!compact && <p className="mt-2 text-[10px] text-slate-500">Nothing is created until you save the name.</p>}
  </div>;
}
