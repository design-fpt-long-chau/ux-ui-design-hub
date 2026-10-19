"use client";
import { useEffect, useId, useRef, useState } from "react";
import { DeleteGroupDialog } from "@/components/manage/delete-group-dialog";
import { Check, ChevronRight, Trash2, X } from "lucide-react";
import type { ScreenGroup } from "@/types/design-library";
import { createLocalScreenGroup, renameLocalScreenGroup } from "@/lib/repositories/client";
import { storageErrorMessage } from "@/lib/storage-errors";

export function TreeGroupName({ group, editing, draft = false, expanded = false, onToggle, onEditingChange }: { group: ScreenGroup; editing: boolean; draft?: boolean; expanded?: boolean; onToggle: () => void; onEditingChange: (id?: string) => void }) {
  const [name, setName] = useState(group.name);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [height, setHeight] = useState(32);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const id = useId();
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => { if (editing && !confirm) { input.current?.focus(); input.current?.select(); } }, [editing, confirm]);
  useEffect(() => {
    if (!editing || confirm) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) onEditingChange(undefined); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [editing, confirm, onEditingChange]);
  const cancel = () => { onEditingChange(undefined); setError(""); requestAnimationFrame(() => button.current?.focus()); };
  const start = () => { clearTimeout(timer.current); setHeight(Math.max(32, button.current?.getBoundingClientRect().height ?? 32)); setName(group.name); setError(""); setConfirm(false); onEditingChange(group.id); };
  const save = () => {
    try {
      if (draft) createLocalScreenGroup({ ...group, name: name.trim() });
      else renameLocalScreenGroup(group.id, name);
      cancel();
    } catch (cause) { setError(storageErrorMessage(cause)); }
  };
  return <div ref={root} className="relative min-w-0" onClick={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()}>
    {editing ? <div style={{ minHeight: height }} className="subgroup-input-enter flex items-center gap-1 pr-1">
      <span className="grid size-7 shrink-0 place-items-center text-slate-400"><ChevronRight size={14}/></span>
      <input ref={input} aria-label={draft ? "New group name" : "Group name"} aria-invalid={Boolean(error)} aria-describedby={error ? id : undefined} value={name} onChange={event => { setName(event.target.value); setError(""); }} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); save(); } if (event.key === "Escape") { event.preventDefault(); cancel(); } }} className="tree-flow-name-input min-w-0 flex-1 rounded border border-slate-300 bg-white text-xs text-slate-700"/>
      <button type="button" aria-label="Save group name" title="Save" onClick={save} className="grid size-6 shrink-0 place-items-center rounded text-blue-700 hover:bg-blue-50"><Check size={14}/></button>
      {draft ? <button type="button" aria-label="Cancel group creation" onClick={cancel} className="grid size-6 shrink-0 place-items-center rounded text-slate-400 hover:bg-slate-100"><X size={14}/></button> : <button type="button" aria-label="Delete group" title="Delete group" onClick={() => { setError(""); setConfirm(true); }} className="grid size-6 shrink-0 place-items-center rounded text-slate-400 hover:bg-red-50 hover:text-red-600 focus-visible:text-red-600"><Trash2 size={14}/></button>}
    </div> : <button ref={button} type="button" aria-expanded={expanded} aria-label={(expanded ? "Thu gọn " : "Mở rộng ") + group.name} title={`${group.name} · Double-click or press F2 to rename`} onClick={event => { clearTimeout(timer.current); if (event.detail === 0) onToggle(); else if (event.detail === 1) timer.current = setTimeout(onToggle, 400); }} onDoubleClick={start} onKeyDown={event => { if (event.key === "F2") { event.preventDefault(); start(); } }} className="flex min-h-8 w-full items-center rounded-md pr-2 text-left text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-blue-700">
      <span className="grid size-7 shrink-0 place-items-center text-slate-400"><ChevronRight aria-hidden size={14} className={"transition-transform motion-duration-base " + (expanded ? "rotate-90" : "")}/></span><span>{group.name}</span>
    </button>}
    {editing && error && !confirm && <p id={id} role="alert" className="py-1 text-[10px] text-red-600">{error}</p>}
    {confirm && <DeleteGroupDialog group={group} onCancel={() => { setConfirm(false); setError(""); }} onDeleted={() => { setConfirm(false); onEditingChange(undefined); }}/>}
  </div>;
}
