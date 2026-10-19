"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, GitBranch, Trash2 } from "lucide-react";
import { deleteLocalFlow, updateLocalFlow } from "@/lib/repositories/client";
import { flowOwnerGroupId } from "@/lib/flow-context";
import { storageErrorMessage } from "@/lib/storage-errors";
import type { Flow } from "@/types/design-library";

export function TreeFlowName({ flow, flows, selected, editing, onEditingChange }: { flow: Flow; flows: Flow[]; selected: boolean; editing: boolean; onEditingChange: (flowId?: string) => void }) {
  const router = useRouter();
  const [name, setName] = useState(flow.name);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [height, setHeight] = useState(32);
  const link = useRef<HTMLAnchorElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const errorId = useId();
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => { if (editing && !confirm) { input.current?.focus(); input.current?.select(); } }, [editing, confirm]);
  useEffect(() => { if (confirm) cancelButton.current?.focus(); }, [confirm]);
  useEffect(() => {
    if (!editing || confirm) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) onEditingChange(undefined);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [editing, confirm, onEditingChange]);
  const start = () => { clearTimeout(timer.current); setHeight(Math.max(32, link.current?.getBoundingClientRect().height ?? 32)); setName(flow.name); setError(""); setConfirm(false); onEditingChange(flow.id); };
  const cancel = () => { onEditingChange(undefined); setError(""); requestAnimationFrame(() => link.current?.focus()); };
  const save = () => {
    const value = name.trim();
    if (!value) return setError("Enter a flow name.");
    if (flows.some(item => item.id !== flow.id && item.businessUnitId === flow.businessUnitId && flowOwnerGroupId(item) === flowOwnerGroupId(flow) && item.name.trim().toLocaleLowerCase() === value.toLocaleLowerCase())) return setError("A flow with this name already exists in this group.");
    try { updateLocalFlow(flow.id, { name: value, description: flow.description }); cancel(); } catch (cause) { setError(storageErrorMessage(cause)); }
  };
  return <div ref={root} className="relative min-w-0 flex-1" onClick={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()}>
    {editing ? <div style={{ minHeight: height }} className="flex items-center gap-1 pr-1">
      <GitBranch aria-hidden size={14} className="shrink-0 text-blue-500"/>
      <input ref={input} aria-label="Flow name" aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} value={name} onChange={event => { setName(event.target.value); setError(""); }} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); save(); } if (event.key === "Escape") { event.preventDefault(); cancel(); } }} className="tree-flow-name-input min-w-0 flex-1 rounded border border-slate-300 bg-white text-xs text-slate-700"/>
      <button type="button" aria-label="Save flow name" title="Save" onClick={save} className="grid size-6 shrink-0 place-items-center rounded text-blue-700 hover:bg-blue-50"><Check aria-hidden size={14}/></button>
      <button type="button" aria-label="Delete flow" title="Delete flow" onClick={() => { setError(""); setConfirm(true); }} className="grid size-6 shrink-0 place-items-center rounded text-slate-400 hover:bg-red-50 hover:text-red-600 focus-visible:text-red-600"><Trash2 aria-hidden size={14}/></button>
    </div> : <Link ref={link} draggable={false} href={`/flows/${flow.slug}`} aria-current={selected ? "page" : undefined} title={`${flow.name} · Double-click or press F2 to rename`} onClick={event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); clearTimeout(timer.current);
      if (event.detail === 0) router.push(`/flows/${flow.slug}`);
      else if (event.detail === 1) timer.current = setTimeout(() => router.push(`/flows/${flow.slug}`), 400);
    }} onDoubleClick={event => { event.preventDefault(); start(); }} onKeyDown={event => { if (event.key === "F2") { event.preventDefault(); start(); } }} className="flex min-h-8 min-w-0 items-center gap-1.5 rounded py-1.5 pr-2 text-xs font-medium text-blue-700 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><GitBranch aria-hidden size={14} className="shrink-0 text-blue-500"/><span className="min-w-0 break-words">{flow.name}</span></Link>}
    {editing && error && !confirm && <p id={errorId} role="alert" className="py-1 text-[10px] text-red-600">{error}</p>}
    {confirm && createPortal(<div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/35 p-5" onClick={event => event.stopPropagation()}><div role="alertdialog" aria-modal="true" aria-label="Delete this flow?" aria-describedby={`${errorId}-delete`} className="w-full max-w-md rounded-xl border border-slate-200 bg-white library-dialog-padding shadow-xl" onKeyDown={event => {
      if (event.key === "Escape") { event.preventDefault(); setConfirm(false); setError(""); }
      if (event.key === "Tab") { const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>("button"); const first = buttons[0], last = buttons[buttons.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } }
    }}><h2 className="text-base font-semibold text-slate-950">Delete this flow?</h2><p id={`${errorId}-delete`} className="mt-2 text-sm text-slate-600">Screens inside this flow will remain in the Library.</p><p className="mt-2 text-xs font-medium text-slate-500">{flow.name}</p>{error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}<div className="mt-5 flex justify-end gap-2"><button ref={cancelButton} type="button" onClick={() => { setConfirm(false); setError(""); }} className="rounded-md px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button><button type="button" onClick={() => { try { deleteLocalFlow(flow.id); setConfirm(false); onEditingChange(undefined); if (selected) router.push(`/flows?businessUnitId=${encodeURIComponent(flow.businessUnitId)}`); } catch (cause) { setError(storageErrorMessage(cause)); } }} className="rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700">Delete flow</button></div></div></div>, document.body)}
  </div>;
}
