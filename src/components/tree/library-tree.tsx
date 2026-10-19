"use client";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { TreeProductName } from "@/components/tree/tree-product-name";
import { useBusinessUnitInventory } from "@/lib/use-business-units";
import { TreeGroupName } from "@/components/tree/tree-group-name";
import { TreeFlowName } from "@/components/tree/tree-flow-name";
import { SortableFlowList } from "@/components/tree/sortable-flow-list";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Grid2X2, GripVertical, Home, Layers3, Plus } from "lucide-react";
import { reorderLocalFlows, reorderLocalFlowScreens, useFlowInventory, useScreenGroupInventory, useScreenInventory } from "@/lib/repositories/client";
import { FlowCreateForm } from "@/components/flows/flow-create-form";
import { Brand } from "@/components/layout/brand";
import { groupParent, groupPath, orderedGroups, groupUnitId } from "@/lib/screen-groups";
import { flowOwnerGroupId, screensForFlow, activeTreeGroups, orderedFlows } from "@/lib/flow-context";
import type { ScreenGroup } from "@/types/design-library";


export function LibraryTree({ selectedScreenId, dark = false, flowContext = false }: { selectedScreenId?: string; dark?: boolean; flowContext?: boolean }) {
  const businessUnits = useBusinessUnitInventory();
  const pathname = usePathname();
  const screens = useScreenInventory();
  const screenGroups = useScreenGroupInventory();
  const flows = useFlowInventory();
  const screenLink = (screen: (typeof screens)[number]) => {
    const unit = businessUnits.find((item) => item.id === screen.businessUnitId);
    const group = screenGroups.find((item) => item.id === screen.screenGroupId);
    return `/screens/${unit?.slug ?? screen.businessUnitId}/${group?.slug ?? screen.screenGroupId.split(".").at(-1)}/${screen.slug}`;
  };
  const selectedScreen = screens.find((screen) => screen.id === selectedScreenId || screenLink(screen) === pathname);
  const activeFlow = flows.find((flow) => pathname === `/flows/${flow.slug}`) ?? flows.find((flow) => selectedScreen && screensForFlow(flow, screens).some((screen) => screen.id === selectedScreen.id));
  const activeUnit = businessUnits.find((unit) => pathname === `/screens/${unit.slug}` || pathname.startsWith(`/screens/${unit.slug}/`));
  const activeGroup = screenGroups.find((group) => (group.businessUnitId ?? group.id.split(".")[0]) === activeUnit?.id && (pathname === `/screens/${activeUnit?.slug}/${group.slug}` || pathname.startsWith(`/screens/${activeUnit?.slug}/${group.slug}/`)));
  const revealUnitId = activeFlow?.businessUnitId ?? selectedScreen?.businessUnitId ?? activeUnit?.id;
  const revealGroupId = activeFlow ? flowOwnerGroupId(activeFlow) : selectedScreen?.screenGroupId ?? activeGroup?.id;
  const revealGroup = screenGroups.find((group) => group.id === revealGroupId);
  const revealParentId = revealGroup ? groupParent(revealGroup, screenGroups)?.id : undefined;
  const revealGrandparentId = revealGroup ? groupPath(revealGroup, screenGroups)?.at(-3)?.id : undefined;
  const revealKey = `${pathname}:${revealUnitId ?? ""}:${revealGroupId ?? ""}:${revealParentId ?? ""}:${revealGrandparentId ?? ""}:${activeFlow?.id ?? ""}:${selectedScreen?.id ?? ""}`;
  const [openUnits, setOpenUnits] = useState<Set<string>>(new Set([revealUnitId ?? "pharmacy"]));
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set([revealGroupId, revealParentId, revealGrandparentId].filter((id): id is string => Boolean(id))));
  const [openFlows, setOpenFlows] = useState<Set<string>>(new Set(activeFlow ? [activeFlow.id] : []));
  const [creatingFlowParentId, setCreatingFlowParentId] = useState<string>();
  const [collapsed, setCollapsed] = useState(false);
  const [lastRevealKey, setLastRevealKey] = useState(revealKey);
  const [editingProductId, setEditingProductId] = useState<string>();
  const [productDraft, setProductDraft] = useState(false);
  const changeProductEditor = (id?: string) => { setEditingProductId(id); setProductDraft(id === "product-draft"); setActiveEditingFlowId(undefined); setDraftGroup(undefined); };
  const [draftGroup, setDraftGroup] = useState<ScreenGroup>();
  const [activeEditingFlowId, setActiveEditingFlowId] = useState<string>();
  const [draggedScreen, setDraggedScreen] = useState<{ flowId: string; screenId: string }>();
  const treeScrollRef = useRef<HTMLDivElement>(null);
  const changeEditor = (id?: string) => { if (id) setCreatingFlowParentId(undefined); setActiveEditingFlowId(id); if (id !== draftGroup?.id) setDraftGroup(undefined); };
  if (revealKey !== lastRevealKey) {
    setLastRevealKey(revealKey);
    setActiveEditingFlowId(undefined);
    setDraftGroup(undefined);
    if (revealUnitId) setOpenUnits((current) => new Set(current).add(revealUnitId));
    if (revealGroupId) setOpenGroups((current) => new Set(current).add(revealGroupId));
    if (revealGrandparentId) setOpenGroups((current) => new Set(current).add(revealGrandparentId));
    if (revealParentId) setOpenGroups((current) => new Set(current).add(revealParentId));
    if (activeFlow) setOpenFlows((current) => new Set(current).add(activeFlow.id));
  }

  const globalLink = (active: boolean) => `sidebar-rail-item relative flex items-center justify-center rounded py-2 text-[11px] ${collapsed ? "px-2" : "gap-1.5 px-2"} ${active ? "bg-slate-100 font-semibold text-slate-950" : "text-slate-500 hover:bg-slate-100/70 hover:text-slate-950"}`;
  const toggleGroup = (groupId: string) => setOpenGroups((current) => {
    const next = new Set(current);
    if (next.has(groupId)) next.delete(groupId); else next.add(groupId);
    return next;
  });
  const toggleFlow = (flowId: string) => setOpenFlows((current) => { const next = new Set(current); if (next.has(flowId)) next.delete(flowId); else next.add(flowId); return next; });
  const moveFlowScreen = (flowId: string, targetScreenId: string) => { const flow = flows.find((item) => item.id === flowId); if (!flow || draggedScreen?.flowId !== flowId || draggedScreen.screenId === targetScreenId) return; const next = flow.screenIds.filter((id) => id !== draggedScreen.screenId); const target = next.indexOf(targetScreenId); if (target < 0) return; next.splice(target, 0, draggedScreen.screenId); reorderLocalFlowScreens(flowId, next); setDraggedScreen(undefined); };
  const childrenClass = "motion-collapse tree-children ml-3.5 space-y-0.5 border-l border-slate-200 pl-2";
  const structuralGroups = activeTreeGroups(screenGroups, flows);
  const renderGroup = (group: ScreenGroup) => {
    const groupOpen = openGroups.has(group.id);
    const children = orderedGroups(structuralGroups).filter((child) => groupParent(child, structuralGroups)?.id === group.id);
    const ownedFlows = orderedFlows(flows.filter((flow) => flow.businessUnitId === groupUnitId(group) && flowOwnerGroupId(flow) === group.id));
    return <div key={group.id}>
      <TreeGroupName group={group} editing={activeEditingFlowId === group.id} expanded={groupOpen} onToggle={() => toggleGroup(group.id)} onEditingChange={changeEditor}/>
      <div hidden={!groupOpen} inert={!groupOpen} className={childrenClass}>
        {children.map(renderGroup)}
        <SortableFlowList flows={ownedFlows} editingId={activeEditingFlowId} scrollRef={treeScrollRef} dark={dark} onReorder={flowIds => reorderLocalFlows(group.id, flowIds)} renderRow={(flow, { dragging, ...interaction }) => {
          const flowOpen = openFlows.has(flow.id);
          const flowScreens = screensForFlow(flow, screens);
          const destination = pathname === "/flows/" + flow.slug;
          return <div data-flow-drag-surface {...interaction} className={"tree-flow-reorder-row flex min-h-8 items-center rounded-md transition-[background-color,box-shadow,transform] hover:bg-blue-50/60 " + (destination ? "bg-blue-50 " : "") + (dragging ? "relative z-10 bg-blue-50 shadow-md ring-1 ring-blue-200 " : "cursor-grab active:cursor-grabbing")}>
            {flowScreens.length > 0 ? <button data-flow-drag-ignore="true" type="button" aria-expanded={flowOpen} aria-label={(flowOpen ? "Thu gọn flow " : "Mở rộng flow ") + flow.name} onClick={() => toggleFlow(flow.id)} className="grid size-7 shrink-0 place-items-center rounded text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><ChevronRight aria-hidden size={14} className={"transition-transform motion-duration-base " + (flowOpen ? "rotate-90" : "")}/></button> : <span aria-hidden className="size-7 shrink-0"/>}
            <TreeFlowName flow={flow} flows={flows} selected={destination} editing={activeEditingFlowId === flow.id} onEditingChange={changeEditor}/>
            <GripVertical aria-hidden size={13} className="mr-1 shrink-0 text-slate-300"/>
          </div>;
        }} renderChildren={flow => {
          const flowOpen = openFlows.has(flow.id);
          const flowScreens = screensForFlow(flow, screens);
          return <div hidden={!flowOpen} inert={!flowOpen} className={childrenClass}>
            {flowScreens.map((screen, index) => {
              const reorderable = flow.screenIds.includes(screen.id);
              return <div key={screen.id} draggable={reorderable} onDragStart={reorderable ? event => { event.dataTransfer.effectAllowed = "move"; setDraggedScreen({ flowId: flow.id, screenId: screen.id }); } : undefined} onDragOver={reorderable ? event => { if (draggedScreen?.flowId === flow.id) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; } } : undefined} onDrop={reorderable ? event => { event.preventDefault(); moveFlowScreen(flow.id, screen.id); } : undefined} onDragEnd={() => setDraggedScreen(undefined)} className={`flex min-h-8 items-start rounded ${draggedScreen?.screenId === screen.id ? "opacity-50" : ""}`}><GripVertical aria-hidden size={12} className={`mt-2 shrink-0 ${reorderable ? "cursor-grab text-slate-300" : "text-transparent"}`}/><Link href={screenLink(screen)} title={screen.name} aria-current={selectedScreen?.id === screen.id ? "page" : undefined} className={"flex min-h-8 min-w-0 flex-1 items-start rounded py-1.5 pr-2 text-[11px] leading-5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 " + (selectedScreen?.id === screen.id ? "bg-blue-50 font-semibold text-blue-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")}><span className="w-7 shrink-0 text-center tabular-nums text-slate-400">{String(index + 1).padStart(2, "0")}.</span><span>{screen.name}{(screen.status === "coming-soon" || screen.status === "unavailable") && <span className="ml-1 text-[9px] text-slate-400">{screen.status === "coming-soon" ? "Soon" : "Unavailable"}</span>}</span></Link></div>;
            })}
          </div>;
        }}/>
        {creatingFlowParentId === group.id ? <FlowCreateForm group={group} flows={flows} compact onCancel={() => setCreatingFlowParentId(undefined)} onCreated={() => { setOpenGroups((current) => new Set(current).add(group.id)); setCreatingFlowParentId(undefined); }}/> : <button type="button" onClick={() => { setDraftGroup(undefined); setActiveEditingFlowId(undefined); setCreatingFlowParentId(group.id); }} className="flex min-h-8 w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-[11px] font-medium text-blue-700 outline-none hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500"><Plus aria-hidden size={14}/> Create new flow</button>}
      </div>
    </div>;
  };

  return <SidebarLayout collapsed={collapsed} dark={dark}>
    <button type="button" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setCollapsed((value) => !value)} className="absolute right-3 top-5 z-30 grid size-9 place-items-center rounded-md border border-slate-200 bg-white text-slate-500 shadow-sm outline-none transition-colors hover:border-blue-300 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
      {collapsed ? <ChevronRight aria-hidden size={15}/> : <ChevronLeft aria-hidden size={15}/>}
    </button>
    <div className={collapsed ? "pr-12" : "pl-2 pr-10"}><Brand dark={dark} compact={collapsed}/></div>
    <nav aria-label="Primary navigation" className={`mt-6 border-b border-slate-200 pb-4 ${collapsed ? "flex flex-col gap-1" : "grid grid-cols-3 gap-1"}`}>
      <Link href="/" aria-label={collapsed ? "Home" : undefined} data-sidebar-tooltip={collapsed ? "Home" : undefined} aria-current={pathname === "/" ? "page" : undefined} className={globalLink(pathname === "/")}><Home aria-hidden size={14}/>{!collapsed && " Home"}</Link>
      <Link href="/screens" aria-label={collapsed ? "Screens" : undefined} data-sidebar-tooltip={collapsed ? "Screens" : undefined} aria-current={!flowContext && (pathname === "/screens" || pathname.startsWith("/screens/")) ? "page" : undefined} className={globalLink(pathname === "/screens" || pathname.startsWith("/screens/"))}><Grid2X2 aria-hidden size={14}/>{!collapsed && " Screens"}</Link>
      <Link href="/flows" aria-label={collapsed ? "Flows" : undefined} data-sidebar-tooltip={collapsed ? "Flows" : undefined} aria-current={flowContext || pathname === "/flows" || pathname.startsWith("/flows/") ? "page" : undefined} className={globalLink(pathname === "/flows" || pathname.startsWith("/flows/"))}><Layers3 aria-hidden size={14}/>{!collapsed && " Flows"}</Link>
    </nav>
    <div ref={treeScrollRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
    {!collapsed && <div className="mb-3 mt-5 px-2"><p className="text-[10px] font-medium uppercase tracking-[.12em] text-slate-400">Products</p></div>}
    <div className="space-y-1">{businessUnits.map((unit) => {
      const unitOpen = openUnits.has(unit.id);
      const unitGroups = structuralGroups.filter((group) => groupUnitId(group) === unit.id);
      return <div key={unit.id}>
        <div className={`flex items-center rounded-md transition hover:bg-slate-50 active:opacity-75 ${collapsed ? "justify-center" : ""}`}>{!collapsed && <button type="button" aria-expanded={unitOpen} aria-label={`${unitOpen?"Thu gọn":"Mở rộng"} ${unit.name}`} onClick={() => setOpenUnits((current) => { const next = new Set(current); if (next.has(unit.id)) next.delete(unit.id); else next.add(unit.id); return next; })} className="grid size-8 place-items-center rounded text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><ChevronRight aria-hidden className={`transition-transform motion-duration-base ${unitOpen?"rotate-90":""}`} size={15}/></button>}{collapsed ? <Link href={`/screens/${unit.slug}`} aria-label={collapsed ? unit.name : undefined} title={unit.name} className={`sidebar-rail-item relative flex items-center rounded-md py-2 text-[13px] font-semibold text-slate-800 hover:text-blue-700 ${collapsed ? "justify-center px-1" : "flex-1 justify-between pr-2"}`}>{collapsed ? <span className={`grid size-7 place-items-center rounded text-[8px] font-bold ${unit.id === "pharmacy" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>{unit.shortName}</span> : <span>{unit.name}</span>}</Link> : <TreeProductName unit={unit} editing={editingProductId === unit.id} onEditingChange={changeProductEditor}/>}</div>
        <div hidden={collapsed || !unitOpen} inert={collapsed || !unitOpen} className={childrenClass}>{orderedGroups(unitGroups).filter((group) => !groupParent(group, unitGroups)).map(renderGroup)}
          {draftGroup?.businessUnitId === unit.id ? <TreeGroupName key={draftGroup.id} group={draftGroup} draft editing onToggle={() => {}} onEditingChange={changeEditor}/> : <button type="button" aria-label={"Create new group in " + unit.name} onClick={() => { const token = crypto.randomUUID(); const group = { id: unit.id + ".group." + token, slug: "group-" + token, name: "Untitled group", businessUnitId: unit.id, parentGroupId: null, sequence: Math.max(0, ...unitGroups.map(item => item.sequence)) + 1, description: "", screenIds: [] }; setDraftGroup(group); setActiveEditingFlowId(group.id); setCreatingFlowParentId(undefined); }} className="flex min-h-8 w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-[11px] font-medium text-blue-700 hover:bg-blue-50"><Plus aria-hidden size={14}/> Create new group</button>}
        </div>
      </div>;
    })}{!collapsed && <div className="mt-2 px-2">{productDraft ? <TreeProductName unit={{ id: "product-draft", slug: "", name: "Untitled product", shortName: "", description: "", status: "active", groupIds: [] }} draft editing onEditingChange={changeProductEditor}/> : <button type="button" onClick={() => changeProductEditor("product-draft")} className="flex min-h-9 w-full items-center gap-1.5 rounded px-2 text-left text-xs font-medium text-blue-700 hover:bg-blue-50"><Plus size={14}/> Create new product</button>}</div>}</div>
    </div>
  </SidebarLayout>;
}

