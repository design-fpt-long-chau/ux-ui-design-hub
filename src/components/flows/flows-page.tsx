"use client";
import { useBusinessUnitInventory } from "@/lib/use-business-units";
import { useModalFocus } from "@/components/ui/use-modal-focus";
import { FieldError } from "@/components/ui/field-error";

import { FlowGroupSections } from "@/components/flows/flow-group-sections";
import { storageErrorMessage } from "@/lib/storage-errors";
import { useState } from "react";
import Link from "next/link";
import { ContentNavigationBar } from "@/components/layout/content-navigation-bar";
import { LibraryTree } from "@/components/tree/library-tree";
import { WorkspaceHeader } from "@/components/layout/workspace-header";

import { flowOwnerGroupId } from "@/lib/flow-context";
import { deleteLocalFlow, updateLocalFlow, useFlowInventory, useScreenGroupInventory } from "@/lib/repositories/client";
import type { Flow } from "@/types/design-library";

export function FlowsPage({ businessUnitId }: { businessUnitId?: string }) {
  const businessUnits = useBusinessUnitInventory();
  const flows = useFlowInventory();
  const scopedUnit = businessUnitId ? businessUnits.find(unit => unit.id === businessUnitId) : undefined;
  const visibleFlows = scopedUnit ? flows.filter(flow => flow.businessUnitId === scopedUnit.id) : flows;
  const groups = useScreenGroupInventory();
  const [actionError, setActionError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Flow>();
  const [renameTarget, setRenameTarget] = useState<Flow>();
  const [renameName, setRenameName] = useState("");
  const [renameError, setRenameError] = useState("");
  const renameDialog = useModalFocus(Boolean(renameTarget), () => setRenameTarget(undefined));
  const deleteDialog = useModalFocus(Boolean(deleteTarget), () => { setDeleteTarget(undefined); setActionError(""); });
  const startRename = (flow: Flow) => { setRenameTarget(flow); setRenameName(flow.name); setRenameError(""); };
  const saveRename = () => {
    if (!renameTarget || !renameName.trim()) return setRenameError("Enter a flow name.");
    if (flows.some((item) => item.id !== renameTarget.id && item.businessUnitId === renameTarget.businessUnitId && flowOwnerGroupId(item) === flowOwnerGroupId(renameTarget) && item.name.toLowerCase() === renameName.trim().toLowerCase())) return setRenameError("A flow with this name already exists in this group.");
    try { updateLocalFlow(renameTarget.id, { name: renameName.trim(), description: renameTarget.description }); setRenameTarget(undefined); } catch (cause) { setRenameError(storageErrorMessage(cause)); }
  };

  return <div className="flex h-screen overflow-hidden bg-[#f7f8fa]">
    <LibraryTree/>
    <section className="min-w-0 flex-1 overflow-y-auto">
      <WorkspaceHeader/>
      <ContentNavigationBar active="flows" count={visibleFlows.length} noun="flows" compact/>
      <main className="page-enter library-page">
        <p className="text-[11px] font-bold tracking-[.16em] text-blue-700">USER JOURNEYS</p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-950">Flows{scopedUnit ? ` — ${scopedUnit.name}` : ""}</h1>
        <p className="mt-1.5 text-sm text-slate-500">Explore complete journeys and screen sequences.</p>
        {scopedUnit && <Link href="/flows" className="mt-3 inline-block rounded text-xs font-semibold text-blue-700 hover:underline">All Business Units</Link>}
        {visibleFlows.length === 0 && <div className="mt-7 rounded-lg border border-dashed border-slate-300 bg-white px-5 py-8 text-center"><p className="text-sm font-medium text-slate-700">{scopedUnit && scopedUnit.status !== "active" ? "Coming soon" : "No flows yet"}</p><p className="mt-1 text-xs text-slate-500">Journeys will appear here when available.</p></div>}
        <FlowGroupSections flows={visibleFlows} groups={groups} businessUnitId={scopedUnit?.id} onEdit={startRename} onDelete={flow => { setActionError(""); setDeleteTarget(flow); }}/>
      </main>
    </section>
    {renameTarget && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-5"><div ref={renameDialog} role="dialog" aria-modal="true" aria-label={`Rename flow ${renameTarget.name}`} className="w-full max-w-md rounded-xl bg-white library-dialog-padding shadow-xl"><h2 className="text-base font-semibold text-slate-950">Rename flow</h2><label className="mt-4 block text-xs font-medium text-slate-600">Flow name<input data-dialog-autofocus onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); saveRename(); } }} aria-invalid={Boolean(renameError)} value={renameName} onChange={(event) => { setRenameName(event.target.value); setRenameError(""); }} className="mt-1.5 w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500"/></label><FieldError>{renameError}</FieldError><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setRenameTarget(undefined)} className="rounded-md px-3 py-2 text-xs font-semibold text-slate-600">Cancel</button><button type="button" onClick={saveRename} className="rounded-md bg-blue-700 px-3 py-2 text-xs font-semibold text-white">Save name</button></div></div></div>}
    {deleteTarget && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-5"><div ref={deleteDialog} role="alertdialog" aria-modal="true" aria-label={`Delete flow ${deleteTarget.name}`} className="w-full max-w-md rounded-xl bg-white library-dialog-padding shadow-xl"><h2 className="text-base font-semibold text-slate-950">Delete “{deleteTarget.name}”?</h2>{actionError && <p role="alert" className="mt-2 text-xs text-red-600">{actionError}</p>}<p className="mt-2 text-sm leading-6 text-slate-600">Deleting this Flow will remove the Flow definition only. The canonical screens inside the Flow will NOT be deleted.</p><div className="mt-5 flex justify-end gap-2"><button data-dialog-autofocus type="button" onClick={() => setDeleteTarget(undefined)} className="rounded-md px-3 py-2 text-xs font-semibold text-slate-600">Cancel</button><button type="button" onClick={() => { try { deleteLocalFlow(deleteTarget.id); setDeleteTarget(undefined); setActionError(""); } catch (cause) { setActionError(storageErrorMessage(cause)); } }} className="rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white">Delete flow</button></div></div></div>}
  </div>;
}
