"use client";
import { repositories } from "@/lib/repositories/provider";
import { useBusinessUnitInventory } from "@/lib/use-business-units";
/* eslint-disable @next/next/no-img-element -- Browser-local previews use data URLs. */
import { MotionPresence } from "@/components/ui/motion-presence";

import { storageErrorMessage } from "@/lib/storage-errors";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImagePlus, Pencil, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { deleteLocalScreen, updateExistingScreenPreview, useScreenGroupInventory } from "@/lib/repositories/client";
import type { Screen, ScreenPlatform } from "@/types/design-library";
import { ContextualAnnotations } from "./contextual-annotations";
import { ScreenPreview } from "./screen-preview";

const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

type PendingAction = { kind: "replace"; file: File } | { kind: "remove" };

export function ExistingScreenPreviewEditor({ screen, platform, preview, annotations, name, previewTargetId }: { screen: Screen; platform: ScreenPlatform; preview?: string | null; annotations: Screen["annotations"]; name?: string; previewTargetId?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<PendingAction>();
  const [dragging, setDragging] = useState(false);
  const source = typeof preview === "string" ? preview.trim() : "";
  const platformAnnotations = (annotations ?? []).filter((annotation) => annotation.platform === platform);

  const persistFile = (file: File, clearAnnotations = false) => {
    setError("");
    if (!ACCEPTED_TYPES.has(file.type)) {
      setError("Choose a PNG, JPG, JPEG, or WEBP image.");
      return;
    }
    repositories.assets.importFile(file, (dataUrl) => {
      const image = new Image();
      image.onerror = () => setError("The selected file is not a valid image.");
      image.onload = () => {
        try {
          updateExistingScreenPreview(screen.id, platform, dataUrl, clearAnnotations, { width: image.naturalWidth, height: image.naturalHeight }, previewTargetId);
        } catch (cause) {
          setError(storageErrorMessage(cause));
        }
      };
      image.src = dataUrl;
    }, () => setError("The image could not be read."));
  };

  const selectFile = (file?: File) => {
    if (!file) return;
    if (source && platformAnnotations.length) setPending({ kind: "replace", file });
    else persistFile(file);
  };
  const remove = (clearAnnotations = false) => {
    try {
      updateExistingScreenPreview(screen.id, platform, null, clearAnnotations, undefined, previewTargetId);
      setPending(undefined);
      setError("");
    } catch (cause) {
      setError(storageErrorMessage(cause));
    }
  };
  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
    if (event.dataTransfer.files.length !== 1) {
      setError("Drop one image at a time.");
      return;
    }
    selectFile(event.dataTransfer.files[0]);
  };

  return <div className="relative">
    <div
      data-drop-exclusion
      onDragEnter={(event) => {
        event.preventDefault();
        const valid = Array.from(event.dataTransfer.items).some((item) => item.kind === "file" && ACCEPTED_TYPES.has(item.type));
        setDragging(valid);
      }}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
      onDragOver={(event) => { event.stopPropagation(); event.preventDefault(); event.dataTransfer.dropEffect = dragging ? "copy" : "none"; }}
      onDrop={onDrop}
      className="group/preview-editor relative rounded-[1.6rem]"
    >
      {platform === "web" ? <div className="aspect-video overflow-hidden rounded-lg border border-slate-200 bg-white">{source ? <img src={source} alt={`${name ?? screen.name} web preview`} className="size-full object-contain"/> : <div className="grid size-full place-items-center text-sm text-slate-400">No preview yet</div>}</div> : <ScreenPreview name={name ?? screen.name} preview={preview} status={screen.status} tone={screen.previewTone} size="xl"/>}
      <ContextualAnnotations annotations={annotations ?? []}/>
      {source ? <div className="pointer-events-none absolute inset-0 z-10 flex items-end justify-center rounded-[1.6rem] pb-4 opacity-0 transition motion-duration-fast group-hover/preview-editor:opacity-100 group-focus-within/preview-editor:opacity-100">
        <div className="pointer-events-auto flex gap-2">
          <button type="button" onClick={(event) => { event.stopPropagation(); inputRef.current?.click(); }} className="rounded-md bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm">Replace image</button>
          <button type="button" onClick={(event) => { event.stopPropagation(); setPending({ kind: "remove" }); }} className="rounded-md border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 shadow-sm">Remove image</button>
        </div>
      </div> : <button type="button" aria-label="Add preview image" onClick={() => inputRef.current?.click()} className="absolute inset-0 z-10 grid cursor-pointer place-items-center rounded-[1.6rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
        <span className="mt-20 inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 shadow-sm"><ImagePlus size={14}/> Add preview</span>
      </button>}
      {dragging && <div className="pointer-events-none absolute inset-0 z-40 grid place-items-center rounded-[1.6rem] border-2 border-dashed border-blue-500 bg-blue-50/90 text-center"><span className="rounded-md bg-white px-3 py-2 text-xs font-semibold text-blue-700 shadow-sm">Drop image to add preview</span></div>}
    </div>
    <input ref={inputRef} type="file" className="sr-only" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" onChange={(event) => { selectFile(event.target.files?.[0]); event.target.value = ""; }}/>
    {error && <p role="alert" className="mx-auto mt-2 max-w-[400px] text-center text-xs text-red-600">{error}</p>}
    <MotionPresence>{pending && <div className="absolute inset-0 z-50 grid place-items-center rounded-[1.6rem] bg-slate-950/45 p-5"><div role="alertdialog" aria-label={pending.kind === "replace" ? "Replace image warning" : "Remove image warning"} className="w-full max-w-xs rounded-xl bg-white p-4 text-left shadow-xl"><h2 className="text-sm font-semibold text-slate-950">{pending.kind === "replace" ? "Replace image?" : "Remove image?"}</h2><p className="mt-2 text-xs leading-5 text-slate-600">{platformAnnotations.length ? `This screen has ${platformAnnotations.length} annotation${platformAnnotations.length === 1 ? "" : "s"}. Image changes may make pin positions inaccurate.` : pending.kind === "remove" ? "This removes the preview image only. The canonical Screen and its Flow positions remain unchanged." : "This replaces the preview image while preserving the canonical Screen and its Flow positions."}</p><div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" onClick={() => setPending(undefined)} className="px-3 py-2 text-xs font-semibold text-slate-500">Cancel</button>{pending.kind === "replace" ? <button type="button" onClick={() => { persistFile(pending.file); setPending(undefined); }} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">Keep annotations</button> : <button type="button" onClick={() => remove()} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">Keep annotations</button>}<button type="button" onClick={() => { if (pending.kind === "replace") persistFile(pending.file, true); else remove(true); setPending(undefined); }} className="rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white">Clear annotations</button></div></div></div>}</MotionPresence>
  </div>;
}

export function ScreenRecordActions({ screen }: { screen: Screen }) {
  const businessUnits = useBusinessUnitInventory();
  const router = useRouter();
  const group = useScreenGroupInventory().find((item) => item.id === screen.screenGroupId);
  const unit = businessUnits.find(unit => unit.id === screen.businessUnitId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const galleryHref = `/screens/${unit?.slug ?? screen.businessUnitId}/${group?.slug ?? screen.screenGroupId.split(".").at(-1)}`;
  const removeScreen = () => {
    try {
      deleteLocalScreen(screen.id);
      setConfirmDelete(false);
      router.replace(galleryHref);
    } catch (cause) { setDeleteError(storageErrorMessage(cause)); }
  };
  return <div role="group" aria-label="Actions" className="detail-action-group">
    <Link href={`/manage/screens/${encodeURIComponent(screen.id)}/edit`} className="detail-action-button border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700"><Pencil aria-hidden size={13}/> Edit screen</Link>
    <button type="button" onClick={() => { setDeleteError(""); setConfirmDelete(true); }} className="detail-action-button border-red-200 bg-white text-red-600 hover:bg-red-50"><Trash2 aria-hidden size={13}/> Delete screen</button>
    <MotionPresence>{confirmDelete && <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/40 p-5"><div role="alertdialog" aria-modal="true" aria-label={`Delete screen ${screen.name}`} className="w-full max-w-md rounded-xl bg-white p-5 text-left shadow-xl"><h2 className="text-base font-semibold text-slate-950">Delete “{screen.name}”?</h2><p className="mt-2 text-sm leading-6 text-slate-600">This permanently removes the canonical Screen, its previews and notes. Flow definitions remain, and this Screen is removed from every Flow without changing the order of remaining Screens.</p>{deleteError && <p role="alert" className="mt-2 text-xs text-red-600">{deleteError}</p>}<div className="mt-5 flex justify-end gap-2"><button autoFocus type="button" onClick={() => setConfirmDelete(false)} className="rounded-md px-3 py-2 text-xs font-semibold text-slate-600">Cancel</button><button type="button" onClick={removeScreen} className="rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white">Delete screen</button></div></div></div>}</MotionPresence>
  </div>;
}