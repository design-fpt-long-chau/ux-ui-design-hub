"use client";
import { useBusinessUnitInventory } from "@/lib/use-business-units";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { Flow, Screen, ScreenOption, ScreenPlatform } from "@/types/design-library";
import { checkoutScreens } from "@/lib/design-library";
import { useScreenGroupInventory } from "@/lib/repositories/client";
import { resolveScreenPlatform, resolveScreenVersion, screenPlatformHref, screenVersionHref } from "@/lib/screen-platform";
import { CheckoutFlow } from "@/components/flow/checkout-flow";
import { LibraryTree } from "@/components/tree/library-tree";
import { MetadataPanel } from "@/components/metadata/metadata-panel";
import { FigmaUpdateCard } from "@/components/screens/figma-update-card";
import { DetailActionBar } from "@/components/layout/detail-action-bar";
import { DetailControls } from "@/components/ui/segmented-control";
import { ComingSoonView } from "@/components/availability/coming-soon-view";
import { FlowPositionNavigator } from "./flow-position-navigator";
import { ScreenPreview } from "./screen-preview";
import { ContextualAnnotations } from "./contextual-annotations";
import { ExistingScreenPreviewEditor, ScreenRecordActions } from "./existing-screen-preview-editor";

const variantTones = ["blue", "cyan", "indigo", "emerald", "violet", "navy"];

function VariantPreview({ variant, index, selected, onSelect }: { variant: ScreenOption; index: number; selected: boolean; onSelect: () => void }) {
  return <button type="button" aria-pressed={selected} onClick={onSelect} className={`variant-rail-item flex min-w-0 flex-col items-center rounded-lg border p-1.5 text-center ${selected ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40"}`}>
    <div className="w-14 shrink-0"><ScreenPreview size="xs" name={variant.name} preview={variant.preview} status={variant.status} tone={variantTones[index % variantTones.length]}/></div>
    <p className={`variant-inspector-label mt-1.5 min-w-0 text-[10px] leading-[13px] ${selected ? "font-semibold text-blue-700" : "font-medium text-slate-600"}`}>{variant.name}</p>
  </button>;
}

function ScreenPeek({ screen, canonicalScreen, platform, direction, onNavigate }: { screen: Screen; canonicalScreen: Screen; platform: ScreenPlatform; direction: "previous" | "next"; onNavigate: () => void }) {
  const previous = direction === "previous";
  const comingSoon = screen.status === "coming-soon";
  return <Link scroll={false} href={screenPlatformHref(canonicalScreen, platform)} onClick={onNavigate} aria-label={`${previous ? "Previous screen" : "Next screen"}: ${screen.name}`} className={`screen-peek screen-peek-${direction}`}>
    <span className="screen-peek-preview"><ScreenPreview name={screen.name} preview={screen.preview} status={screen.status} tone={screen.previewTone} size="xl"/></span>
    <span className="screen-peek-label"><strong>{comingSoon ? "Coming soon" : previous ? "← Previous screen" : "Next screen →"}</strong><span>{screen.name}</span></span>
  </Link>;
}

