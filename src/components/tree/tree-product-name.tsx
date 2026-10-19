"use client";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, Trash2, X } from "lucide-react";
import type { BusinessUnit } from "@/types/design-library";
import { businessUnitContents, createLocalBusinessUnit, deleteLocalBusinessUnit, renameLocalBusinessUnit } from "@/lib/repositories/client";
import { useBusinessUnitInventory } from "@/lib/use-business-units";
import { useModalFocus } from "@/components/ui/use-modal-focus";
import { storageErrorMessage } from "@/lib/storage-errors";

export function TreeProductName({ unit, editing, draft = false, onEditingChange }: { unit: BusinessUnit; editing: boolean; draft?: boolean; onEditingChange: (id?: string) => void }) {
  const units = useBusinessUnitInventory();
  const pathname = usePathname();
  const router = useRouter();
  const [name, setName] = useState(unit.name);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [destination, setDestination] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const link = useRef<HTMLAnchorElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dialog = useModalFocus(confirm, () => setConfirm(false));
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => { if (editing && !confirm) { input.current?.focus(); input.current?.select(); } }, [editing, confirm]);
  useEffect(() => {
    if (!editing || confirm) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) onEditingChange(); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [editing, confirm, onEditingChange]);
  const cancel = () => { onEditingChange(); setError(""); requestAnimationFrame(() => link.current?.focus()); };
  const save = () => { try { if (draft) createLocalBusinessUnit(name); else renameLocalBusinessUnit(unit.id, name); cancel(); } catch (cause) { setError(storageErrorMessage(cause)); } };
  const start = () => { clearTimeout(timer.current); setName(unit.name); setError(""); onEditingChange(unit.id); };
  const contents = confirm ? businessUnitContents(unit.id) : undefined;
  const occupied = Boolean(contents && (contents.groups.length || contents.flows.length || contents.screens.length || contents.draft));
  const remove = () => {
    try {
      deleteLocalBusinessUnit(unit.id, acknowledged, destination);
      setConfirm(false);
      cancel();
      if (pathname === `/screens/${unit.slug}` || pathname.startsWith(`/screens/${unit.slug}/`)) router.push(destination ? `/screens/${units.find(item => item.id === destination)?.slug}` : "/screens");
    } catch (cause) { setError(storageErrorMessage(cause)); }
  };
  return <div ref={root} className="min-w-0 flex-1" onDoubleClick={event => event.stopPropagation()}>
    {editing ? <div className="flex min-h-9 items-center gap-1">
      <input ref={input} aria-label={draft ? "New product name" : "Product name"} aria-invalid={Boolean(error)} value={name} onChange={event => { setName(event.target.value); setError(""); }} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); save(); } if (event.key === "Escape") { event.preventDefault(); cancel(); } }} className="tree-flow-name-input min-w-0 flex-1 rounded border border-slate-300 bg-white text-xs text-slate-800"/>
      <button type="button" aria-label="Save product name" onClick={save} className="grid size-7 shrink-0 place-items-center rounded text-blue-700 hover:bg-blue-50"><Check size={14}/></button>
      <button type="button" aria-label={draft ? "Cancel product creation" : "Delete product"} onClick={() => { if (draft) cancel(); else { setError(""); setAcknowledged(false); setDestination(""); setConfirm(true); } }} className="grid size-7 shrink-0 place-items-center rounded text-slate-400 hover:bg-red-50 hover:text-red-600 focus-visible:text-red-600">{draft ? <X size={14}/> : <Trash2 size={14}/>}</button>
    </div> : <Link ref={link} href={`/screens/${unit.slug}`} title={`${unit.name} · Double-click or press F2 to rename`} onClick={event => { if (event.detail && !event.ctrlKey && !event.metaKey && !event.shiftKey) { event.preventDefault(); clearTimeout(timer.current); if (event.detail === 1) timer.current = setTimeout(() => link.current?.click(), 300); } }} onDoubleClick={event => { event.preventDefault(); start(); }} onKeyDown={event => { if (event.key === "F2") { event.preventDefault(); start(); } }} className="block min-w-0 truncate rounded py-2 pr-2 text-[13px] font-semibold text-slate-800 hover:text-blue-700">{unit.name}</Link>}
    {error && !confirm && <p role="alert" className="py-1 text-xs text-red-600">{error}</p>}
    {confirm && createPortal(<div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/40 p-5"><div ref={dialog} role="alertdialog" aria-modal="true" aria-label="Delete product" className="w-full max-w-md rounded-xl bg-white library-dialog-padding shadow-xl">
      <h2 className="text-base font-semibold text-slate-950">Delete this product permanently?</h2><p className="mt-2 text-sm text-slate-600">This action cannot be undone. Canonical Screens and assets will not be deleted.</p>
      {occupied && <label className="mt-4 block text-xs text-slate-600">Move all groups, flows, screens and drafts to<select aria-label="Destination product" value={destination} onChange={event => setDestination(event.target.value)} className="mt-2 w-full rounded-md border border-slate-300 bg-white p-2"><option value="">Choose product</option>{units.filter(item => item.id !== unit.id).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
      <label className="mt-4 flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)}/>Tôi đã hiểu và đồng ý với hành động này.</label>
      {error && <p role="alert" className="mt-3 text-xs text-red-600">{error}</p>}
      <div className="mt-5 flex justify-end gap-2"><button data-dialog-autofocus type="button" onClick={() => setConfirm(false)} className="rounded-md px-3 py-2 text-sm text-slate-600">Cancel</button><button type="button" disabled={!acknowledged || (occupied && !destination)} onClick={remove} className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Delete product</button></div>
    </div></div>, document.body)}
  </div>;
}
