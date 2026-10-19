"use client";

type ContentType = "screens" | "components" | "flows";
type SortValue = "latest" | "name";
type ScopeValue = "all" | "mobile" | "web";

const scopeOptions: Record<ContentType, Array<{ value: ScopeValue; label: string }>> = {
  screens: [{ value: "all", label: "All screens" }, { value: "mobile", label: "Mobile" }, { value: "web", label: "Web" }],
  components: [{ value: "all", label: "All components" }],
  flows: [{ value: "all", label: "All flows" }],
};

export function ContentNavigationBar({ active, count, noun, inventorySummary, compact = false, sort = "latest", onSortChange, scope = "all", onScopeChange, sortEnabled = true, showScope = true }: {
  active: ContentType;
  count?: number;
  noun?: string;
  inventorySummary?: { screens: number; flows: number; products: number };
  compact?: boolean;
  sort?: SortValue;
  onSortChange?: (value: SortValue) => void;
  scope?: ScopeValue;
  onScopeChange?: (value: ScopeValue) => void;
  sortEnabled?: boolean;
  showScope?: boolean;
}) {
  const contextualScopes = scopeOptions[active];

  return <div className={`content-navigation-bar bg-white library-gutter ${inventorySummary ? "border-y border-slate-200" : "border-b border-slate-200"}`}>
    <div className="flex min-h-14 flex-wrap items-center gap-x-5 gap-y-2 lg:gap-x-8">
      {!compact && <label className="hidden shrink-0 items-center md:flex"><span className="sr-only">Sort content</span><select value={sort} disabled={!sortEnabled} onChange={(event) => onSortChange?.(event.target.value as SortValue)} className="w-[104px] rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors motion-duration-fast hover:border-slate-300 disabled:cursor-default disabled:bg-slate-50 disabled:text-slate-500"><option value="latest">Latest</option>{sortEnabled && <option value="name">A–Z</option>}</select></label>}
      {!compact && showScope && <label className="hidden shrink-0 items-center sm:flex"><span className="sr-only">Content scope</span><select value={scope} disabled={contextualScopes.length === 1} onChange={(event) => onScopeChange?.(event.target.value as ScopeValue)} className="w-[132px] rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors motion-duration-fast hover:border-slate-300 disabled:cursor-default disabled:bg-slate-50 disabled:text-slate-500">{contextualScopes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>}
      {inventorySummary ? <p className="ml-auto shrink-0 whitespace-nowrap text-[11px] text-slate-500"><strong className="font-semibold text-slate-900">{inventorySummary.screens}</strong> screens <span className="mx-1.5 text-slate-300">·</span> <strong className="font-semibold text-slate-900">{inventorySummary.flows}</strong> flows <span className="mx-1.5 text-slate-300">·</span> <strong className="font-semibold text-slate-900">{inventorySummary.products}</strong> product areas</p> : <p aria-live="polite" className="ml-auto shrink-0 whitespace-nowrap text-[11px] text-slate-400">Showing <strong className="font-semibold text-slate-700">{count}</strong> {noun}</p>}
    </div>
  </div>;
}
