"use client";
import { useBusinessUnitInventory } from "@/lib/use-business-units";
import { FieldError } from "@/components/ui/field-error";

import { Check, ChevronDown, GitBranch } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { flowLocation, matchesFlowSearch, orderedFlows } from "@/lib/flow-context";
import type { Flow, ScreenGroup } from "@/types/design-library";

export function FlowCombobox({ flows, groups, value, onChange, error }: { flows: Flow[]; groups: ScreenGroup[]; value?: string; onChange: (flowId: string) => void; error?: string }) {
  const businessUnits = useBusinessUnitInventory();
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const selected = flows.find((flow) => flow.id === value);
  const filtered = orderedFlows(flows).filter((flow) => matchesFlowSearch(flow, query, businessUnits, groups));

  useEffect(() => {
    const close = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) { setOpen(false); setQuery(""); } };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const choose = (flow: Flow) => { onChange(flow.id); setOpen(false); setQuery(""); };
  const openList = () => { setOpen(true); setActiveIndex(Math.max(0, filtered.findIndex((flow) => flow.id === value))); };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") { setOpen(false); setQuery(""); return; }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) return openList();
      setActiveIndex((current) => Math.max(0, Math.min(filtered.length - 1, current + (event.key === "ArrowDown" ? 1 : -1))));
    }
    if (event.key === "Enter" && open && filtered[activeIndex]) { event.preventDefault(); choose(filtered[activeIndex]); }
  };

  return <div ref={rootRef} className="relative">
    <label htmlFor={`${listId}-input`} className="text-xs font-medium text-slate-600">Flow *</label>
    <div data-invalid={Boolean(error)} className="form-control-frame form-control-trailing relative mt-2 flex items-center bg-white pl-3 pr-10">
      <input id={`${listId}-input`} role="combobox" aria-label="Flow *" aria-expanded={open} aria-controls={open ? listId : undefined} aria-autocomplete="list" aria-invalid={Boolean(error)} value={open ? query : selected?.name ?? ""} placeholder="Select an existing flow" onFocus={() => { setQuery(""); openList(); }} onChange={(event) => { setQuery(event.target.value); setOpen(true); setActiveIndex(0); }} onKeyDown={handleKeyDown} className="w-full min-w-0 bg-transparent text-sm text-slate-900"/>
      <button type="button" aria-label="Toggle Flow options" onClick={() => { if (open) { setOpen(false); setQuery(""); } else openList(); }} className="absolute inset-y-0 right-0 grid w-10 place-items-center text-slate-400"><ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`}/></button>
    </div>
    <FieldError>{error}</FieldError>
    {open && <div className="motion-popover absolute z-50 mt-1.5 max-h-72 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl" id={listId} role="listbox" aria-label="Existing flows">
      {filtered.map((flow, index) => { const location = flowLocation(flow, businessUnits, groups); return <button key={flow.id} type="button" role="option" aria-selected={flow.id === value} aria-label={`${flow.name}, ${location.unitName}, ${location.sectionName}`} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(flow)} className={`flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left ${index === activeIndex ? "bg-blue-50" : "hover:bg-slate-50"}`}><GitBranch aria-hidden size={14} className="mt-0.5 shrink-0 text-blue-500"/><span className="min-w-0 flex-1"><strong className="block truncate text-xs font-semibold text-slate-800" title={flow.name}>{flow.name}</strong><small className="mt-0.5 block truncate text-[10px] text-slate-500" title={`${location.unitName} · ${location.sectionName}`}>{location.unitName} · {location.sectionName}</small></span>{flow.id === value && <Check aria-hidden size={14} className="mt-0.5 shrink-0 text-blue-700"/>}</button>; })}
      {filtered.length === 0 && <p className="px-3 py-5 text-center text-xs text-slate-500">No flows match your search.</p>}
    </div>}
  </div>;
}
