"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, ImageOff, Pause, Play } from "lucide-react";
import type { BusinessUnit, Flow, Screen, ScreenGroup } from "@/types/design-library";
import { businessUnitHighlights, nextHighlight } from "@/lib/business-unit-highlights";
import { ScreenPreview } from "@/components/screens/screen-preview";

export function HighlightCarousel({ items, label, comingSoon }: { items: ReturnType<typeof businessUnitHighlights>["previews"]; label: string; comingSoon: boolean }) {
  const [index, setIndex] = useState(0);
  const [advance, setAdvance] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const pointer = useRef<{ id: number; x: number } | null>(null);
  const dragged = useRef(false);
  const resumeAt = useRef(0);
  const lastStepAt = useRef(0);
  const current = Math.min(index, Math.max(0, items.length - 1));
  const looping = items.length > 1 && !reduced;
  const move = (direction: number) => { resumeAt.current = Date.now() + 4000; if (!advance) { if (reduced) setIndex(nextHighlight(current, items.length, direction)); else setAdvance(direction); } };
  const visibleItems = looping ? Array.from({ length: 7 }, (_, slot) => ({ item: items[nextHighlight(current, items.length, slot - 1)], slot })) : items.map((item, slot) => ({ item, slot }));
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { setReduced(media.matches); if (media.matches) setAdvance(0); }; update();
    media.addEventListener("change", update); return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!looping || hovered || focused || paused || dragging || reduced || advance) return;
    const timer = setTimeout(() => { lastStepAt.current = Date.now(); setAdvance(1); }, Math.max(0, (lastStepAt.current || Date.now()) + 3000 - Date.now(), resumeAt.current - Date.now()));
    return () => clearTimeout(timer);
  }, [looping, hovered, focused, paused, dragging, reduced, advance]);
  return <div role="region" aria-roledescription="carousel" aria-label={`${label} screen highlights`} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <div className={`bu-card-viewport relative rounded-lg bg-slate-50 ${looping ? "overflow-hidden" : "overflow-x-auto"}`} onScroll={event => { if (!looping && items.length) setIndex(Math.min(items.length - 1, Math.round(event.currentTarget.scrollLeft / 80))); }} style={{ touchAction: looping ? "pan-y" : "pan-x pan-y" }} onDragStart={event => event.preventDefault()} onClickCapture={event => { if (dragged.current) { event.preventDefault(); event.stopPropagation(); dragged.current = false; } }} onPointerDown={event => { if (items.length < 2 || advance || event.button !== 0) return; pointer.current = { id: event.pointerId, x: event.clientX }; dragged.current = false; setDragging(true); }} onPointerMove={event => {
      if (!pointer.current || pointer.current.id !== event.pointerId) return;
      const delta = event.clientX - pointer.current.x;
      if (Math.abs(delta) > 8) { dragged.current = true; event.currentTarget.setPointerCapture(event.pointerId); if (looping) setOffset(Math.max(-72, Math.min(72, delta))); else { event.currentTarget.scrollLeft -= delta; pointer.current.x = event.clientX; } }
    }} onPointerUp={event => { if (!pointer.current) return; const delta = event.clientX - pointer.current.x; if (dragged.current) resumeAt.current = Date.now() + 4000; if (looping && Math.abs(delta) > 40) move(delta < 0 ? 1 : -1); pointer.current = null; setOffset(0); setDragging(false); }} onPointerCancel={() => { if (dragged.current) resumeAt.current = Date.now() + 4000; pointer.current = null; setOffset(0); setDragging(false); }}>
      {items.length ? <div className="bu-card-track flex" onTransitionEnd={event => { if (event.target !== event.currentTarget || event.propertyName !== "transform" || !advance) return; setIndex(nextHighlight(current, items.length, advance)); setAdvance(0); }} style={{ transform: `translateX(${looping ? -(1 + advance) * 80 + offset : 0}px)`, transitionDuration: dragging || !advance ? "0ms" : undefined }}>
        {visibleItems.map(({ item, slot }) => <div key={slot} aria-hidden={looping && (slot === 0 || slot > 5)} inert={looping && (slot === 0 || slot > 5)} className="bu-mini-slide"><Link draggable={false} href={item.href} aria-label={`Open ${item.name} Screen Detail`} title={item.name} className="bu-card-preview block rounded"><ScreenPreview name={item.name} preview={item.preview} size="md"/></Link></div>)}      </div> : <div className="flex h-[168px] flex-col items-center justify-center px-5 text-center"><ImageOff aria-hidden size={22} className="text-slate-400"/><p className="mt-3 text-xs font-semibold text-slate-700">{comingSoon ? "Coming soon" : "No previews yet"}</p><p className="mt-2 text-xs leading-5 text-slate-500">Real screen previews will appear here when available.</p></div>}
    </div>
    <div className="flex min-h-8 items-center justify-between gap-2 py-1"><p className="min-w-0 truncate text-[11px] tabular-nums text-slate-500">{items.length ? `${current + 1} / ${items.length} ${items.length === 1 ? "screen" : "screens"}` : "Screen highlights"}</p>{looping && <div className="flex shrink-0 items-center gap-1"><button type="button" aria-label={`Previous ${label} screen`} onClick={() => move(-1)} className="grid size-7 place-items-center rounded text-slate-500 hover:bg-slate-100"><ChevronLeft size={14}/></button><button type="button" aria-label={`Next ${label} screen`} onClick={() => move(1)} className="grid size-7 place-items-center rounded text-slate-500 hover:bg-slate-100"><ChevronRight size={14}/></button>{!reduced && <button type="button" aria-label={`${paused ? "Play" : "Pause"} ${label} carousel`} onClick={() => setPaused(value => !value)} className="grid size-7 place-items-center rounded text-slate-500 hover:bg-slate-100">{paused ? <Play size={12}/> : <Pause size={12}/>}</button>}</div>}</div>
  </div>;
}

export function BusinessUnitCard({ unit, screens, groups, flows }: { unit: BusinessUnit; screens: Screen[]; groups: ScreenGroup[]; flows: Flow[] }) {
  const { previews, categories } = businessUnitHighlights(unit.id, screens, groups, flows);
  return <article aria-label={unit.name} className="bu-showcase-card flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-4">
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h3 className="text-base font-semibold text-slate-950">{unit.name}</h3>{unit.status !== "active" && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">Coming soon</span>}</div>
    <HighlightCarousel items={previews} label={unit.name} comingSoon={unit.status !== "active"}/>
    <nav aria-label={`${unit.name} highlights`} className="flex-1 pt-1">{categories.map(group => <Link key={group.id} title={group.name} href={`/screens/${unit.slug}/${group.slug}`} className="flex min-h-7 items-center justify-between gap-2 rounded px-2 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-blue-700"><span className="min-w-0 truncate">{group.name}</span><ChevronRight aria-hidden size={13} className="shrink-0 text-slate-400"/></Link>)}{!categories.length && <p className="px-2 py-2 text-xs leading-5 text-slate-500">Groups and journeys will appear here when available.</p>}</nav>
    <Link href={`/screens/${unit.slug}`} aria-label={`See all ${unit.name}`} className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-xs font-semibold text-blue-700 hover:text-blue-800">See all <ArrowRight aria-hidden size={14}/></Link>
  </article>;
}
