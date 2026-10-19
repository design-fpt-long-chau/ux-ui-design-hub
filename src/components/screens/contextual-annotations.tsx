"use client";

import { ExternalLink, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ContextualAnnotation } from "@/types/design-library";

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return <div><p className="text-[9px] font-semibold uppercase tracking-[.1em] text-slate-400">{label}</p><p className="mt-1 text-[11px] leading-4 text-slate-600">{value}</p></div>;
}

export function ContextualAnnotations({ annotations, visible = true, platform = "mobile" }: { annotations: ContextualAnnotation[]; visible?: boolean; platform?: "mobile" | "web" }) {
  const [activeId, setActiveId] = useState<string>();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setActiveId(undefined); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setActiveId(undefined); };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", closeOnEscape); };
  }, []);

  if (!visible || annotations.length === 0) return null;

  return <div ref={rootRef} className={`annotation-layer ${platform === "web" ? "is-web" : ""}`} aria-label="Contextual annotations">
    {annotations.map(annotation => {
      const selected = annotation.id === activeId;
      const horizontal = annotation.x > 58 ? "left" : "right";
      const vertical = annotation.y > 72 ? "above" : annotation.y < 25 ? "below" : "center";
      return <div key={annotation.id} className="annotation-anchor" style={{ left: `${annotation.x}%`, top: `${annotation.y}%` }}>
        <button type="button" aria-label={`${annotation.type} annotation: ${annotation.title}`} aria-expanded={selected} onClick={() => setActiveId(selected ? undefined : annotation.id)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setActiveId(selected ? undefined : annotation.id); } }} className={`annotation-pin ${selected ? "is-active" : ""}`}>
          <span className="annotation-pin-core"/>
          <span role="tooltip" className="annotation-tooltip"><small>{annotation.type}</small><strong>{annotation.title}</strong></span>
        </button>
        <div hidden={!selected} inert={!selected} role="dialog" aria-label={annotation.title} className={`motion-popover annotation-popover is-${horizontal} is-${vertical}`}>
          <div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-semibold uppercase tracking-[.12em] text-blue-700">{annotation.type}{annotation.isDemo ? " · Demo" : ""}</p><h3 className="mt-1 text-sm font-semibold text-slate-950">{annotation.title}</h3></div><button type="button" onClick={() => setActiveId(undefined)} aria-label="Close annotation" className="grid size-6 shrink-0 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={13}/></button></div>
          <p className="mt-2 text-[11px] leading-[17px] text-slate-600">{annotation.description}</p>
          <div className="mt-3 space-y-2.5 border-t border-slate-100 pt-3"><DetailRow label="Trigger" value={annotation.trigger}/><DetailRow label="Behavior" value={annotation.behavior}/><DetailRow label="Do" value={annotation.do}/><DetailRow label="Don't" value={annotation.dont}/><DetailRow label="Component" value={annotation.component}/></div>
          {(annotation.jira || annotation.figma) && <div className="mt-3 flex gap-3 border-t border-slate-100 pt-2.5 text-[10px] font-medium text-blue-700">{annotation.jira && <span>{annotation.jira}</span>}{annotation.figma && <a href={annotation.figma} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">Figma <ExternalLink size={10}/></a>}</div>}
        </div>
      </div>;
    })}
  </div>;
}
