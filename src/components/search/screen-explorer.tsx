"use client";
import { useBusinessUnitInventory } from "@/lib/use-business-units";

import { useMemo } from "react";
import { X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { matchingScreenIds } from "@/lib/screen-search";
import { useFlowInventory, useScreenGroupInventory, useScreenInventory } from "@/lib/repositories/client";
import { currentAuthGroupId, activeTreeGroups, screensInGroup } from "@/lib/flow-context";
import type { PreviewStatus, Screen } from "@/types/design-library";
import { ContentNavigationBar } from "@/components/layout/content-navigation-bar";
import { ScreenCard } from "@/components/screens/screen-card";
import { LibraryTree } from "@/components/tree/library-tree";
import { WorkspaceHeader } from "@/components/layout/workspace-header";

type Scope = "all" | "mobile" | "web";
type Status = "all" | PreviewStatus;

function updatedTimestamp(screen: Screen) {
  const value = screen.lastUpdated ?? screen.versions.find((version) => version.label === screen.currentVersion)?.date ?? screen.versions[0]?.date;
  const timestamp = value ? Date.parse(value) : Number.NaN;
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function ScreenExplorer({ initialQuery = "", initialGroup = "", initialScope = "", initialStatus = "", initialSort = "" }: { initialQuery?: string; initialProduct?: string; initialGroup?: string; initialScope?: string; initialStatus?: string; initialSort?: string }) {
  const businessUnits = useBusinessUnitInventory();
  const inventory = useScreenInventory();
  const groups = useScreenGroupInventory();
  const flows = useFlowInventory();
  const searchParams = useSearchParams();
  const screens = useMemo(() => Array.from(new Map(inventory.map((screen) => [screen.id, screen])).values()), [inventory]);
  const query = searchParams.get("q") ?? initialQuery;
  const productValue = searchParams.get("product") ?? "";
  const product = businessUnits.some((unit) => unit.id === productValue) ? productValue : "all";
  const selectedUnit = businessUnits.find((unit) => unit.id === product);
  const groupValue = currentAuthGroupId(searchParams.get("group") ?? initialGroup);
  const group = groups.some((item) => item.id === groupValue && (product === "all" || (item.businessUnitId ?? item.id.split(".")[0]) === product)) ? groupValue : "all";
  const scopeValue = searchParams.get("platform") ?? initialScope;
  const scope: Scope = scopeValue === "mobile" || scopeValue === "web" ? scopeValue : "all";
  const statusValue = searchParams.get("status") ?? initialStatus;
  const status: Status = statusValue === "active" || statusValue === "coming-soon" || statusValue === "unavailable" ? statusValue : "all";
  const sortValue = searchParams.get("sort") ?? initialSort;
  const sort: "latest" | "name" = sortValue === "name" ? "name" : "latest";

  const updateUrl = (changes: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value && value !== "all" && value !== "latest") params.set(key, value);
      else params.delete(key);
    }
    window.history.replaceState(null, "", params.size ? `/screens?${params}` : "/screens");
  };
  const changeQuery = (value: string) => updateUrl({ q: value });
  const changeProduct = (value: string) => updateUrl({ product: value, group: "all" });
  const changeGroup = (value: string) => updateUrl({ group: value });
  const changeScope = (value: Scope) => updateUrl({ platform: value });
  const changeStatus = (value: Status) => updateUrl({ status: value });
  const changeSort = (value: "latest" | "name") => updateUrl({ sort: value });

  const availableGroups = useMemo(() => activeTreeGroups(groups, flows).filter((item) => (product === "all" || (item.businessUnitId ?? item.id.split(".")[0]) === product)).sort((a, b) => a.sequence - b.sequence), [flows, groups, product]);
  const filtered = useMemo(() => {
    const matchedIds = matchingScreenIds(query, screens, groups, flows, businessUnits);
    const selectedGroup = groups.find(item => item.id === group);
    const scopedIds = selectedGroup ? new Set(screensInGroup(selectedGroup, flows, screens).map(screen => screen.id)) : undefined;
    return screens
      .filter((screen) => {
        const mobile = screen.platforms.some((platform) => platform !== "Web");
        const web = screen.platforms.includes("Web");
        const matchesScope = scope === "all" || (scope === "mobile" ? mobile : web);
        return (!query.trim() || matchedIds.has(screen.id))
          && (product === "all" || screen.businessUnitId === product)
          && (group === "all" || scopedIds?.has(screen.id))
          && (status === "all" || (screen.status ?? "active") === status)
          && matchesScope;
      })
      .sort((a, b) => sort === "name" ? a.name.localeCompare(b.name, "vi") : updatedTimestamp(b) - updatedTimestamp(a) || a.name.localeCompare(b.name, "vi"));
  }, [flows, group, groups, product, query, scope, screens, sort, status, businessUnits]);

  const activeFilters = [
    product !== "all" ? { key: "product", label: businessUnits.find((unit) => unit.id === product)?.name ?? product, clear: () => changeProduct("all") } : undefined,
    group !== "all" ? { key: "group", label: groups.find((item) => item.id === group)?.name ?? group, clear: () => changeGroup("all") } : undefined,
    scope !== "all" ? { key: "scope", label: scope === "mobile" ? "Mobile" : "Web", clear: () => changeScope("all") } : undefined,
    status !== "all" ? { key: "status", label: status === "active" ? "Active" : status === "coming-soon" ? "Coming soon" : "Unavailable", clear: () => changeStatus("all") } : undefined,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));
  const clearFilters = () => updateUrl({ product: "all", group: "all", platform: "all", status: "all" });
  const unitNameById = new Map(businessUnits.map((unit) => [unit.id, unit.name]));
  const groupNameById = new Map(groups.map((item) => [item.id, item.name]));
  const countLabel = filtered.length === screens.length ? "screens" : `of ${screens.length} screens`;

  return <div className="flex h-screen overflow-hidden">
    <LibraryTree/>
    <section className="min-w-0 flex-1 overflow-y-auto bg-[#f7f8fa]">
      <WorkspaceHeader searchQuery={query} onSearchQueryChange={changeQuery} platform={scope} onPlatformChange={changeScope}/>
      <ContentNavigationBar active="screens" count={filtered.length} noun={countLabel} sort={sort} onSortChange={changeSort} scope={scope} onScopeChange={changeScope} showScope={false}/>
      <div className="page-enter library-page">
        <div><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-slate-400">Design inventory</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{selectedUnit ? `Screens — ${selectedUnit.name}` : "All Screens"}</h1><p className="mt-1 text-sm text-slate-500">{selectedUnit ? `All canonical screens in ${selectedUnit.name}.` : "All canonical product screens across Long Châu."}</p></div>

        <div aria-label="Screen inventory filters" className="mt-6 rounded-lg border border-slate-200 bg-white library-card-padding">
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="min-w-0"><span className="sr-only">Business Unit</span><select aria-label="Business Unit" value={product} onChange={(event) => changeProduct(event.target.value)} className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/15"><option value="all">All products</option>{businessUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
            <label className="min-w-0"><span className="sr-only">Screen Group</span><select aria-label="Screen Group" value={group} onChange={(event) => changeGroup(event.target.value)} className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/15"><option value="all">All screen groups</option>{availableGroups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="min-w-0"><span className="sr-only">Status</span><select aria-label="Status" value={status} onChange={(event) => changeStatus(event.target.value as Status)} className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/15"><option value="all">All statuses</option><option value="active">Active</option><option value="coming-soon">Coming soon</option><option value="unavailable">Unavailable</option></select></label>
          </div>
          {activeFilters.length > 0 && <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5"><span className="mr-0.5 text-[10px] font-medium text-slate-400">Active filters</span>{activeFilters.map((item) => <button key={item.key} type="button" onClick={item.clear} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><span>{item.label}</span><X aria-hidden size={11}/></button>)}<button type="button" onClick={clearFilters} className="ml-1 text-[10px] font-semibold text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Clear all</button></div>}
        </div>

        {filtered.length > 0 ? <div data-testid="screens-grid" className="mt-6 library-card-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 min-[1440px]:grid-cols-5">{filtered.map((screen) => <ScreenCard key={screen.id} screen={screen} inventory unitName={unitNameById.get(screen.businessUnitId)} groupName={groupNameById.get(screen.screenGroupId)}/>)}</div> : <div className="mt-5 grid min-h-56 place-items-center rounded-lg border border-dashed border-slate-300 bg-white/60 px-5 text-center"><div><p className="text-sm font-semibold text-slate-900">No screens match these filters.</p><p className="mt-1 text-xs text-slate-500">Adjust the inventory filters or clear them to see all canonical screens.</p><button type="button" onClick={() => updateUrl({ q: "", product: "all", group: "all", platform: "all", status: "all" })} className="mt-4 rounded-md bg-slate-950 px-3 py-2 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">Clear filters</button></div></div>}
      </div>
    </section>
  </div>;
}
