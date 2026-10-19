"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { GlobalSearch } from "@/components/search/global-search";

export type PlatformScope = "all" | "mobile" | "web";

const platformOptions: Array<{ value: PlatformScope; label: string }> = [
  { value: "all", label: "All platforms" },
  { value: "mobile", label: "Mobile" },
  { value: "web", label: "Web" },
];

function PlatformFilter({ value, onChange, dark }: { value: PlatformScope; onChange: (value: PlatformScope) => void; dark: boolean }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, platformOptions.findIndex((option) => option.value === value)));
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();
  const selected = platformOptions.find((option) => option.value === value) ?? platformOptions[0];

  useEffect(() => {
    const close = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.focus();
  }, [activeIndex, open]);

  const openMenu = () => { setActiveIndex(Math.max(0, platformOptions.findIndex((option) => option.value === value))); setOpen(true); };
  const choose = (next: PlatformScope) => { onChange(next); setOpen(false); };
  const move = (direction: 1 | -1) => setActiveIndex((current) => (current + direction + platformOptions.length) % platformOptions.length);

  return <div ref={rootRef} className="relative shrink-0">
    <button ref={triggerRef} type="button" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined} onClick={() => open ? setOpen(false) : openMenu()} onKeyDown={(event) => { if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); openMenu(); setActiveIndex(event.key === "ArrowDown" ? 0 : platformOptions.length - 1); } }} className={`flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${dark ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 focus-visible:ring-offset-slate-950" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"}`}>
      <span className="max-w-24 truncate">{selected.label}</span><ChevronDown aria-hidden size={14} className={`transition-transform motion-duration-fast ${open ? "rotate-180" : ""}`}/>
    </button>
    <div hidden={!open} inert={!open} id={menuId} role="menu" aria-label="Filter by platform" onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); move(1); } else if (event.key === "ArrowUp") { event.preventDefault(); move(-1); } else if (event.key === "Home") { event.preventDefault(); setActiveIndex(0); } else if (event.key === "End") { event.preventDefault(); setActiveIndex(platformOptions.length - 1); } else if (event.key === "Escape") { event.preventDefault(); setOpen(false); triggerRef.current?.focus(); } }} className={`motion-popover absolute right-0 top-[calc(100%+8px)] z-50 w-40 rounded-lg border p-1.5 shadow-lg ${dark ? "border-slate-700 bg-slate-900 shadow-black/25" : "border-slate-200 bg-white shadow-slate-900/10"}`}>
      {platformOptions.map((option, index) => <button key={option.value} ref={(node) => { optionRefs.current[index] = node; }} type="button" role="menuitemradio" aria-checked={value === option.value} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(option.value)} className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${value === option.value ? dark ? "bg-white/10 text-white" : "bg-blue-50 text-blue-800" : dark ? "text-slate-300 hover:bg-white/5" : "text-slate-600 hover:bg-slate-50"}`}><span>{option.label}</span>{value === option.value && <Check aria-hidden size={13}/>}</button>)}
    </div>
  </div>;
}

export function WorkspaceHeader({ dark = false, searchQuery, onSearchQueryChange, platform, onPlatformChange }: { dark?: boolean; searchQuery?: string; onSearchQueryChange?: (value: string) => void; platform?: PlatformScope; onPlatformChange?: (value: PlatformScope) => void }) {
  const [internalPlatform, setInternalPlatform] = useState<PlatformScope>("all");
  const selectedPlatform = platform ?? internalPlatform;
  const changePlatform = onPlatformChange ?? setInternalPlatform;
  return <header data-drop-exclusion className={`sticky top-0 z-20 flex h-16 items-center gap-3 border-b library-gutter backdrop-blur ${dark ? "border-white/10 bg-[#08101e]/90" : "border-slate-200 bg-white/90"}`}>
    <GlobalSearch dark={dark} value={searchQuery} onValueChange={onSearchQueryChange} platform={selectedPlatform}/>
    <PlatformFilter value={selectedPlatform} onChange={changePlatform} dark={dark}/>
  </header>;
}
