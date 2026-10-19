"use client";

import { Bell, Copy, LogOut, Mail, Palette, Pencil, Phone, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { LibraryShell } from "@/components/layout/library-shell";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { repositories } from "@/lib/repositories/provider";
import { useIdentity } from "@/lib/use-identity";
import type { IdentityProfileUpdate } from "@/lib/repositories/contracts";
import { logoutIdentity } from "@/lib/access-client";

const buttonClass = "inline-flex h-9 items-center justify-center rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40";
export function ProfilePage() {
  const user = useIdentity();
  const [draft, setDraft] = useState<IdentityProfileUpdate | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const username = [user.username, user.domain].filter(Boolean).join(" · ");
  const copy = async (label: string, value: string) => {
    try { await navigator.clipboard.writeText(value); setNotice(`${label} copied.`); }
    catch { setNotice(`Could not copy ${label.toLowerCase()}. Select the text to copy it manually.`); }
  };
  const field = (label: string, value?: string, copyable = false) => <div className="flex min-w-0 items-center gap-3">
    <div className="min-w-0 flex-1"><dt className="text-xs font-medium text-slate-500">{label}</dt><dd className="mt-2 break-words text-sm text-slate-900">{value || "Not provided"}</dd></div>
    {copyable && <button type="button" disabled={!value} aria-label={`Copy ${label.toLowerCase()}`} title={`Copy ${label.toLowerCase()}`} onClick={() => copy(label, value!)} className="grid size-9 shrink-0 place-items-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"><Copy aria-hidden size={15}/></button>}
  </div>;
  const editField = (label: string, key: keyof IdentityProfileUpdate, type = "text") => <label className="block text-xs font-medium text-slate-600">{label}<input autoFocus={key === "displayName"} type={type} required={key === "displayName"} maxLength={key === "email" ? 254 : 120} value={draft?.[key] ?? ""} onChange={event => { setDraft(current => current && { ...current, [key]: event.target.value }); setError(""); }} className="mt-2 block h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"/></label>;
  const save = async () => {
    if (!draft || !repositories.identity.updateProfile || busy) return;
    setBusy(true); setError("");
    try { await repositories.identity.updateProfile(draft); setDraft(null); setNotice("Profile updated."); }
    catch { setError("Could not save profile. Your changes are still here. Try again."); }
    finally { setBusy(false); }
  };
  const logout = async () => {
    if (!repositories.identity.logout || busy) return;
    setBusy(true); setError("");
    try { await logoutIdentity(); }
    catch { setError("Could not log out. Please try again."); }
    finally { setBusy(false); }
  };
  return <LibraryShell><WorkspaceHeader/><div className="library-page"><div className="max-w-6xl">
    <header className="flex flex-wrap items-center gap-6">
      <div className="min-w-0 flex-1"><h1 className="text-2xl font-semibold tracking-tight text-slate-950">Profile</h1><p className="mt-2 text-sm text-slate-500">Manage your account information and preferences.</p></div>
      <p className="hidden text-right text-[10px] font-semibold leading-5 tracking-[.16em] text-slate-400 xl:block">GOOD DESIGN<br/>A HEALTHIER TOMORROW</p>
    </header>
    <section aria-label="Account profile" className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-6 flex flex-wrap items-center gap-4"><h2 className="flex-1 text-sm font-semibold text-slate-900">Account information</h2><button type="button" disabled={Boolean(draft) || busy || !repositories.identity.updateProfile} className={`${buttonClass} gap-2`} onClick={() => { setDraft({ displayName: user.displayName, fullName: user.fullName ?? "", email: user.email ?? "", phone: user.phone ?? "" }); setNotice(""); setError(""); }}><Pencil aria-hidden size={14}/>Edit Profile</button></div>
      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <div className="flex min-w-0 flex-col items-start gap-6 sm:flex-row">
          <span aria-hidden className="grid size-16 shrink-0 place-items-center rounded-full bg-blue-600 text-xl font-semibold text-white">{user.initials}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3"><h2 className="min-w-0 break-words text-xl font-semibold tracking-tight text-slate-950">{user.displayName || "Not provided"}</h2>{user.status?.trim() && <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${user.status.trim().toLowerCase() === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{user.status.trim()}</span>}</div>
            <dl className="mt-4 space-y-4">{field("Full name", user.fullName)}{field("Username/domain", username, true)}</dl>
          </div>
        </div>
        <dl className="grid content-start gap-4 border-t border-slate-200 pt-6 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-6">
          <div className="flex items-center gap-3"><Mail aria-hidden size={16} className="shrink-0 text-slate-400"/><div className="min-w-0 flex-1">{field("Email", user.email, true)}</div></div>
          <div className="flex items-center gap-3"><Phone aria-hidden size={16} className="shrink-0 text-slate-400"/><div className="min-w-0 flex-1">{field("Phone", user.phone, true)}</div></div>
          <div className="flex items-center gap-3"><ShieldCheck aria-hidden size={16} className="shrink-0 text-slate-400"/><div className="min-w-0 flex-1">{field("Role (read-only)", user.role || user.title)}</div></div>
        </dl>
      </div>
      {draft && <form className="mt-8 border-t border-slate-200 pt-6" onSubmit={event => { event.preventDefault(); void save(); }}>
        <fieldset disabled={busy} className="min-w-0"><legend className="mb-4 text-sm font-semibold text-slate-900">Edit profile</legend>
          <div className="grid gap-6 sm:grid-cols-2">{editField("Display name", "displayName")}{editField("Full name", "fullName")}{editField("Email", "email", "email")}{editField("Phone", "phone", "tel")}</div>
          <p className="mt-4 text-xs text-slate-500">Username, role, and identity are managed by your identity provider.</p>
          <div className="mt-6 flex items-center gap-2"><button type="submit" disabled={!draft.displayName.trim()} className="inline-flex h-9 items-center rounded-md bg-blue-700 px-4 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-40">{busy ? "Saving…" : "Save"}</button><button type="button" className={buttonClass} onClick={() => { setDraft(null); setError(""); }}>Cancel</button></div>
        </fieldset>
      </form>}
      {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
      <p role="status" className="mt-4 min-h-4 text-xs text-slate-600">{notice}</p>
    </section>
    <section aria-labelledby="profile-preferences" className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
      <h2 id="profile-preferences" className="text-sm font-semibold text-slate-950">Settings &amp; Preferences</h2>
      <div className="mt-6 flex flex-wrap items-center gap-4"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500"><Palette aria-hidden size={16}/></span><div className="min-w-48 flex-1"><h3 className="text-sm font-medium text-slate-900">Theme</h3><p className="mt-1 text-xs text-slate-500">Choose Light, Dark, or follow your system preference.</p></div><ThemeSwitcher align="end"/></div>
      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-200 pt-4"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500"><Bell aria-hidden size={16}/></span><div className="min-w-48 flex-1"><h3 className="text-sm font-medium text-slate-900">Notifications</h3><p className="mt-1 text-xs text-slate-500">Notifications are not available in this version.</p></div><button type="button" role="switch" aria-label="Notifications" aria-checked={false} disabled className="flex h-6 w-10 cursor-not-allowed items-center rounded-full bg-slate-200 p-1 opacity-50"><span className="size-4 rounded-full bg-white"/></button></div>
    </section>
    <section aria-label="Log out" className="mt-6 flex flex-wrap items-center gap-4 border-t border-slate-200 px-1 py-6">
      <LogOut aria-hidden size={16} className="shrink-0 text-red-600"/><div className="min-w-48 flex-1"><h2 className="text-sm font-semibold text-slate-900">Log out</h2><p className="mt-1 text-xs text-slate-500">End your current session on this device.</p></div><button type="button" disabled={busy || !repositories.identity.logout} onClick={logout} className="inline-flex h-9 items-center rounded-md border border-red-300 px-4 text-xs font-semibold text-red-600 transition-colors motion-duration-fast enabled:hover:border-red-600 enabled:hover:bg-red-600 enabled:hover:text-white! enabled:focus-visible:border-red-600 enabled:focus-visible:bg-red-600 enabled:focus-visible:text-white! focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:opacity-40">Log out</button>
    </section>
  </div></div></LibraryShell>;
}
