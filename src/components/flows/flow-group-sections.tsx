"use client";
import { useBusinessUnitInventory } from "@/lib/use-business-units";

import { useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { FlowCard } from "@/components/flows/flow-card";
import { FlowCreateForm } from "@/components/flows/flow-create-form";
import { TreeFlowName } from "@/components/tree/tree-flow-name";
import { activeTreeGroups, flowOwnerGroupId, orderedFlows } from "@/lib/flow-context";
import { groupLabel, groupParent, groupUnitId, orderedGroups } from "@/lib/screen-groups";
import type { Flow, ScreenGroup } from "@/types/design-library";

export function FlowGroupSections({ flows, groups, businessUnitId, onEdit, onDelete }: {
  flows: Flow[]; groups: ScreenGroup[]; businessUnitId?: string;
  onEdit: (flow: Flow) => void; onDelete: (flow: Flow) => void;
}) {
  const businessUnits = useBusinessUnitInventory();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string>();
  const [creatingGroupId, setCreatingGroupId] = useState<string>();
  const structural = activeTreeGroups(groups, flows);
  const ordered = orderedGroups(structural);
  const card = (flow: Flow, context: string) => <FlowCard key={flow.id} flow={flow} context={context} onEdit={onEdit} onDelete={onDelete} nameEditor={editingId === flow.id ? <TreeFlowName flow={flow} flows={flows} selected={false} editing onEditingChange={setEditingId}/> : undefined}/>;
  const renderGroup = (group: ScreenGroup) => {
    const open = !collapsed.has(group.id);
    const children = ordered.filter(child => groupParent(child, structural)?.id === group.id);
    const owned = orderedFlows(flows.filter(flow => flow.businessUnitId === groupUnitId(group) && flowOwnerGroupId(flow) === group.id));
    return <section key={group.id} className="flow-group-section min-w-0" aria-label={group.name}>
      <div className="flex min-h-10 flex-wrap items-center gap-2 border-b border-[color-mix(in_srgb,var(--border,var(--color-slate-200))_55%,transparent)] pb-1">
        <button type="button" aria-expanded={open} onClick={() => setCollapsed(current => { const next = new Set(current); if (next.has(group.id)) next.delete(group.id); else next.add(group.id); return next; })} className={`flex min-w-0 flex-1 items-center gap-2 rounded py-2 text-left font-semibold text-slate-800 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 ${children.length ? "text-base" : "text-sm"}`}><span className="break-words">{group.name}</span><ChevronRight aria-hidden size={16} className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-90" : ""}`}/></button>
        <button type="button" aria-label={`Create new flow in ${group.name}`} onClick={() => { setCreatingGroupId(group.id); setCollapsed(current => { const next = new Set(current); next.delete(group.id); return next; }); }} className="flow-group-create flex items-center gap-1 rounded px-2 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500"><Plus aria-hidden size={14}/> Create new flow</button>
      </div>
      <div hidden={!open} inert={!open} className="motion-collapse">
        <div className={children.length ? "space-y-6 pt-6" : "space-y-6 pt-4"}>
          {creatingGroupId === group.id && <FlowCreateForm group={group} flows={flows} onCancel={() => setCreatingGroupId(undefined)} onCreated={() => setCreatingGroupId(undefined)}/>}
          {children.length > 0 && <div className="space-y-6">{children.map(renderGroup)}</div>}
          {owned.length > 0 && <div className="library-card-grid grid md:grid-cols-2 xl:grid-cols-3">{owned.map(flow => card(flow, groupLabel(group, groups)))}</div>}
          {!children.length && !owned.length && <p className="px-2 py-3 text-xs text-slate-500">No flows yet.</p>}
        </div>
      </div>
    </section>;
  };
  return <div className="mt-8 space-y-10">{businessUnits.filter(unit => !businessUnitId || unit.id === businessUnitId).map(unit => {
    const roots = ordered.filter(group => groupUnitId(group) === unit.id && !groupParent(group, structural));
    // Keep unmapped legacy flows reachable without inventing a parent relationship.
    const unassigned = orderedFlows(flows.filter(flow => flow.businessUnitId === unit.id && !structural.some(group => group.id === flowOwnerGroupId(flow))));
    return <section key={unit.id} aria-label={unit.name} className="space-y-6"><h2 className="text-lg font-semibold text-slate-900">{unit.name}</h2>{roots.map(renderGroup)}{unassigned.length > 0 && <div className="library-card-grid grid md:grid-cols-2 xl:grid-cols-3">{unassigned.map(flow => card(flow, unit.name))}</div>}{!roots.length && !unassigned.length && <p className="text-sm text-slate-500">{unit.status === "active" ? "No groups yet." : "Coming soon"}</p>}</section>;
  })}</div>;
}
