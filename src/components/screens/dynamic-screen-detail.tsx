"use client";
import { useBusinessUnitInventory } from "@/lib/use-business-units";
import { flowOwnerGroupId, screensForFlow } from "@/lib/flow-context";
import { DetailActionBar } from "@/components/layout/detail-action-bar";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { screenHref } from "@/lib/design-library";
import { useFlowInventory, useScreenGroupInventory, useScreenInventory } from "@/lib/repositories/client";
import { resolveScreenPlatform, resolveAvailableScreenPlatform, resolveScreenVersion } from "@/lib/screen-platform";
import { ComingSoonView } from "@/components/availability/coming-soon-view";
import { ExistingScreenPreviewEditor, ScreenRecordActions } from "@/components/screens/existing-screen-preview-editor";
import { FigmaUpdateCard } from "@/components/screens/figma-update-card";
import { ScreenPreview } from "@/components/screens/screen-preview";
import { LibraryTree } from "@/components/tree/library-tree";
import { MetadataPanel } from "@/components/metadata/metadata-panel";
import { ScreenDetailClient } from "@/components/screens/screen-detail-client";
import type { Screen, ScreenPlatform } from "@/types/design-library";

function PlatformControl({ screen, platform }: { screen: Screen; platform: ScreenPlatform }) {
  const hasMobile = screen.platforms.some((item) => item === "iOS" || item === "Android" || item === "Mobile Web");
  const hasWeb = screen.platforms.includes("Web");
  const base = screenHref(screen);
  const itemClass = "detail-platform-option";
  return <div role="group" aria-label="Platform" className="detail-platform-control border border-slate-200 bg-slate-100">
    {hasMobile ? <Link aria-current={platform === "mobile" ? "page" : undefined} href={base} className={`${itemClass} ${platform === "mobile" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>Mobile</Link> : <span aria-disabled className={`${itemClass} text-slate-300`}>Mobile</span>}
    {hasWeb ? <Link aria-current={platform === "web" ? "page" : undefined} href={`${base}?platform=web`} className={`${itemClass} ${platform === "web" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>Web</Link> : <span aria-disabled className={`${itemClass} text-slate-300`}>Web</span>}
  </div>;
}

function LocalDetail({ screen, requestedPlatform, requestedVersion }: { screen: Screen; requestedPlatform: ScreenPlatform; requestedVersion?: string }) {
  const businessUnits = useBusinessUnitInventory();
  const groupInventory = useScreenGroupInventory();
  const platform = resolveAvailableScreenPlatform(screen, requestedPlatform);
  const versionContext = resolveScreenVersion(screen, platform, requestedVersion);
  const representation = versionContext.screen;
  const unit = businessUnits.find(unit => unit.id === screen.businessUnitId);
  const group = groupInventory.find((item) => item.id === screen.screenGroupId);
  const pending = representation.status === "coming-soon" || representation.status === "unavailable";
  const preview = <div className={platform === "mobile" ? "relative w-[400px] max-w-full" : "relative w-full max-w-4xl"}>{versionContext.isHistorical ? <ScreenPreview name={screen.name} preview={representation.preview} size="xl"/> : <ExistingScreenPreviewEditor screen={screen} platform={platform} preview={representation.preview} annotations={representation.annotations}/>}</div>;
  return <div className="flex h-screen overflow-hidden bg-[#f7f8fa]"><LibraryTree selectedScreenId={screen.id}/><section className="flex min-w-0 flex-1 flex-col"><header className="border-b border-slate-200 bg-white library-gutter py-4"><div className="library-toolbar items-start"><div><nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[11px] text-slate-400"><Link href="/screens">Long Châu</Link><ChevronRight size={11}/><Link href={`/screens/${unit?.slug}`}>{unit?.name}</Link><ChevronRight size={11}/><Link href={`/screens/${unit?.slug}/${group?.slug}`}>{group?.name}</Link></nav><h1 className="mt-2 text-[22px] font-semibold text-slate-950">{screen.name}</h1><p className="mt-1 text-[11px] text-slate-400">{screen.id}</p></div><DetailActionBar><PlatformControl screen={screen} platform={platform}/><ScreenRecordActions screen={screen}/></DetailActionBar></div></header><main className="min-h-0 flex-1 overflow-y-auto">{pending ? <ComingSoonView type="screen" itemName={screen.name} status={representation.status === "unavailable" ? "unavailable" : "coming-soon"} browseHref="/screens"/> : <div className="library-page"><div className="screen-detail-content">{versionContext.missingVersion && <div role="alert" className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">Version {versionContext.missingVersion} is unavailable. Showing the current version.</div>}{versionContext.isHistorical && <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-slate-700">Viewing archived version {representation.currentVersion}</div>}<FigmaUpdateCard canonicalScreen={resolveScreenPlatform(screen, platform)} key={`${representation.figmaSource?.url ?? "manual"}:${representation.figmaSource?.lastSyncedFingerprint ?? "legacy"}:${versionContext.isHistorical}`} screen={representation} platform={platform} currentPreview={representation.preview} historical={versionContext.isHistorical}/><div className="flex justify-center">{preview}</div></div></div>}</main></section><MetadataPanel canonicalScreen={resolveScreenPlatform(screen, platform)} screen={representation} platform={platform} historical={versionContext.isHistorical} history={versionContext.history} selectedVersion={representation.currentVersion} historyCount={versionContext.history.length || undefined}/></div>;
}

export function DynamicScreenDetail({ unitSlug, groupSlug, screenSlug, checkout = false }: { unitSlug: string; groupSlug: string; screenSlug: string; checkout?: boolean }) {
  const businessUnits = useBusinessUnitInventory();
  const inventory = useScreenInventory();
  const flowInventory = useFlowInventory();
  const groupInventory = useScreenGroupInventory();
  const query = useSearchParams();
  const screen = inventory.find((item) => item.slug === screenSlug && businessUnits.find(unit => unit.id === item.businessUnitId)?.slug === unitSlug && groupInventory.find((group) => group.id === item.screenGroupId)?.slug === (unitSlug === "pharmacy" && groupSlug === "app-entry" ? "login" : groupSlug));
  if (!screen) return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Screen not found.</div>;
  const requestedPlatform: ScreenPlatform = query.get("platform") === "web" ? "web" : "mobile";
  const platform = resolveAvailableScreenPlatform(screen, requestedPlatform);
  const journey = flowInventory.find((item) => item.status === "active" && screensForFlow(item, inventory).some(item => item.id === screen.id));
  const journeyScreens = journey ? screensForFlow(journey, inventory) : undefined;
  if (checkout || journey) return <ScreenDetailClient screen={screen} flow={query.get("view") === "flow"} platform={platform} requestedVersion={query.get("version") ?? undefined} journeyScreens={journeyScreens} journey={journey} flowName={journey?.name} flowGroupId={journey ? flowOwnerGroupId(journey) : undefined}/>;
  return <LocalDetail screen={screen} requestedPlatform={platform} requestedVersion={query.get("version") ?? undefined}/>;
}