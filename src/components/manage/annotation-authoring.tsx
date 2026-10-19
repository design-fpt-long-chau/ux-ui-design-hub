"use client";
import { FieldError } from "@/components/ui/field-error";
/* eslint-disable @next/next/no-img-element -- authoring previews are browser-local data URLs. */

import { Check, ChevronDown, Plus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { createCustomNoteType, useCustomNoteTypes } from "@/lib/repositories/client";
import { predefinedNoteTypes, resolveNoteTypeId, validateNoteTypeName } from "@/lib/note-types";
import type { ContextualAnnotation, NoteTypeDefinition, ScreenPlatform } from "@/types/design-library";

const fieldClass = "mt-1 w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none focus:border-blue-500";

type EditorDraft = Pick<ContextualAnnotation, "type" | "typeId" | "title" | "description" | "component" | "jira" | "figma">;

const emptyEditor: EditorDraft = { type: "Interaction", typeId: predefinedNoteTypes[0].id, title: "", description: "", component: "", jira: "", figma: "" };

export function AnnotationAuthoring({ preview, platform, annotations, onChange }: { preview?: string; platform: ScreenPlatform; annotations: ContextualAnnotation[]; onChange: (annotations: ContextualAnnotation[]) => void }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const draggedRef = useRef(false);
  const [activeId, setActiveId] = useState<string>();
  const [temporary, setTemporary] = useState<{ x: number; y: number }>();
  const [editor, setEditor] = useState<EditorDraft>(emptyEditor);
  const [editing, setEditing] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const customNoteTypes = useCustomNoteTypes();
  const noteTypes = [...predefinedNoteTypes, ...customNoteTypes];

  const closeEditor = () => { setTemporary(undefined); setActiveId(undefined); setEditing(false); setEditor(emptyEditor); };
  const selectAnnotation = (annotation: ContextualAnnotation) => { setTemporary(undefined); setActiveId(annotation.id); setEditing(true); setEditor({ type: annotation.type, typeId: resolveNoteTypeId(annotation.type, annotation.typeId, noteTypes), title: annotation.title, description: annotation.description, component: annotation.component ?? "", jira: annotation.jira ?? "", figma: annotation.figma ?? "" }); };

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && !event.defaultPrevented) closeEditor(); };
    const onOutside = (event: PointerEvent) => { if (!editorRef.current?.contains(event.target as Node) && (temporary || editing)) closeEditor(); };
    document.addEventListener("keydown", onEscape);
    document.addEventListener("pointerdown", onOutside);
    return () => { document.removeEventListener("keydown", onEscape); document.removeEventListener("pointerdown", onOutside); };
  }, [editing, temporary]);

  const pointFromEvent = (clientX: number, clientY: number) => {
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) return;
    return { x: Math.max(0, Math.min(100, ((clientX - bounds.left) / bounds.width) * 100)), y: Math.max(0, Math.min(100, ((clientY - bounds.top) / bounds.height) * 100)) };
  };
  const beginNote = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!preview || temporary || editing || draggedRef.current || (event.target as HTMLElement).closest("button, input, select, textarea, a")) { draggedRef.current = false; return; }
    const point = pointFromEvent(event.clientX, event.clientY); if (!point) return;
    setTemporary(point); setActiveId(undefined); setEditing(false); setEditor(emptyEditor);
  };
  const saveNote = () => {
    if (!editor.title.trim() || !editor.description.trim()) return;
    if (editing && activeId) onChange(annotations.map(annotation => annotation.id === activeId ? { ...annotation, ...editor, title: editor.title.trim(), description: editor.description.trim() } : annotation));
    else if (temporary) onChange([...annotations, { id: `annotation.${Date.now()}`, platform, x: temporary.x, y: temporary.y, ...editor, title: editor.title.trim(), description: editor.description.trim() }]);
    closeEditor();
  };
  const removeNote = () => { if (activeId) onChange(annotations.filter(annotation => annotation.id !== activeId)); closeEditor(); };
  const moveNote = (annotation: ContextualAnnotation, event: React.DragEvent<HTMLButtonElement>) => {
    const point = pointFromEvent(event.clientX, event.clientY); if (!point) return;
    draggedRef.current = true;
    onChange(annotations.map(item => item.id === annotation.id ? { ...item, ...point } : item));
    setTimeout(() => { draggedRef.current = false; }, 0);
  };
  return <div className="mx-auto grid min-h-0 w-full max-w-7xl flex-1 gap-6 lg:grid-cols-[minmax(420px,2fr)_minmax(280px,1fr)]">
    <section className="flex min-h-[560px] items-center justify-center overflow-auto rounded-xl border border-slate-200 bg-slate-100/60 p-6 lg:p-8">
      {preview ? <div ref={canvasRef} onClick={beginNote} className={`relative cursor-crosshair overflow-hidden rounded-lg bg-white shadow-sm ${platform === "mobile" ? "aspect-[375/812] w-full max-w-[420px]" : "aspect-video w-full max-w-[920px]"}`}>
        <img src={preview} alt={`${platform} annotation preview`} className="size-full object-contain"/>
        {annotations.map((annotation, index) => <button key={annotation.id} type="button" draggable aria-label={`Annotation ${index + 1}: ${annotation.title}`} onDragStart={() => { draggedRef.current = true; }} onDragEnd={event => moveNote(annotation, event)} onClick={event => { event.stopPropagation(); if (draggedRef.current) { draggedRef.current = false; return; } selectAnnotation(annotation); }} className={`annotation-pin ${annotation.id === activeId ? "is-active" : ""}`} style={{ left: `${annotation.x}%`, top: `${annotation.y}%` }}><span className="annotation-pin-core"/><span className="sr-only">{index + 1}</span></button>)}
        {temporary && <span className="annotation-pin is-active pointer-events-none" style={{ left: `${temporary.x}%`, top: `${temporary.y}%` }}><span className="annotation-pin-core"/></span>}
        {annotations.length === 0 && !temporary && <p className="pointer-events-none absolute inset-x-4 bottom-4 rounded-md bg-slate-950/65 px-3 py-2 text-center text-xs font-medium text-white">Click anywhere on the screen to add a note</p>}
      </div> : <div className="text-center"><p className="text-sm font-semibold text-slate-700">Add a screenshot before placing notes</p><p className="mt-1 text-xs text-slate-500">Return to Screen Information to upload a preview.</p></div>}
    </section>
    <aside className="min-h-0 overflow-y-auto rounded-xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold tracking-[.12em] text-blue-700">NOTES</p><p className="mt-1 text-xs text-slate-500">{annotations.length} {annotations.length === 1 ? "note" : "notes"} · {platform === "mobile" ? "Mobile" : "Web"}</p></div>{preview && <button type="button" onClick={() => { setEditing(false); setActiveId(undefined); setTemporary({ x: 50, y: 50 }); setEditor(emptyEditor); }} className="grid size-9 place-items-center rounded-md border border-slate-200 text-blue-700 hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Add annotation"><Plus size={15}/></button>}</div>
      {(temporary || editing) && <AnnotationEditor ref={editorRef} value={editor} noteTypes={noteTypes} editing={editing} onChange={setEditor} onCancel={closeEditor} onSave={saveNote} onDelete={editing ? removeNote : undefined}/>}
      {annotations.length === 0 && !temporary ? <div className="mt-6 rounded-lg border border-dashed border-slate-200 p-4"><p className="text-xs font-semibold text-slate-700">No notes yet</p><p className="mt-1 text-[11px] leading-4 text-slate-500">Click anywhere on the screen to add a contextual note.</p></div> : annotations.length > 0 && <ol className="mt-4 space-y-2">{annotations.map((annotation, index) => <li key={annotation.id}><button type="button" onClick={() => selectAnnotation(annotation)} aria-label={`Annotation ${index + 1}: ${annotation.title}`} className={`w-full rounded-lg border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${activeId === annotation.id ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-200"}`}><span className="text-[9px] font-bold text-slate-400">{String(index + 1).padStart(2, "0")}</span><span className="ml-2 text-[9px] font-semibold uppercase tracking-[.08em] text-blue-700">{annotation.type}</span><strong className="mt-1 block text-xs text-slate-900">{annotation.title}</strong><span className="mt-1 block line-clamp-2 text-[10px] leading-4 text-slate-500">{annotation.description}</span></button></li>)}</ol>}
    </aside>
  </div>;
}

