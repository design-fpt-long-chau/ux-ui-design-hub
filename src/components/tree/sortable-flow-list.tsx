"use client";

import { GripVertical } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent as ReactMouseEvent, type PointerEvent, type ReactNode, type RefObject } from "react";
import { storageErrorMessage } from "@/lib/storage-errors";
import type { Flow } from "@/types/design-library";

type PendingDrag = { flowId: string; pointerId: number; pointerType: string; x: number; y: number; target: HTMLDivElement };
type ActiveDrag = {
  flowId: string; pointerId: number; sourceIndex: number; targetIndex: number;
  pointerX: number; pointerY: number; offsetX: number; offsetY: number;
  width: number; rowHeight: number; blockHeight: number; scrollTop: number; validTarget: boolean;
  layout: Map<string, { top: number; height: number }>;
};

export type FlowRowInteraction = {
  dragging: boolean;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLDivElement>) => void;
  onClickCapture: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
};

export function SortableFlowList({ flows, editingId, scrollRef, dark = false, onReorder, renderRow, renderChildren }: {
  flows: Flow[];
  editingId?: string;
  scrollRef: RefObject<HTMLDivElement | null>;
  dark?: boolean;
  onReorder: (flowIds: string[]) => void;
  renderRow: (flow: Flow, interaction: FlowRowInteraction) => ReactNode;
  renderChildren: (flow: Flow) => ReactNode;
}) {
  const list = useRef<HTMLDivElement>(null);
  const pending = useRef<PendingDrag | undefined>(undefined);
  const active = useRef<ActiveDrag | undefined>(undefined);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const suppressClick = useRef(false);
  const [drag, setDrag] = useState<ActiveDrag>();
  const [announcement, setAnnouncement] = useState("");
  const [error, setError] = useState("");

  const clearHold = () => { if (holdTimer.current) clearTimeout(holdTimer.current); holdTimer.current = undefined; };
  const cancel = () => {
    clearHold(); pending.current = undefined; active.current = undefined; setDrag(undefined);
  };

  useEffect(() => {
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape" && active.current) { event.preventDefault(); suppressClick.current = true; clearHold(); pending.current = undefined; active.current = undefined; setDrag(undefined); setAnnouncement("Flow reorder cancelled."); setTimeout(() => { suppressClick.current = false; }, 350); } };
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("keydown", escape); clearHold(); };
  }, []);
  useEffect(() => {
    if (!drag) return;
    document.body.classList.add("tree-flow-drag-active");
    return () => document.body.classList.remove("tree-flow-drag-active");
  }, [drag]);

  const activate = (candidate: PendingDrag) => {
    if (active.current || pending.current !== candidate || editingId) return;
    const element = list.current?.querySelector<HTMLElement>(`[data-flow-id="${CSS.escape(candidate.flowId)}"]`);
    const surface = element?.querySelector<HTMLElement>("[data-flow-drag-surface]");
    const scroller = scrollRef.current;
    if (!element || !surface || !scroller) return;
    const rect = surface.getBoundingClientRect();
    const layout = new Map(flows.map(flow => {
      const block = list.current?.querySelector<HTMLElement>(`[data-flow-id="${CSS.escape(flow.id)}"]`)?.getBoundingClientRect();
      return [flow.id, { top: block?.top ?? rect.top, height: block?.height ?? rect.height }] as const;
    }));
    const sourceIndex = flows.findIndex(flow => flow.id === candidate.flowId);
    candidate.target.setPointerCapture(candidate.pointerId);
    const value: ActiveDrag = { flowId: candidate.flowId, pointerId: candidate.pointerId, sourceIndex, targetIndex: sourceIndex, pointerX: candidate.x, pointerY: candidate.y, offsetX: candidate.x - rect.left, offsetY: candidate.y - rect.top, width: rect.width, rowHeight: rect.height, blockHeight: layout.get(candidate.flowId)?.height ?? rect.height, scrollTop: scroller.scrollTop, validTarget: true, layout };
    active.current = value; setDrag(value); setError("");
  };

  const updateTarget = (event: PointerEvent<HTMLDivElement>) => {
    const current = active.current;
    const scroller = scrollRef.current;
    if (!current || !scroller) return;
    const bounds = scroller.getBoundingClientRect();
    const edge = 42;
    if (event.clientY < bounds.top + edge) scroller.scrollBy({ top: -Math.max(5, (bounds.top + edge - event.clientY) / 3), behavior: "auto" });
    else if (event.clientY > bounds.bottom - edge) scroller.scrollBy({ top: Math.max(5, (event.clientY - (bounds.bottom - edge)) / 3), behavior: "auto" });
    const listBounds = list.current?.getBoundingClientRect();
    const validTarget = Boolean(listBounds && event.clientX >= listBounds.left - 12 && event.clientX <= listBounds.right + 12 && event.clientY >= listBounds.top - 12 && event.clientY <= listBounds.bottom + 12);
    const scrollDelta = scroller.scrollTop - current.scrollTop;
    const remaining = flows.filter(flow => flow.id !== current.flowId);
    const targetIndex = remaining.reduce((index, flow) => {
      const box = current.layout.get(flow.id);
      return box && event.clientY > box.top - scrollDelta + box.height / 2 ? index + 1 : index;
    }, 0);
    const next = { ...current, pointerX: event.clientX, pointerY: event.clientY, targetIndex, validTarget };
    active.current = next; setDrag(next);
  };

  const finish = () => {
    const current = active.current;
    if (!current) return cancel();
    if (!current.validTarget) {
      suppressClick.current = true;
      cancel();
      setAnnouncement("Flow reorder cancelled. Drop within the same group.");
      return setTimeout(() => { suppressClick.current = false; }, 450);
    }
    const remaining = flows.filter(flow => flow.id !== current.flowId).map(flow => flow.id);
    remaining.splice(current.targetIndex, 0, current.flowId);
    suppressClick.current = true;
    cancel();
    setTimeout(() => { suppressClick.current = false; }, 450);
    if (remaining.every((id, index) => id === flows[index]?.id)) return setAnnouncement("Flow order unchanged.");
    try {
      onReorder(remaining);
      const moved = flows.find(flow => flow.id === current.flowId);
      setAnnouncement(`${moved?.name ?? "Flow"} moved to position ${current.targetIndex + 1}.`);
      setError("");
    } catch (cause) { setError(storageErrorMessage(cause)); }
  };

  const begin = (flowId: string, event: PointerEvent<HTMLDivElement>) => {
    if (editingId || event.button !== 0 || (event.target as HTMLElement).closest("button,input,[data-flow-drag-ignore='true']")) return;
    const candidate = { flowId, pointerId: event.pointerId, pointerType: event.pointerType, x: event.clientX, y: event.clientY, target: event.currentTarget };
    pending.current = candidate;
    holdTimer.current = setTimeout(() => activate(candidate), event.pointerType === "touch" ? 300 : 175);
  };

  const interaction = (flow: Flow): FlowRowInteraction => ({
    dragging: drag?.flowId === flow.id,
    onPointerDown: event => begin(flow.id, event),
    onPointerMove: event => {
      const candidate = pending.current;
      if (!candidate || candidate.pointerId !== event.pointerId) return;
      const distance = Math.hypot(event.clientX - candidate.x, event.clientY - candidate.y);
      if (!active.current && candidate.pointerType !== "touch" && distance >= 6) activate(candidate);
      if (!active.current) return;
      event.preventDefault(); updateTarget(event);
    },
    onPointerUp: event => { if (pending.current?.pointerId !== event.pointerId) return; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); clearHold(); if (active.current) finish(); else pending.current = undefined; },
    onPointerCancel: event => { if (pending.current?.pointerId === event.pointerId) { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); if (active.current) { suppressClick.current = true; setTimeout(() => { suppressClick.current = false; }, 350); } cancel(); } },
    onClickCapture: event => { if (suppressClick.current || active.current) { event.preventDefault(); event.stopPropagation(); } },
    onKeyDown: event => {
      if (!event.altKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown") || (event.target as HTMLElement).closest("input,button")) return;
      event.preventDefault();
      const index = flows.findIndex(item => item.id === flow.id);
      const target = index + (event.key === "ArrowUp" ? -1 : 1);
      if (target < 0 || target >= flows.length) return setAnnouncement(`${flow.name} is already at the ${target < 0 ? "first" : "last"} position.`);
      const ids = flows.map(item => item.id); [ids[index], ids[target]] = [ids[target], ids[index]];
      try { onReorder(ids); setAnnouncement(`${flow.name} moved to position ${target + 1}.`); setError(""); } catch (cause) { setError(storageErrorMessage(cause)); }
    },
  });

  const remaining = drag ? flows.filter(flow => flow.id !== drag.flowId) : [];
  const insertionBefore = drag?.validTarget ? remaining[drag.targetIndex]?.id : undefined;
  const insertionAfter = drag?.validTarget && !insertionBefore ? remaining.at(-1)?.id : undefined;
  const shiftFor = (index: number) => !drag || flows[index].id === drag.flowId ? 0 : drag.sourceIndex < drag.targetIndex && index > drag.sourceIndex && index <= drag.targetIndex ? -drag.blockHeight : drag.sourceIndex > drag.targetIndex && index >= drag.targetIndex && index < drag.sourceIndex ? drag.blockHeight : 0;

  return <>
    <div ref={list} className="tree-flow-sortable-list">
      {/* eslint-disable-next-line react-hooks/refs -- interaction() only creates event handlers; refs are read after input events, never during render. */}
      {flows.map((flow, index) => <div key={flow.id} data-flow-id={flow.id} data-flow-dragging={drag?.flowId === flow.id || undefined} className="tree-flow-sortable-block relative" style={{ transform: `translateY(${shiftFor(index)}px)` }}>
        {insertionBefore === flow.id && <span aria-hidden className="tree-flow-insertion-line -top-0.5"/>}
        {renderRow(flow, interaction(flow))}
        {renderChildren(flow)}
        {insertionAfter === flow.id && <span aria-hidden className="tree-flow-insertion-line -bottom-0.5"/>}
      </div>)}
    </div>
    <p aria-live="polite" className="sr-only">{announcement}</p>
    {error && <p role="alert" className="px-2 py-1 text-[10px] text-red-600">{error}</p>}
    {drag && typeof document !== "undefined" && createPortal(<div aria-hidden className={`tree-flow-drag-ghost fixed z-[200] flex items-center gap-1.5 rounded-md border border-blue-200 bg-white px-2 text-xs font-semibold text-blue-700 shadow-lg ${dark ? "tree-flow-drag-ghost-dark" : ""} ${drag.validTarget ? "" : "opacity-60"}`} style={{ left: drag.pointerX - drag.offsetX, top: drag.pointerY - drag.offsetY, width: drag.width, height: drag.rowHeight }}><GripVertical size={13} className="text-blue-500"/><span className="truncate">{flows.find(flow => flow.id === drag.flowId)?.name}</span></div>, document.body)}
  </>;
}