function DetailInspection({ screen, canonicalScreen, platform, navigationDirection, onNavigate, journeyScreens, historical = false }: { screen: Screen; canonicalScreen: Screen; platform: ScreenPlatform; navigationDirection: "previous" | "next" | null; onNavigate: (direction: "previous" | "next") => void; journeyScreens: Screen[]; historical?: boolean }) {
  const options = [...screen.variants, ...screen.states.filter((state) => !screen.variants.some((variant) => variant.id === state.id))].sort((a, b) => Number(Boolean(b.isDefault)) - Number(Boolean(a.isDefault)) || (a.order ?? 0) - (b.order ?? 0));
  const [selectedOptionId, setSelectedOptionId] = useState(options[0]?.id);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.id === selectedOptionId));
  const selectedOption = options[selectedIndex];
  const previewSource = selectedOption?.preview ?? screen.preview;
  const annotations = (screen.annotations ?? []).filter(annotation =>
    annotation.platform === platform &&
    (!annotation.variantId || annotation.variantId === selectedOption?.id) &&
    (!annotation.stateId || annotation.stateId === selectedOption?.id) &&
    (Boolean(previewSource) || annotation.showOnPlaceholder),
  );
  const screenIndex = journeyScreens.findIndex((item) => item.id === canonicalScreen.id);
  const previousScreen = screenIndex > 0 ? journeyScreens[screenIndex - 1] : undefined;
  const nextScreen = screenIndex >= 0 && screenIndex < journeyScreens.length - 1 ? journeyScreens[screenIndex + 1] : undefined;

  return <div className={`detail-canvas min-w-0 ${navigationDirection ? `peek-navigation-${navigationDirection}` : ""}`}>
    <div className="detail-inspection-stage relative mx-auto w-full max-w-[920px]">
      {previousScreen && <ScreenPeek screen={resolveScreenPlatform(previousScreen, platform)} canonicalScreen={previousScreen} platform={platform} direction="previous" onNavigate={() => onNavigate("previous")}/>} 
      <div key={selectedOption?.id ?? screen.id} className="variant-hero-transition relative z-10 mx-auto w-[400px] max-w-full shrink-0">
        {historical ? <><ScreenPreview name={selectedOption?.name ?? screen.name} preview={previewSource} size="xl"/><ContextualAnnotations annotations={annotations}/></> : <ExistingScreenPreviewEditor screen={canonicalScreen} platform={platform} preview={selectedOption?.preview ?? screen.preview} annotations={annotations} name={selectedOption?.name ?? screen.name} previewTargetId={selectedOption && selectedIndex > 0 && !selectedOption.isDefault ? selectedOption.id : undefined}/>}
      </div>
      {nextScreen && <ScreenPeek screen={resolveScreenPlatform(nextScreen, platform)} canonicalScreen={nextScreen} platform={platform} direction="next" onNavigate={() => onNavigate("next")}/>} 
    </div>
    <section aria-label="Variants & States" className="variant-section mx-auto mt-4 w-full max-w-[820px] border-t border-slate-200 pt-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold text-slate-950">Variants & States</h2>
        <span className="text-[10px] font-medium text-slate-400">{options.length} representations</span>
      </div>
      <div className="variant-row mt-2 grid grid-cols-6 gap-4 xl:gap-5">
        {options.map((option, index) => <VariantPreview key={option.id} variant={(option.isDefault || index === 0) && !option.preview ? { ...option, preview: screen.preview } : option} index={index} selected={option.id === selectedOption?.id} onSelect={() => setSelectedOptionId(option.id)}/>)}
      </div>
      {options.length === 0 && <p className="mt-3 text-xs text-slate-400">No documented variants or states for this version.</p>}
    </section>
  </div>;
}

