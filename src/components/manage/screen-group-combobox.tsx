"use client";
import { DeleteGroupDialog } from "@/components/manage/delete-group-dialog";
import { FieldError } from "@/components/ui/field-error";
import { MotionPresence } from "@/components/ui/motion-presence";

import { MoreHorizontal, Plus, Search, X } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createLocalScreenGroup, renameLocalScreenGroup } from "@/lib/repositories/client";
import { groupLabel, groupParent, groupPath, orderedGroups } from "@/lib/screen-groups";
import type { ScreenGroup } from "@/types/design-library";

const field = "mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900";
function slugify(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

function InlineSubgroup({ parent, depth, onSave, onCancel }: { parent: ScreenGroup; depth: number; onSave: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState("Untitled subgroup");
  const [error, setError] = useState("");
  const finished = useRef(false);
  const cancel = () => { finished.current = true; onCancel(); };
  const save = () => {
    if (finished.current) return;
    if (!name.trim()) { setError("Enter a subgroup name."); return; }
    finished.current = true;
    try { onSave(name.trim()); } catch (cause) {
      finished.current = false;
      setError(cause instanceof Error ? cause.message : "Unable to create subgroup.");
    }
  };
  return <div onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); cancel(); } }} className={`subgroup-draft-enter py-2 pr-3 ${depth === 1 ? "pl-6" : "pl-9"}`}>
    <div className="relative">
    <input autoFocus aria-label={`New subgroup in ${parent.name}`} aria-invalid={Boolean(error)} value={name}
      onFocus={(event) => event.currentTarget.select()} onChange={(event) => { setName(event.target.value); setError(""); }}
      onKeyDown={(event) => {
        if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); save(); }
      }} className="form-control-trailing subgroup-input-enter h-9 w-full rounded border border-blue-300 bg-white pl-2 pr-9 text-xs outline-none focus:ring-2 focus:ring-blue-500"/>
    <button type="button" aria-label={`Cancel subgroup creation in ${parent.name}`} title="Cancel creation" onClick={(event) => { event.stopPropagation(); cancel(); }} className="absolute right-1 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><X size={14}/></button>
    </div>
    <FieldError>{error}</FieldError>
  </div>;
}

