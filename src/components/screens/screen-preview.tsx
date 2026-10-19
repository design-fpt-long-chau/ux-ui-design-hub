"use client";

import { ImageOff } from "lucide-react";
import { useState } from "react";
import type { PreviewStatus } from "@/types/design-library";

export type ScreenPreviewSize = "xs" | "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<ScreenPreviewSize, string> = {
  xs: "max-w-[92px]",
  sm: "max-w-[128px]",
  md: "max-w-[160px]",
  lg: "max-w-[210px]",
  xl: "max-w-[400px]",
};

const placeholderCopy: Record<Exclude<PreviewStatus, "active"> | "missing", { compact: string; full: string; support?: string }> = {
  missing: { compact: "No preview", full: "No preview yet", support: "No screenshot added" },
  "coming-soon": { compact: "Coming soon", full: "Coming soon" },
  unavailable: { compact: "Unavailable", full: "Preview unavailable" },
};

function frameClasses(size: ScreenPreviewSize) {
  const miniature = size === "xs" || size === "sm";
  return `relative mx-auto aspect-[375/812] w-full shrink-0 overflow-hidden ${sizeClasses[size]} ${miniature ? "rounded-[.8rem]" : "rounded-[1.6rem]"}`;
}

export function ScreenPreviewPlaceholder({ size, status = "missing" }: { size: ScreenPreviewSize; status?: Exclude<PreviewStatus, "active"> | "missing" }) {
  const small = size === "xs" || size === "sm";
  const large = size === "xl";
  const copy = placeholderCopy[status];

  return <div data-preview-placeholder={status} className={`${frameClasses(size)} grid place-items-center border border-slate-200 bg-slate-100 text-center text-slate-400`}>
    <div className={`flex flex-col items-center ${small ? "gap-1 px-1" : "gap-2 px-3"}`}>
      <ImageOff aria-hidden size={small ? 13 : large ? 24 : 18} strokeWidth={1.5}/>
      <p className={`${small ? "text-[6px]" : large ? "text-xs" : "text-[9px]"} font-medium text-slate-500`}>{small ? copy.compact : copy.full}</p>
      {large && copy.support && <p className="text-[10px] text-slate-400">{copy.support}</p>}
    </div>
  </div>;
}

function PlaceholderContent({ size }: { size: ScreenPreviewSize }) {
  const small = size === "xs" || size === "sm";
  const large = size === "xl";
  return <div className="grid size-full place-items-center bg-slate-100 text-center text-slate-400">
    <div className={`flex flex-col items-center ${small ? "gap-1 px-1" : "gap-2 px-3"}`}>
      <ImageOff aria-hidden size={small ? 13 : large ? 24 : 18} strokeWidth={1.5}/>
      <p className={`${small ? "text-[6px]" : large ? "text-xs" : "text-[9px]"} font-medium text-slate-500`}>{small ? "No preview" : "No preview yet"}</p>
      {large && <p className="text-[10px] text-slate-400">No screenshot added</p>}
    </div>
  </div>;
}

export function ScreenPreview({ name, preview, status = "active", size, compact: legacyCompact }: { name: string; preview?: string | null; status?: PreviewStatus; size?: ScreenPreviewSize; compact?: boolean; tone?: string }) {
  const resolvedSize = size ?? (legacyCompact ? "md" : "lg");
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const source = typeof preview === "string" ? preview.trim() : "";

  if (status === "coming-soon" || status === "unavailable") {
    const comingSoon = status === "coming-soon";
    return <div
      data-preview-status={status}
      role="img"
      tabIndex={0}
      aria-label={`${name} — ${comingSoon ? "Coming soon" : "Preview unavailable"}`}
      className={`${frameClasses(resolvedSize)} group/disabled-preview cursor-pointer border border-slate-200 bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`}
    >
      <div className="size-full opacity-50 grayscale transition-opacity motion-duration-fast group-hover/disabled-preview:opacity-60 group-focus-visible/disabled-preview:opacity-60">
        {source && failedSource !== source ? <>
          {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary preview URLs need a native load-error fallback */}
          <img ref={(image) => { if (image?.complete && image.naturalWidth === 0) setFailedSource(source); }} src={source} alt="" onError={() => setFailedSource(source)} className="size-full object-contain"/>
        </> : <PlaceholderContent size={resolvedSize}/>} 
      </div>
      <div className="absolute inset-0 grid place-items-center bg-slate-950/55 px-2 text-center opacity-0 transition-opacity motion-duration-fast group-hover/disabled-preview:opacity-100 group-focus-visible/disabled-preview:opacity-100">
        <div className="translate-y-1 text-white opacity-0 transition motion-duration-fast group-hover/disabled-preview:translate-y-0 group-hover/disabled-preview:opacity-100 group-focus-visible/disabled-preview:translate-y-0 group-focus-visible/disabled-preview:opacity-100">
          <p className={`${resolvedSize === "xs" || resolvedSize === "sm" ? "text-[8px]" : "text-xs"} font-semibold`}>{comingSoon ? "Coming soon" : "Preview unavailable"}</p>
          {comingSoon && resolvedSize !== "xs" && <p className={`${resolvedSize === "sm" ? "mt-0.5 text-[6px]" : "mt-1 text-[9px]"} text-slate-200`}>View status</p>}
        </div>
      </div>
    </div>;
  }
  if (!source || failedSource === source) return <ScreenPreviewPlaceholder size={resolvedSize}/>;

  return <div className={`${frameClasses(resolvedSize)} border border-slate-200 bg-slate-50`}>
    {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary preview URLs need a native load-error fallback */}
    <img
      ref={(image) => {
        if (image?.complete && image.naturalWidth === 0) setFailedSource(source);
      }}
      src={source}
      alt={`${name} preview`}
      onError={() => setFailedSource(source)}
      className="size-full object-contain"
    />
  </div>;
}