export function ScreenDetailClient({ screen, flow, platform, requestedVersion, journeyScreens = checkoutScreens, flowName = "Checkout", flowGroupId, journey }: { screen: Screen; flow: boolean; platform: ScreenPlatform; requestedVersion?: string; journeyScreens?: Screen[]; flowName?: string; flowGroupId?: string; journey?: Flow }) {
  const businessUnits = useBusinessUnitInventory();
  const group = useScreenGroupInventory().find((item) => item.id === (flowGroupId ?? screen.screenGroupId))!;
  const unit = businessUnits.find(unit => unit.id === screen.businessUnitId)!;
  const [navigationDirection, setNavigationDirection] = useState<"previous" | "next" | null>(null);
 const versionContext = resolveScreenVersion(screen, platform, requestedVersion);
  const platformScreen = versionContext.screen;
  const platformUnavailable = platformScreen.status === "coming-soon" || platformScreen.status === "unavailable";
  const currentVersion = versionContext.history.find(snapshot => snapshot.status === "current")?.version ?? resolveScreenPlatform(screen, platform).currentVersion;

  return <div className="flex h-screen overflow-hidden bg-[#f7f8fa]">
    <LibraryTree selectedScreenId={screen.id} flowContext={flow}/>
    <section className="flex min-w-0 flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white library-gutter py-4">
        <div className="detail-header-row flex items-start justify-between gap-4">
          <div className="min-w-0 max-w-full overflow-hidden">
            <Link href={`/screens/${unit.slug}/${group.slug}`} title={`${group.name} Gallery`} className="mb-2 flex min-w-0 items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-blue-700"><ArrowLeft className="shrink-0" size={13}/><span className="truncate">{group.name} Gallery</span></Link>
            <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[11px] text-slate-400">
              <Link href="/screens" className="rounded hover:text-blue-700">Long Châu</Link><ChevronRight size={11}/>
              <Link href={`/screens/${unit.slug}`} title={unit.name} className="min-w-0 max-w-full truncate rounded hover:text-blue-700">{unit.name}</Link><ChevronRight size={11}/>
              <Link href={`/screens/${unit.slug}/${group.slug}`} title={group.name} className="min-w-0 max-w-full truncate rounded hover:text-blue-700">{group.name}</Link><ChevronRight size={11}/>
              <span aria-current="page" className="truncate text-slate-600">{screen.name}</span>
            </nav>
            <div className="mt-1.5 flex flex-wrap items-center gap-2"><h1 className="mr-2 truncate text-[22px] font-semibold tracking-tight text-slate-950">{screen.name}</h1>{!platformUnavailable&&<span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{platformScreen.currentVersion} · {versionContext.isHistorical ? "Archived" : "Current"}</span>}<span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{platform === "mobile" ? "Mobile" : "Web"}</span>{platformUnavailable?<span className="rounded bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">{platformScreen.status === "coming-soon" ? "Coming soon" : "Unavailable"}</span>:<span className="flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700"><CheckCircle2 size={11}/>{platformScreen.evidence.status}</span>}</div>
          </div>
          <DetailActionBar><DetailControls screen={screen} flow={flow} platform={platform}/><ScreenRecordActions screen={screen}/></DetailActionBar>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto">
        {flow ? <CheckoutFlow selected={screen} platform={platform} screens={journeyScreens} flowName={flowName} journey={journey}/> : platformUnavailable ? <ComingSoonView type="screen" itemName={`${screen.name} · ${platform === "mobile" ? "Mobile" : "Web"}`} status={platformScreen.status === "unavailable" ? "unavailable" : "coming-soon"} browseHref="/screens"/> : <div className="view-transition library-page">
          <div className="screen-detail-content">
            {versionContext.missingVersion && <div role="alert" className="mb-3 rounded-md border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-900">Version {versionContext.missingVersion} is unavailable. Showing the current version.</div>}
            {versionContext.isHistorical && <div className="mb-3 flex items-center justify-between gap-4 rounded-md border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs"><div><span className="font-semibold text-slate-800">Viewing archived version {platformScreen.currentVersion}</span><span className="ml-2 text-slate-500">{platformScreen.lastUpdated}</span></div><Link scroll={false} href={screenVersionHref(screen, platform)} className="shrink-0 font-semibold text-blue-700 hover:underline">Back to current {currentVersion}</Link></div>}
            <FigmaUpdateCard canonicalScreen={resolveScreenPlatform(screen, platform)} key={`${platformScreen.figmaSource?.url ?? "manual"}:${platformScreen.figmaSource?.lastSyncedFingerprint ?? "legacy"}:${versionContext.isHistorical}`} screen={platformScreen} platform={platform} currentPreview={platformScreen.preview} historical={versionContext.isHistorical}/>
            <FlowPositionNavigator selected={screen} platform={platform} screens={journeyScreens} flowName={flowName}/>
            <DetailInspection key={`${screen.id}-${platform}-${platformScreen.currentVersion}`} screen={platformScreen} canonicalScreen={screen} platform={platform} navigationDirection={navigationDirection} onNavigate={setNavigationDirection} journeyScreens={journeyScreens} historical={versionContext.isHistorical}/>
          </div>
        </div>}
      </main>
    </section>
    <MetadataPanel canonicalScreen={resolveScreenPlatform(screen, platform)} screen={platformScreen} platform={platform} historical={versionContext.isHistorical} history={versionContext.history} selectedVersion={platformScreen.currentVersion} historyCount={versionContext.history.length || undefined} changelog={versionContext.selectedSnapshot?.changelog}/>
  </div>;
}
