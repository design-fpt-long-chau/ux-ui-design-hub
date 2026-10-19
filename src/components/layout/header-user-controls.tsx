"use client";

import Link from "next/link";
import { useIdentity } from "@/lib/use-identity";
import { ChevronDown, LogOut, Settings, UserRound } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { repositories } from "@/lib/repositories/provider";
import { logoutIdentity } from "@/lib/access-client";

export function HeaderUserControls({ collapsed = false }: { collapsed?: boolean }) {
  const user = useIdentity();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();
  const label = [user.displayName || "Not provided", user.role || user.title].filter(Boolean).join(" · ");
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  const logout = async () => {
    if (!repositories.identity.logout || busy) return;
    setBusy(true);
    setError("");
    try { await logoutIdentity(); setOpen(false); trigger.current?.focus(); }
    catch { setError("Could not log out. Please try again."); }
    finally { setBusy(false); }
  };
  const itemClass = "flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 focus-visible:bg-blue-50";
  return <div className={`flex items-center ${collapsed ? "flex-col gap-3" : "justify-between gap-2"}`}>
    <ThemeSwitcher collapsed={collapsed}/>
    <div ref={root} className="relative shrink-0" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
      <button ref={trigger} type="button" aria-label={`User menu: ${user.displayName || "Not provided"}`} title={label} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(value => !value)} onKeyDown={event => { if (["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); setOpen(true); } }} className="flex h-9 cursor-pointer items-center gap-1 rounded-md text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500"><span className="grid size-9 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white">{user.initials || "?"}</span><ChevronDown aria-hidden size={12}/></button>
      {open && <div ref={menu} id={id} role="menu" aria-label="User actions" className={`motion-popover absolute bottom-full z-[100] mb-2 w-56 rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl ${collapsed ? "left-0" : "right-0"}`} onKeyDown={event => {
        const items = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
        const index = items.findIndex(item => item === document.activeElement);
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
          event.preventDefault();
          const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
          items[next]?.focus();
        }
        if (event.key === "Escape") { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
      }}>
        <Link role="menuitem" href="/profile" onClick={() => setOpen(false)} className={itemClass}><UserRound aria-hidden size={15}/>Profile</Link>
        <Link role="menuitem" href="/settings" onClick={() => setOpen(false)} className={itemClass}><Settings aria-hidden size={15}/>Settings</Link>
        <div className="my-1 border-t border-slate-200"/>
        <button role="menuitem" type="button" aria-disabled={!repositories.identity.logout || busy} onClick={logout} className={`${itemClass} aria-disabled:cursor-not-allowed aria-disabled:opacity-50`}><LogOut aria-hidden size={15}/>{busy ? "Logging out…" : "Log out"}</button>
        {error && <p role="alert" className="px-3 py-2 text-xs text-red-600">{error}</p>}
      </div>}
    </div>
  </div>;
}
