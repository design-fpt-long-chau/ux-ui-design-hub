"use client";
import { repositories } from "@/lib/repositories/provider";

import { ImageUp } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { loadScreenDraft, saveScreenDraft, type ScreenDraft } from "@/lib/repositories/client";
import { detectPlatformFromImageDimensions } from "@/lib/image-platform-detection";

const acceptedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const maxBytes = 2 * 1024 * 1024;

function isLibraryWorkspace(pathname: string) {
  if (pathname === "/" || pathname === "/screens") return true;
  const parts = pathname.split("/").filter(Boolean);
  return parts[0] === "screens" && parts.length >= 2 && parts.length <= 3;
}

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    repositories.assets.importFile(file, resolve, reject);
  });
}

function readDimensions(src: string) {
  return new Promise<{ width: number; height: number }>((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve({ width: 0, height: 0 });
    image.src = src;
  });
}

export function WorkspaceDropEntry({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const depth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState("");
  const enabled = isLibraryWorkspace(pathname);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 3200);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!enabled) return;
    const validTarget = (event: DragEvent) => {
      const target = event.target as HTMLElement | null;
      return Boolean(target?.closest("main") && !target.closest("[data-drop-exclusion], form, [role='dialog'], [role='listbox']"));
    };
    const enter = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes("Files") || !validTarget(event)) return;
      event.preventDefault(); depth.current += 1; setDragging(true);
    };
    const over = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes("Files") || !validTarget(event)) return;
      event.preventDefault(); event.dataTransfer.dropEffect = "copy";
    };
    const leave = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes("Files")) return;
      depth.current = Math.max(0, depth.current - 1);
      if (!depth.current) setDragging(false);
    };
    const drop = async (event: DragEvent) => {
      if (!validTarget(event)) return;
      event.preventDefault(); depth.current = 0; setDragging(false);
      const files = Array.from(event.dataTransfer?.files ?? []);
      if (files.length > 1) return setMessage("Multiple files detected — please add one screen at a time.");
      const file = files[0];
      if (!file || !acceptedTypes.has(file.type)) return setMessage("Unsupported file type — use PNG, JPG, JPEG or WEBP.");
      if (file.size > maxBytes) return setMessage("Image is too large — use a file smaller than 2 MB for this local MVP.");
      const dataUrl = await readFile(file);
      const dimensions = await readDimensions(dataUrl);
      const detection = detectPlatformFromImageDimensions(dimensions.width, dimensions.height);
      const suggestion = detection.platform ?? undefined;
      const current = loadScreenDraft();
      const manuallySelected = current?.platformSelectionSource === "manual" || current?.platformManuallySelected;
      const selectedPlatform = manuallySelected
        ? current.mobile ? "mobile" : current.web ? "web" : undefined
        : suggestion;
      const next: ScreenDraft = {
        ...current,
        businessUnitId: current?.businessUnitId ?? "", screenGroupId: current?.screenGroupId ?? "", name: current?.name ?? "",
        mobile: selectedPlatform === "mobile", web: selectedPlatform === "web", mobilePlatform: current?.mobilePlatform ?? "iOS", description: current?.description ?? "", whenItAppears: current?.whenItAppears ?? "", purpose: current?.purpose ?? "", uploadedBy: current?.uploadedBy ?? repositories.identity.current().authorName, status: current?.status ?? "active", platformSelectionSource: manuallySelected ? "manual" : selectedPlatform ? "auto" : undefined, platformManuallySelected: manuallySelected,
        ...(selectedPlatform === "mobile" ? { mobilePreview: dataUrl, stagedPreview: undefined } : selectedPlatform === "web" ? { webPreview: dataUrl, stagedPreview: undefined } : { stagedPreview: dataUrl }), stagedFileName: file.name, stagedFileSize: file.size, stagedWidth: dimensions.width, stagedHeight: dimensions.height, suggestedPlatform: suggestion,
      };
      saveScreenDraft(next);
      router.push("/manage/screens/new?entry=drop");
    };
    window.addEventListener("dragenter", enter); window.addEventListener("dragover", over); window.addEventListener("dragleave", leave); window.addEventListener("drop", drop);
    return () => { window.removeEventListener("dragenter", enter); window.removeEventListener("dragover", over); window.removeEventListener("dragleave", leave); window.removeEventListener("drop", drop); };
  }, [enabled, router]);

  return <>{children}{dragging && <div className="pointer-events-none fixed inset-y-3 right-3 left-[283px] z-50 grid place-items-center rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/92 backdrop-blur-sm"><div className="text-center"><span className="mx-auto grid size-11 place-items-center rounded-full bg-blue-700 text-white"><ImageUp size={20}/></span><p className="mt-4 text-lg font-semibold text-slate-950">Drop screen here</p><p className="mt-1 text-xs text-slate-500">PNG, JPG, JPEG or WEBP</p></div></div>}{message && <div role="status" className="toast-in fixed right-5 bottom-5 z-[60] max-w-sm rounded-lg border border-amber-200 bg-white px-4 py-3 text-xs font-medium text-slate-700 shadow-lg">{message}</div>}</>;
}