function AnnotationEditor({ ref, value, noteTypes, editing, onChange, onCancel, onSave, onDelete }: { ref: React.Ref<HTMLDivElement>; value: EditorDraft; noteTypes: NoteTypeDefinition[]; editing: boolean; onChange: (value: EditorDraft) => void; onCancel: () => void; onSave: () => void; onDelete?: () => void }) {
  return <div ref={ref} role="dialog" aria-label={editing ? "Edit annotation" : "Add annotation"} className="mt-4 rounded-lg border border-blue-200 bg-blue-50/40 p-3 text-left"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-900">{editing ? "Edit note" : "Add note"}</p><button type="button" onClick={onCancel} aria-label="Close annotation editor" className="grid size-6 place-items-center text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><X size={13}/></button></div><div className="mt-3 space-y-2.5"><NoteTypePicker value={value} types={noteTypes} onChange={onChange}/><label className="block text-[10px] font-medium text-slate-600">Title *<input value={value.title} onChange={event => onChange({ ...value, title: event.target.value })} className={fieldClass}/></label><label className="block text-[10px] font-medium text-slate-600">Rule / Note *<textarea rows={3} value={value.description} onChange={event => onChange({ ...value, description: event.target.value })} className={fieldClass}/></label><details><summary className="cursor-pointer text-[10px] font-semibold text-slate-500">Optional references</summary><div className="mt-2 space-y-2"><input aria-label="Component" placeholder="Component" value={value.component} onChange={event => onChange({ ...value, component: event.target.value })} className={fieldClass}/><input aria-label="Related Jira" placeholder="Jira" value={value.jira} onChange={event => onChange({ ...value, jira: event.target.value })} className={fieldClass}/><input aria-label="Figma reference" placeholder="Figma" value={value.figma} onChange={event => onChange({ ...value, figma: event.target.value })} className={fieldClass}/></div></details></div><div className="mt-3 flex items-center justify-between">{onDelete ? <button type="button" onClick={onDelete} className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600"><Trash2 size={12}/>Delete note</button> : <span/>}<div className="flex gap-2"><button type="button" onClick={onCancel} className="px-2 py-1.5 text-[10px] font-semibold text-slate-500">Cancel</button><button type="button" disabled={!value.title.trim() || !value.description.trim()} onClick={onSave} className="rounded bg-blue-700 px-2.5 py-1.5 text-[10px] font-semibold text-white disabled:opacity-40">{editing ? "Save changes" : "Add note"}</button></div></div></div>;
}

function NoteTypePicker({ value, types, onChange }: { value: EditorDraft; types: NoteTypeDefinition[]; onChange: (value: EditorDraft) => void }) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const error = validateNoteTypeName(name, types);

  useEffect(() => { if (creating) inputRef.current?.focus(); }, [creating]);
  useEffect(() => { if (open) menuRef.current?.querySelector<HTMLButtonElement>('[role="option"]')?.focus(); }, [open]);
  const cancelCreation = () => { setCreating(false); setName(""); setTouched(false); requestAnimationFrame(() => triggerRef.current?.focus()); };
  const addType = () => {
    setTouched(true);
    if (error) return;
    const type = createCustomNoteType(name);
    onChange({ ...value, type: type.name, typeId: type.id });
    setOpen(false);
    setCreating(false);
    setName("");
    setTouched(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };
  const choose = (type: NoteTypeDefinition) => { onChange({ ...value, type: type.name, typeId: type.id }); setOpen(false); requestAnimationFrame(() => triggerRef.current?.focus()); };

  return <div className="relative text-[10px] font-medium text-slate-600">
    <span id="note-type-label">Type *</span>
    <button ref={triggerRef} type="button" aria-labelledby="note-type-label" aria-haspopup="listbox" aria-expanded={open} onClick={() => { setOpen(current => !current); setCreating(false); }} onKeyDown={event => { if (["ArrowDown", "Enter", " "].includes(event.key) && !open) { event.preventDefault(); setOpen(true); } }} className={`form-control ${fieldClass} flex items-center justify-between text-left`}>
      <span className="truncate">{value.type}</span><ChevronDown size={14} className="shrink-0 text-slate-400"/>
    </button>
    {open && <div ref={menuRef} role="listbox" aria-label="Note types" onKeyDown={event => { const options = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button')); if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); requestAnimationFrame(() => triggerRef.current?.focus()); return; } if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); options[event.key === 'Home' ? 0 : options.length - 1]?.focus(); return; } if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return; event.preventDefault(); const index = options.indexOf(document.activeElement as HTMLButtonElement); options[(index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length]?.focus(); }} className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg">
      {types.map(type => <button key={type.id} type="button" role="option" aria-selected={value.typeId === type.id || (!value.typeId && value.type === type.name)} onClick={() => choose(type)} className="flex w-full items-center justify-between px-2.5 py-2 text-left text-xs font-normal text-slate-700 hover:bg-slate-50 focus:bg-blue-50 focus:outline-none"><span className="truncate">{type.name}</span>{(value.typeId === type.id || (!value.typeId && value.type === type.name)) && <Check size={13} className="text-blue-700"/>}</button>)}
      <div className="mt-1 border-t border-slate-200 pt-1"><button type="button" onClick={() => { setOpen(false); setCreating(true); }} className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-xs font-semibold text-blue-700 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"><Plus size={13}/>Add new type</button></div>
    </div>}
    {creating && <div className="mt-2 rounded-md border border-slate-200 bg-white p-2.5 shadow-sm" onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); cancelCreation(); } if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); addType(); } }}>
      <label className="block text-[10px] font-medium text-slate-600">New type name<input ref={inputRef} value={name} maxLength={80} placeholder="Enter type name" onChange={event => { setName(event.target.value); setTouched(true); }} aria-invalid={Boolean(touched && error)} aria-describedby={touched && error ? "note-type-error" : undefined} className={fieldClass}/></label>
      <FieldError id="note-type-error">{touched ? error : undefined}</FieldError>
      <div className="mt-2 flex justify-end gap-2"><button type="button" onClick={cancelCreation} className="px-2 py-1.5 text-[10px] font-semibold text-slate-500">Cancel</button><button type="button" disabled={Boolean(error)} onClick={addType} className="rounded bg-blue-700 px-2.5 py-1.5 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Add type</button></div>
    </div>}
  </div>;
}

