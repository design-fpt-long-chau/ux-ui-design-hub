"use client";

import { useBusinessUnitInventory } from "@/lib/use-business-units";
import Link from "next/link";
import { CornerDownLeft, Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeSearch, searchScreenInventory, type ScreenSearchResult } from "@/lib/screen-search";
import { useFlowInventory, useScreenGroupInventory, useScreenInventory } from "@/lib/repositories/client";

const RESULT_LIMIT = 10;

type PlatformScope = "all" | "mobile" | "web";

function Highlight({ text, query, dark }: { text: string; query: string; dark: boolean }) {
  const normalizedText = normalizeSearch(text);
  const normalizedQuery = normalizeSearch(query);
  const index = normalizedText.indexOf(normalizedQuery);
  if (index < 0 || !normalizedQuery) return text;
  return <>{text.slice(0, index)}<mark className={`rounded-sm px-0.5 font-semibold ${dark ? "bg-blue-400/20 text-blue-200" : "bg-blue-100 text-blue-800"}`}>{text.slice(index, index + normalizedQuery.length)}</mark>{text.slice(index + normalizedQuery.length)}</>;
}

function ResultRow({ result, query, index, optionId, active, dark, onActivate, onNavigate }: {
  result: ScreenSearchResult;
  query: string;
  index: number;
  optionId: string;
  active: boolean;
  dark: boolean;
  onActivate: (index: number) => void;
  onNavigate: () => void;
}) {
  const pending = result.status !== "active";
  const typeLabel = result.kind === "screen" ? "Screen" : result.kind === "product" ? "Product" : "Flow";
  const platform = result.screen?.platforms[0];
  return <Link id={optionId} role="option" aria-selected={active} aria-label={`${result.name}, ${typeLabel}, ${result.context}${pending ? `, ${result.status}` : ""}`} href={result.href} onMouseEnter={() => onActivate(index)} onFocus={() => onActivate(index)} onClick={onNavigate} className={`group flex min-h-14 items-center gap-3 rounded-md px-3 py-2.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${active ? dark ? "bg-white/[.09]" : "bg-blue-50" : dark ? "hover:bg-white/[.05]" : "hover:bg-slate-50"}`}>
    <span className={`grid size-8 shrink-0 place-items-center rounded-md border text-[9px] font-bold uppercase tracking-wide ${result.kind === "screen" ? dark ? "border-blue-400/20 bg-blue-400/10 text-blue-200" : "border-blue-200 bg-blue-50 text-blue-700" : dark ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{result.kind === "screen" ? "SC" : result.kind === "product" ? "BU" : "FL"}</span>
    <span className="min-w-0 flex-1"><span className="flex min-w-0 items-center gap-2"><span className={`truncate text-[13px] font-semibold ${dark ? "text-slate-100" : "text-slate-900"}`}><Highlight text={result.name} query={query} dark={dark}/></span><span className={`shrink-0 rounded border px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[.08em] ${dark ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500"}`}>{typeLabel}</span></span><span className={`mt-0.5 block truncate text-[10px] ${dark ? "text-slate-400" : "text-slate-500"}`}>{result.context}</span>{result.matchedRepresentation && <span className={`mt-0.5 block truncate text-[9px] ${dark ? "text-blue-300" : "text-blue-700"}`}>Matched representation: {result.matchedRepresentation}</span>}</span>
    <span className={`flex shrink-0 flex-col items-end gap-1 text-[9px] ${dark ? "text-slate-500" : "text-slate-400"}`}>{platform && <span>{platform}</span>}{pending && <span className={dark ? "text-amber-200/80" : "text-amber-700"}>{result.status === "coming-soon" ? "Coming soon" : "Unavailable"}</span>}</span>
  </Link>;
}

export function GlobalSearch({ dark = false, value, onValueChange, platform = "all" }: { dark?: boolean; value?: string; onValueChange?: (value: string) => void; platform?: PlatformScope }) {
  const businessUnits = useBusinessUnitInventory();
  const inventory = useScreenInventory();
  const flows = useFlowInventory();
  const groups = useScreenGroupInventory();
  const router = useRouter();
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [internalValue, setInternalValue] = useState("");
  const query = value ?? internalValue;
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => { const timer = window.setTimeout(() => setDebouncedQuery(query), 100); return () => window.clearTimeout(timer); }, [query]);
  useEffect(() => { const close = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) { setOpen(false); setActiveIndex(-1); } }; document.addEventListener("pointerdown", close); return () => document.removeEventListener("pointerdown", close); }, []);
  const allResults = useMemo(() => searchScreenInventory(debouncedQuery, inventory, flows, groups, businessUnits).filter((result) => {
    if (platform === "all" || result.kind !== "screen" || !result.screen) return true;
    return platform === "mobile" ? result.screen.platforms.some((item) => item !== "Web") : result.screen.platforms.includes("Web");
  }), [debouncedQuery, flows, groups, inventory, platform, businessUnits]);
  const results = allResults.slice(0, RESULT_LIMIT);

  const update = (next: string) => { (onValueChange ?? setInternalValue)(next); setOpen(true); setActiveIndex(-1); };
  const selectNext = (direction: 1 | -1) => { if (!results.length) return; setActiveIndex((current) => current < 0 ? (direction === 1 ? 0 : results.length - 1) : (current + direction + results.length) % results.length); };
  const navigate = (href: string) => { setOpen(false); setActiveIndex(-1); router.push(href); };
  const submit = () => {
    if (activeIndex >= 0 && results[activeIndex]) return navigate(results[activeIndex].href);
    const exact = allResults.filter((result) => normalizeSearch(result.name) === normalizeSearch(query));
    if (exact.length === 1) return navigate(exact[0].href);
    if (query.trim()) navigate(`/screens?q=${encodeURIComponent(query.trim())}`);
  };
  const clear = () => { update(""); setDebouncedQuery(""); inputRef.current?.focus(); };
  return <div ref={rootRef} className="relative max-w-xl flex-1">
    <div className={`form-control-frame flex items-center gap-3 rounded-md border px-3 py-2 text-sm ${dark ? "border-white/10 bg-white/5 text-slate-400" : "border-slate-200 bg-slate-50 text-slate-400"}`}>
      <Search aria-hidden size={16}/><input ref={inputRef} role="combobox" aria-label="Search library" aria-autocomplete="list" aria-expanded={open} aria-controls={open ? listboxId : undefined} aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined} value={query} onChange={(event) => update(event.target.value)} onFocus={() => setOpen(true)} onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); selectNext(1); } else if (event.key === "ArrowUp") { event.preventDefault(); setOpen(true); selectNext(-1); } else if (event.key === "Enter") { event.preventDefault(); submit(); } else if (event.key === "Escape") { event.preventDefault(); setOpen(false); setActiveIndex(-1); } }} className={`w-full bg-transparent outline-none ${dark ? "text-white" : "text-slate-900"}`} placeholder="Search screens and flows..."/>
      {query && <button type="button" aria-label="Clear search" onClick={clear} className={`grid size-6 shrink-0 place-items-center rounded outline-none transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 ${dark ? "text-slate-500 hover:bg-white/10 hover:text-slate-200" : "text-slate-400 hover:bg-slate-200 hover:text-slate-700"}`}><X size={14}/></button>}
    </div>
    <div hidden={!open} inert={!open} className={`motion-popover absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[min(460px,calc(100vh-96px))] overflow-y-auto rounded-lg border p-1.5 shadow-xl ${dark ? "border-slate-700 bg-[#111827] text-white shadow-slate-950/25" : "border-slate-200 bg-white text-slate-900 shadow-slate-900/10"}`}>
      <div id={listboxId} role="listbox" aria-label="Library search results">
        {!query.trim() && <div className="px-4 py-5"><p className={`text-xs font-medium ${dark ? "text-slate-200" : "text-slate-800"}`}>Search the library</p><p className={`mt-1 text-[10px] leading-4 ${dark ? "text-slate-500" : "text-slate-500"}`}>Find a screen or flow by name, product, group, or description.</p></div>}
        {query.trim() && debouncedQuery !== query && <div className={`px-4 py-5 text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>Searching…</div>}
        {query.trim() && debouncedQuery === query && <div className="py-1">{results.map((result, index) => <ResultRow key={result.id} result={result} query={query} index={index} optionId={`${listboxId}-${index}`} active={activeIndex === index} dark={dark} onActivate={setActiveIndex} onNavigate={() => { setOpen(false); setActiveIndex(-1); }}/>)}</div>}
        {query.trim() && debouncedQuery === query && !results.length && <div className="px-4 py-6"><p className={`text-xs font-medium ${dark ? "text-slate-200" : "text-slate-800"}`}>No results for “{query.trim()}”</p><p className={`mt-1 text-[10px] leading-4 ${dark ? "text-slate-500" : "text-slate-500"}`}>Try another screen, flow, or product keyword.</p></div>}
      </div>
      {results.length > 0 && <div className={`flex items-center justify-between border-t px-3 py-2 text-[9px] ${dark ? "border-slate-700 text-slate-500" : "border-slate-200 text-slate-400"}`}><span>{allResults.length} result{allResults.length === 1 ? "" : "s"}</span><span className="inline-flex items-center gap-1"><CornerDownLeft size={10}/> Open selected</span></div>}
    </div>
  </div>;
}