export function ScreenGroupCombobox({ businessUnitId, groups, value, onChange, error }: { businessUnitId: string; groups: ScreenGroup[]; value: string; onChange: (id: string) => void; error?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLDivElement | null>>([]);
  const listId = useId();
  const [open, setOpenState] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, maxHeight: 320 });
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const parentId = "";
  const [manageTarget, setManageTarget] = useState<ScreenGroup>();
  const [renameTarget, setRenameTarget] = useState<ScreenGroup>();
  const [renameName, setRenameName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ScreenGroup>();
  const [dialogError, setDialogError] = useState("");
  const [inlineParent, setInlineParent] = useState<string>();
  const [hoveredParent, setHoveredParent] = useState<string>();
  const [focusedParent, setFocusedParent] = useState<string>();
  const [exiting, setExiting] = useState(false);
  const [insertedId, setInsertedId] = useState<string>();
  const setOpen = (next: boolean) => { setExiting(!next && open); setOpenState(next); };
  useEffect(() => {
    if (!exiting) return;
    const timer = window.setTimeout(() => setExiting(false), window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 140);
    return () => window.clearTimeout(timer);
  }, [exiting]);
  const selected = groups.find((group) => group.id === value);
  const filtered = useMemo(() => orderedGroups(groups).filter((group) => groupLabel(group, groups).toLocaleLowerCase("vi").includes(query.trim().toLocaleLowerCase("vi"))), [groups, query]);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!inlineParent && !rootRef.current?.contains(event.target as Node) && !panelRef.current?.contains(event.target as Node)) { setExiting(open); setOpenState(false); }
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [inlineParent, open]);
  useLayoutEffect(() => {
    if (!open || !businessUnitId) return;
    const update = () => {
      const rect = controlRef.current?.getBoundingClientRect();
      if (!rect) return;
      const gap = 8;
      setPosition({ top: rect.bottom + gap, left: rect.left, width: rect.width, maxHeight: Math.max(0, Math.min(360, window.innerHeight - rect.bottom - gap * 2)) });
    };
    update();
    const observer = new ResizeObserver(update);
    if (controlRef.current) observer.observe(controlRef.current);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => { observer.disconnect(); window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [open, businessUnitId, creating]);
  useEffect(() => { if (open) optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" }); }, [activeIndex, open]);

  const focusInput = () => inputRef.current?.focus();
  const choose = (group: ScreenGroup) => { onChange(group.id); setQuery(""); setOpen(false); setCreating(false); focusInput(); };
  const startCreate = () => { setNewName(query.trim());  setDialogError(""); setCreating(true); setManageTarget(undefined); };
  const saveGroup = (name: string, parentId: string, keepOpen = false) => {
    const parent = groups.find((group) => group.id === parentId);
    const baseSlug = [parent?.slug, slugify(name) || "group"].filter(Boolean).join("-");
    let slug = baseSlug;
    let suffix = 2;
    while (groups.some((group) => group.id === `${businessUnitId}.${slug}` || group.slug === slug)) slug = `${baseSlug}-${suffix++}`;
    const group: ScreenGroup = { id: `${businessUnitId}.${slug}`, businessUnitId, name, slug, parentGroupId: parentId || null, sequence: Math.max(0, ...groups.map((item) => item.sequence)) + 1, description: "", screenIds: [] };
    createLocalScreenGroup(group);
    setInsertedId(group.id);
    setInlineParent(undefined);
    if (keepOpen) {
      onChange(group.id);
      setFocusedParent(parentId);
      setHoveredParent(undefined);
      optionRefs.current[filtered.findIndex((item) => item.id === parentId)]?.querySelector<HTMLButtonElement>("button")?.focus();
    } else choose(group);
  };
  const create = () => {
    const name = newName.trim();
    if (!name) return setDialogError("Enter a group name.");
    try { saveGroup(name, parentId); } catch (err) { setDialogError(err instanceof Error ? err.message : "Unable to create group."); }
  };
  const saveRename = () => {
    const name = renameName.trim();
    if (!renameTarget || !name) return setDialogError("Enter a group name.");
    if (groups.some((group) => group.id !== renameTarget.id && (group.parentGroupId ?? null) === (renameTarget.parentGroupId ?? null) && group.name.trim().toLocaleLowerCase("vi") === name.toLocaleLowerCase("vi"))) return setDialogError("A group with this name already exists under this parent.");
    try { renameLocalScreenGroup(renameTarget.id, name); setRenameTarget(undefined); focusInput(); } catch (err) { setDialogError(err instanceof Error ? err.message : "Unable to rename group."); }
  };


  return <div ref={rootRef} className="screen-group-combobox relative">
    <label htmlFor={listId + "-input"} className="block text-xs font-medium text-slate-600">Screen Group *</label>
    <div ref={controlRef} data-invalid={Boolean(error)} data-disabled={!businessUnitId} className="form-control-frame mt-2 flex items-center bg-white px-3">
      <Search size={14} className="shrink-0 text-slate-400"/>
      <input ref={inputRef} id={listId + "-input"} role="combobox" aria-label="Screen Group *" aria-expanded={open} aria-controls={open && !creating ? listId : undefined} aria-autocomplete="list" aria-invalid={Boolean(error)} aria-activedescendant={open && !creating && filtered[activeIndex] ? `${listId}-${activeIndex}` : undefined} disabled={!businessUnitId} value={open ? query : selected ? groupLabel(selected, groups) : ""} placeholder="Search or select group..."
        onClick={() => { setQuery(""); setActiveIndex(0); setCreating(false); setOpen(true); }}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); setCreating(false); setActiveIndex(0); }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); setCreating(false); setActiveIndex((index) => Math.max(0, Math.min(filtered.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)))); }
          else if (event.key === "Enter") { event.preventDefault(); if (!open) { setQuery(""); setOpen(true); } else if (filtered[activeIndex]) choose(filtered[activeIndex]); else startCreate(); }
          else if (event.key === "Escape") { event.preventDefault(); setOpen(false); }
        }} className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm text-slate-900 outline-none focus-visible:outline-none disabled:cursor-not-allowed"/>
    </div>
    <FieldError>{error}</FieldError>
    {(open || exiting) && businessUnitId && createPortal(<div ref={panelRef} style={position} data-open={open} inert={!open} aria-hidden={!open} className="screen-group-panel-motion add-screen-group-panel fixed z-[80] flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-900 shadow-xl"
      onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); setOpen(false); focusInput(); } }}>
      {creating ? <div role="group" aria-label="Create screen group" className="overflow-y-auto p-3">
        <p className="text-sm font-semibold">Create screen group</p>
        <label className="mt-3 block text-xs font-medium">Group name *<input autoFocus aria-invalid={Boolean(dialogError)} value={newName} onChange={(event) => { setNewName(event.target.value); setDialogError(""); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); create(); } }} className={field}/></label>
        <FieldError>{dialogError}</FieldError>
        <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => { setCreating(false); focusInput(); }} className="rounded px-3 py-2 text-xs">Cancel</button><button type="button" onClick={create} className="rounded bg-blue-700 px-3 py-2 text-xs font-semibold text-white">Create group</button></div>
      </div> : <>
        <div id={listId} role="listbox" aria-label="Screen groups" className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {filtered.map((group, index) => { const parent = groupParent(group, groups); const depth = groupPath(group, groups)?.length; return <div key={group.id} ref={(element) => { optionRefs.current[index] = element; }} onMouseEnter={() => { setHoveredParent(group.id); if (!inlineParent) setActiveIndex(index); }} onMouseLeave={() => setHoveredParent(undefined)} onFocus={() => { setHoveredParent(undefined); setFocusedParent(group.id); if (!inlineParent) setActiveIndex(index); }} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusedParent(undefined); }} data-group-context={group.id} onAnimationEnd={() => { if (insertedId === group.id) setInsertedId(undefined); }} className={`rounded-md ${insertedId === group.id ? "subgroup-row-enter" : ""}`}>
            <div id={`${listId}-${index}`} role="option" aria-label={groupLabel(group, groups)} aria-selected={group.id === value} className={`flex items-center rounded-md ${index === activeIndex ? "bg-blue-50" : "hover:bg-slate-50"}`}><button type="button" onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(group)} className={`min-w-0 flex-1 break-words py-2 pr-2 text-left text-xs font-medium ${groupPath(group, groups)?.length === 3 ? "pl-9" : parent ? "pl-6" : "pl-3"}`}>{group.name}{parent && query.trim() && <span className="mt-0.5 block text-[10px] font-normal text-slate-500">{groupLabel(group, groups)}</span>}</button><button type="button" aria-label={`Manage ${groupLabel(group, groups)}`} aria-expanded={manageTarget?.id === group.id} onClick={() => setManageTarget((current) => current?.id === group.id ? undefined : group)} className="mr-1 grid size-8 shrink-0 place-items-center rounded text-slate-500 hover:bg-white"><MoreHorizontal size={14}/></button></div>
            {inlineParent === group.id ? <InlineSubgroup parent={group} depth={depth ?? 1} onSave={(name) => saveGroup(name, group.id, true)} onCancel={() => { setInlineParent(undefined); setFocusedParent(group.id); optionRefs.current[index]?.querySelector<HTMLButtonElement>("button")?.focus(); }}/> : depth && depth < 3 && <div className="subgroup-action-motion" data-visible={!inlineParent && (hoveredParent ?? focusedParent) === group.id} inert={Boolean(inlineParent) || (hoveredParent ?? focusedParent) !== group.id} aria-hidden={Boolean(inlineParent) || (hoveredParent ?? focusedParent) !== group.id}><div className="min-h-0 overflow-hidden"><button type="button" onClick={() => { setInlineParent(group.id); setManageTarget(undefined); }} className={`flex w-full items-center gap-1.5 py-2 pr-3 text-left text-[11px] text-blue-600 hover:text-blue-800 focus-visible:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${depth === 1 ? "pl-6" : "pl-9"}`}><Plus size={12} className="shrink-0"/>Create {group.name} sub-group</button></div></div>}
            {manageTarget?.id === group.id && <div className="flex justify-end gap-1 border-t border-slate-100 p-1"><button type="button" onClick={() => { setOpen(false); setRenameTarget(group); setRenameName(group.name); setDialogError(""); }} className="rounded px-3 py-2 text-xs">Rename</button><button type="button" onClick={() => { setOpen(false); setDeleteTarget(group); setDialogError(""); }} className="rounded px-3 py-2 text-xs text-red-600">Delete</button></div>}
          </div>; })}
          {!filtered.length && <p className="px-3 py-3 text-xs text-slate-500">No matching group</p>}
        </div>
        <div className="shrink-0 border-t border-slate-200 bg-white p-1.5"><button type="button" onClick={startCreate} className="flex w-full items-center gap-2 rounded px-3 py-2.5 text-left text-xs font-semibold text-blue-700 hover:bg-blue-50"><Plus size={14} className="shrink-0"/><span className="break-words">{query.trim() ? `Create “${query.trim()}”` : "Create new group"}</span></button></div>
      </>}
    </div>, document.body)}
    <MotionPresence>{renameTarget && <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/35 p-5"><div role="dialog" aria-modal="true" aria-label="Rename group" className="w-full max-w-sm rounded-xl bg-white library-dialog-padding shadow-xl"><h2 className="text-sm font-semibold">Rename group</h2><label className="mt-4 block text-xs">Group name<input autoFocus aria-invalid={Boolean(dialogError)} value={renameName} onChange={(event) => { setRenameName(event.target.value); setDialogError(""); }} className={field}/></label><FieldError>{dialogError}</FieldError><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => { setRenameTarget(undefined); focusInput(); }} className="px-3 py-2 text-xs">Cancel</button><button type="button" onClick={saveRename} className="rounded bg-blue-700 px-3 py-2 text-xs text-white">Save name</button></div></div></div>}</MotionPresence>
    {deleteTarget && <DeleteGroupDialog key={deleteTarget.id} group={deleteTarget} onCancel={() => { setDeleteTarget(undefined); focusInput(); }} onDeleted={() => { if (value === deleteTarget.id) onChange(""); setDeleteTarget(undefined); setOpen(false); focusInput(); }}/>}
  </div>;
}
