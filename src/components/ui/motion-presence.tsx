"use client";

import { useEffect, useState, type ReactNode } from "react";

// Retain only the closing visual; inert removes it from interaction immediately.
export function MotionPresence({ children }: { children: ReactNode }) {
  const [retained, setRetained] = useState(children);
  const open = Boolean(children);
  if (open && retained !== children) setRetained(children);
  useEffect(() => {
    if (open) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--motion-fast")) || 140;
    const timer = window.setTimeout(() => setRetained(null), reduced ? 0 : duration);
    return () => window.clearTimeout(timer);
  }, [open]);
  return retained ? <div className="motion-presence" data-open={open} inert={!open} aria-hidden={!open}>{retained}</div> : null;
}
