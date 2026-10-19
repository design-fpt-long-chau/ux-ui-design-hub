"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getBusinessUnits } from "@/lib/business-units";
import { createPortal } from "react-dom";
import type { ScreenGroup } from "@/types/design-library";
import { permanentlyDeleteLocalScreenGroup, permanentGroupDeletionBlocker, useFlowInventory, useScreenGroupInventory, useScreenInventory } from "@/lib/repositories/client";
import { storageErrorMessage } from "@/lib/storage-errors";

/** Mounted for each confirmation: acknowledgement never carries to another opening. */
export function DeleteGroupDialog({ group, onCancel, onDeleted }: { group: ScreenGroup; onCancel: () => void; onDeleted: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  useFlowInventory(); useScreenGroupInventory(); useScreenInventory();
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState("");
  const cancel = useRef<HTMLButtonElement>(null);
  const id = useId();
  const blocker = permanentGroupDeletionBlocker(group.id);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    cancel.current?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);
  return createPortal(<div className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/35 p-5" onClick={event => event.stopPropagation()}><div role="alertdialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-warning ${id}-consequences`} className="w-full max-w-md rounded-xl border border-slate-200 bg-white library-dialog-padding shadow-xl" onKeyDown={event => {
    event.stopPropagation();
    if (event.key === "Escape") { event.preventDefault(); onCancel(); }
    if (event.key === "Tab") {
      const controls = event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)');
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }}>
    <h2 id={`${id}-title`} className="text-base font-semibold text-slate-950">Delete this group permanently?</h2>
    <p id={`${id}-warning`} className="mt-2 text-sm font-medium text-red-600">This action cannot be undone.</p>
    <p className="mt-2 break-words text-sm font-semibold text-slate-900">{group.name}</p>
    <p id={`${id}-consequences`} className="mt-2 text-sm leading-6 text-slate-600">Direct Screens and Flows move to Ungrouped in the same Business Unit. Subgroups become top-level groups and keep their contents. Screens, previews, notes and Flow order will be preserved.</p>
    {blocker && <p role="alert" className="mt-3 text-xs text-red-600">{blocker}</p>}
    <label className="mt-4 flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} className="mt-1 size-4 shrink-0 accent-blue-700"/><span>Tôi đã hiểu và đồng ý với hành động này.</span></label>
    {error && <p role="alert" className="mt-3 text-xs text-red-600">{error}</p>}
    <div className="mt-6 flex justify-end gap-2"><button ref={cancel} type="button" onClick={onCancel} className="rounded-md px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button><button type="button" disabled={!acknowledged || Boolean(blocker)} onClick={() => {
      if (!acknowledged || blocker) return;
      try {
        const unit = getBusinessUnits().find(item => item.id === (group.businessUnitId ?? group.id.split(".")[0]));
        const groupPath = unit ? `/screens/${unit.slug}/${group.slug}` : undefined;
        permanentlyDeleteLocalScreenGroup(group.id);
        if (groupPath && (pathname === groupPath || pathname.startsWith(`${groupPath}/`))) router.replace(`/screens/${unit!.slug}`);
        onDeleted();
      } catch (cause) { setError(storageErrorMessage(cause)); }
    }} className="rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40">Delete group</button></div>
  </div></div>, document.body);
}