export function AnnotationReview({ preview, platform, annotations }: { preview?: string; platform: ScreenPlatform; annotations: ContextualAnnotation[] }) {
  return <div className="grid gap-6 lg:grid-cols-[minmax(320px,1fr)_300px]"><div className="flex min-h-[420px] items-center justify-center rounded-xl border border-slate-200 bg-slate-100/60 p-8">{preview ? <div className={`relative overflow-hidden rounded-lg bg-white shadow-sm ${platform === "mobile" ? "w-full max-w-[300px] aspect-[375/812]" : "w-full max-w-[760px] aspect-video"}`}><img src={preview} alt="Review preview" className="size-full object-contain"/>{annotations.map(annotation => <span key={annotation.id} className="annotation-pin pointer-events-none" style={{ left: `${annotation.x}%`, top: `${annotation.y}%` }}><span className="annotation-pin-core"/></span>)}</div> : <p className="text-xs text-slate-500">No preview</p>}</div><div><p className="text-[10px] font-semibold tracking-[.12em] text-blue-700">ANNOTATIONS</p><p className="mt-1 text-sm font-semibold text-slate-900">{annotations.length} {annotations.length === 1 ? "note" : "notes"}</p><ol className="mt-4 space-y-3">{annotations.map((annotation, index) => <li key={annotation.id} className="border-b border-slate-100 pb-3"><p className="text-[9px] font-semibold text-blue-700">{String(index + 1).padStart(2, "0")} · {annotation.type}</p><p className="mt-1 text-xs font-semibold text-slate-900">{annotation.title}</p></li>)}</ol></div></div>;
}
