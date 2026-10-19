"use client";
import { repositories } from "@/lib/repositories/provider";
import { ImagePlus, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { ScreenPreview } from "@/components/screens/screen-preview";
import type { RepresentationDraft } from "@/lib/repositories/client";
import type { ScreenPlatform } from "@/types/design-library";

const acceptedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const stateTypes = ["Empty", "Filled", "Loading", "Success", "Error", "Warning", "Disabled", "Selected", "Unselected", "Expanded", "Collapsed", "No result", "Offline", "Expired", "Other / Custom"] as const;

function readImage(file: File, onReady: (preview: string) => void, onError: (message: string) => void) {
  if (!acceptedTypes.has(file.type)) return onError("Use PNG, JPG, JPEG or WEBP.");
  if (file.size > 2 * 1024 * 1024) return onError("Use an image smaller than 2 MB for this local MVP.");
  repositories.assets.importFile(file, onReady);
}

function RepresentationItem({ item, index, onChange, onRemove, previewOptional }: { previewOptional: boolean; item: RepresentationDraft; index: number; onChange: (next: RepresentationDraft) => void; onRemove: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const choose = (file?: File) => {
    if (!file) return;
    setError("");
    readImage(file, (preview) => onChange({ ...item, preview }), setError);
  };

  return <article className="rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 sm:p-5">
    <div className="flex items-start justify-between gap-3">
      <p className="text-[10px] font-semibold tracking-[.1em] text-slate-400">REPRESENTATION {String(index + 1).padStart(2, "0")}</p>
      <button type="button" onClick={onRemove} aria-label={`Remove ${item.name || "representation"}`} className="inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-[10px] font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 size={13}/>Remove representation</button>
    </div>
    <div className="mt-4 grid gap-5 sm:grid-cols-[104px_minmax(0,1fr)]">
      <div><p className="mb-1.5 text-xs font-medium text-slate-600">Screenshot{previewOptional ? " (optional)" : " *"}</p><div onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }} onDrop={(event) => { event.preventDefault(); choose(event.dataTransfer.files[0]); }} className="flex min-h-44 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50/80 p-3">
        {item.preview ? <button type="button" onClick={() => inputRef.current?.click()} aria-label={`Replace image for ${item.name || "representation"}`} className="group relative w-16"><ScreenPreview size="xs" name={item.name || "Representation"} preview={item.preview}/><span className="absolute inset-0 grid place-items-center rounded bg-slate-950/45 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">Replace</span></button> : <button type="button" onClick={() => inputRef.current?.click()} className="text-center text-[10px] font-semibold text-blue-700"><ImagePlus className="mx-auto mb-2" size={18}/>Add image</button>}
        <input ref={inputRef} type="file" className="sr-only" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" onChange={(event) => { choose(event.target.files?.[0]); event.target.value = ""; }}/>
      </div></div>
      <div className="representation-fields grid content-start gap-x-4 gap-y-5 sm:grid-cols-2">
        <fieldset className="sm:col-span-2"><legend className="text-xs font-medium text-slate-600">Type *</legend><div className="mt-1.5 inline-flex rounded-md border border-slate-200 bg-slate-50 p-1">{(["state", "variant"] as const).map((type) => <button key={type} type="button" aria-pressed={item.type === type} onClick={() => onChange({ ...item, type, stateType: type === "state" ? item.stateType : undefined, name: type === "variant" && item.stateType && item.name === item.stateType ? "" : item.name })} className={`min-h-8 rounded px-4 text-xs font-semibold transition-colors ${item.type === type ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>{type === "state" ? "State" : "Variant"}</button>)}</div><p className="mt-2 text-[10px] leading-4 text-slate-500"><strong className="font-semibold text-slate-600">State</strong> — a condition of this screen · <strong className="font-semibold text-slate-600">Variant</strong> — an alternate version of this screen</p></fieldset>
        {item.type === "state" && <label className="text-xs font-medium text-slate-600">State type *<select value={item.stateType ?? ""} onChange={(event) => { const stateType = event.target.value; onChange({ ...item, stateType, name: stateType === "Other / Custom" ? "" : stateType }); }} className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">Select state type</option>{stateTypes.map((stateType) => <option key={stateType} value={stateType}>{stateType}</option>)}</select></label>}
        <label className={`text-xs font-medium text-slate-600 ${item.type === "variant" ? "sm:col-span-2" : ""}`}>Name *<input value={item.name} onChange={(event) => onChange({ ...item, name: event.target.value })} placeholder={item.type === "variant" ? "e.g. Member version" : item.stateType === "Other / Custom" ? "Enter a custom state name" : "Select a state type above"} className="mt-1.5 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"/></label>
        <label className="text-xs font-medium text-slate-600 sm:col-span-2">Description <span className="font-normal text-slate-400">(optional)</span><textarea rows={2} value={item.description ?? ""} onChange={(event) => onChange({ ...item, description: event.target.value })} className="mt-1.5 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"/></label>
        <div className="flex items-center gap-3 sm:col-span-2"><label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={Boolean(item.isDefault)} onChange={(event) => onChange({ ...item, isDefault: event.target.checked })}/>Set as default</label>{item.preview && <button type="button" onClick={() => onChange({ ...item, preview: undefined })} className="text-xs font-semibold text-red-600">Remove image</button>}</div>
        {((item.type === "state" && !item.stateType) || !item.name.trim() || (!item.preview && !previewOptional) || error) && <p className="text-[11px] text-red-600 sm:col-span-2">{error || (item.type === "state" && !item.stateType ? "Choose a state type." : !item.name.trim() ? "Name is required." : "Screenshot is required.")}</p>}
      </div>
    </div>
  </article>;
}

export function RepresentationAuthoring({ platform, defaultPreview, items, onChange, embedded = true, optionalPreviewIds = [] }: { optionalPreviewIds?: string[]; platform: ScreenPlatform; defaultPreview?: string; items: RepresentationDraft[]; onChange: (items: RepresentationDraft[]) => void; embedded?: boolean }) {
  const add = () => onChange([...items, { id: crypto.randomUUID(), type: "state", stateType: undefined, name: "", order: items.length + 1 }]);
  const update = (index: number, next: RepresentationDraft) => onChange(items.map((item, itemIndex) => itemIndex === index ? { ...next, order: itemIndex + 1 } : next.isDefault ? { ...item, isDefault: false } : item));
  return <div className="mx-auto max-w-4xl">
    {!embedded && <div><p className="text-[10px] font-semibold tracking-[.12em] text-blue-700">SCREEN REPRESENTATIONS</p><h2 className="mt-1 text-lg font-semibold text-slate-950">Variants &amp; States</h2><p className="mt-1 text-xs text-slate-500">Manage the default screen and any additional states or variants for this platform.</p></div>}
    {embedded && <h2 className="mb-4 text-sm font-semibold text-slate-900">Representations</h2>}
    <section className={embedded ? "" : "mt-6"}><h3 className="text-sm font-semibold text-slate-900">Default representation</h3><div className="mt-3 flex max-w-xl items-start gap-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5"><div className="w-20 shrink-0">{defaultPreview ? <ScreenPreview size="xs" name="Default" preview={defaultPreview}/> : <div className="grid aspect-[375/812] place-items-center rounded border border-dashed border-slate-300 bg-white text-center text-[9px] text-slate-400">No default preview</div>}</div><div className="pt-1"><p className="text-xs font-semibold text-slate-900">{platform === "mobile" ? "Mobile" : "Web"} · <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-blue-700">Default</span></p><p className="mt-2 text-[11px] leading-5 text-slate-500">Uses the screenshot from Screen Information.</p></div></div></section>
    <section className="mt-8 border-t border-slate-200 pt-6"><div className="flex items-center justify-between gap-4"><div><h3 className="text-sm font-semibold text-slate-900">Additional representations</h3><p className="mt-1 text-[11px] text-slate-500">Optional variants and states attached to this canonical screen.</p></div><button type="button" onClick={add} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 hover:border-blue-300"><Plus size={14}/>Add representation</button></div>
    <div className="mt-5 space-y-4">{items.map((item, index) => <RepresentationItem key={item.id} previewOptional={optionalPreviewIds.includes(item.id)} item={item} index={index} onChange={(next) => update(index, next)} onRemove={() => onChange(items.filter((_, itemIndex) => itemIndex !== index).map((entry, order) => ({ ...entry, order: order + 1 })))}/>)}</div>
    {items.length === 0 && <div className="mt-5 rounded-lg border border-dashed border-slate-300 py-6 text-center text-xs text-slate-500">No additional states or variants yet.</div>}</section>
  </div>;
}
