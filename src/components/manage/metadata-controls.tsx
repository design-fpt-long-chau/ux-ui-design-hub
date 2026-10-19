"use client";
import { FieldError } from "@/components/ui/field-error";

import { useId, useRef, useState } from "react";
import { Check, ExternalLink, Pencil, Plus, X } from "lucide-react";
import { addTicketUrls, componentNames, jiraLink, ticketValues } from "@/lib/metadata-values";
import { registerComponentTag, useComponentTags } from "@/lib/component-tags";

const inputStyle = "mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-blue-500";
const chipStyle = "inline-flex max-w-full items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700";
const iconStyle = "grid size-6 shrink-0 place-items-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-blue-500";

export function TicketValue({ value }: { value: string }) {
  const link = jiraLink(value);
  return link ? <a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-w-0 items-center gap-1 break-all text-blue-700 hover:underline">{link.key}<ExternalLink size={12} className="shrink-0"/></a> : <span className="break-all">{value}</span>;
}

export function JiraField({ value, onChange, multiple = false }: { value: string; onChange: (value: string) => void; multiple?: boolean }) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const label = multiple ? "Related tickets" : "Jira";
  const values = multiple ? ticketValues(value) : value ? [value] : [];
  const showInput = multiple || editing || !value;
  const commit = (text: string) => {
    if (!text.trim()) { setError(""); return; }
    try {
      if (multiple) { onChange(addTicketUrls(values, text).join(", ")); setPending(""); }
      else {
        if (!jiraLink(text)) throw new Error("Paste a valid Jira URL containing a ticket key.");
        onChange(text.trim()); setEditing(false);
      }
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Invalid Jira URL."); }
  };
  return <div className="min-w-0"><label htmlFor={id} className="text-xs font-medium text-slate-600">{label}</label>
    {(!editing || multiple) && values.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1.5">{values.map((ticket, index) => <span key={`${ticket}-${index}`} className={chipStyle}>
      <TicketValue value={ticket}/>
      {!multiple && <button type="button" aria-label="Edit Jira ticket" onClick={() => { setPending(value); setEditing(true); setError(""); }} className={iconStyle}><Pencil size={12}/></button>}
      <button type="button" aria-label={`Remove ${jiraLink(ticket)?.key ?? ticket}`} onClick={() => { onChange(multiple ? values.filter((_, i) => i !== index).join(", ") : ""); setPending(""); setError(""); }} className={iconStyle}><X size={12}/></button>
    </span>)}</div>}
    {showInput && <input ref={input} autoFocus={editing} id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} value={multiple || editing ? pending : value} placeholder={multiple ? "Paste Jira URLs…" : "https://jira.example.com/browse/KEY-123"}
      onChange={event => { setPending(event.target.value); if (!multiple) onChange(event.target.value); setError(""); setEditing(!multiple); }}
      onPaste={event => { const text = event.clipboardData.getData("text"); event.preventDefault(); setPending(text); if (!multiple) { onChange(text); setEditing(true); } commit(text); }}
      onBlur={() => commit(multiple || editing ? pending : value)}
      onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); commit(multiple || editing ? pending : value); } }} className={inputStyle}/>}
    <FieldError id={`${id}-error`}>{error}</FieldError>
  </div>;
}

export function ComponentsField({ value, onChange }: { value: unknown; onChange: (value: string) => void }) {
  const id = useId();
  const tags = useComponentTags();
  const selected = componentNames(value);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const options = componentNames([...tags, ...selected]).filter(tag => tag.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const exact = [...tags, ...selected].find(tag => tag.toLocaleLowerCase() === query.trim().toLocaleLowerCase());
  const canCreate = Boolean(query.trim()) && !exact;
  const total = options.length + (canCreate ? 1 : 0);
  const choose = (name: string, create = false) => {
    try {
      const tag = create ? registerComponentTag(name) : name;
      if (!selected.some(item => item.toLocaleLowerCase() === tag.toLocaleLowerCase())) onChange([...selected, tag].join(", "));
      setQuery(""); setActive(0); setError(""); input.current?.focus();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to create tag."); }
  };
  return <div className="relative min-w-0 md:col-span-2" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
    <label htmlFor={id} className="text-xs font-medium text-slate-600">Components</label>
    {selected.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1.5">{selected.map(tag => <span key={tag.toLocaleLowerCase()} className={chipStyle}>{tag}<button type="button" aria-label={`Remove component ${tag}`} className={iconStyle} onClick={() => onChange(selected.filter(item => item !== tag).join(", "))}><X size={12}/></button></span>)}</div>}
    <input ref={input} id={id} aria-invalid={Boolean(error)} role="combobox" aria-expanded={open} aria-controls={open ? `${id}-list` : undefined} aria-autocomplete="list" aria-activedescendant={open && total > 0 ? `${id}-option-${active}` : undefined} placeholder="Search components..." value={query} onFocus={() => setOpen(true)}
      onChange={event => { setQuery(event.target.value); setActive(0); setOpen(true); setError(""); }}
      onKeyDown={event => {
        if (event.key === "Escape") { event.preventDefault(); setOpen(false); }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); const index = Math.max(0, Math.min(total - 1, active + (event.key === "ArrowDown" ? 1 : -1))); setActive(index); document.getElementById(`${id}-option-${index}`)?.scrollIntoView({ block: "nearest" }); }
        if (event.key === "Enter") { event.preventDefault(); if (!open) setOpen(true); else if (options[active]) choose(options[active]); else if (canCreate) choose(query.trim(), true); }
      }} className={inputStyle}/>
    <div hidden={!open} inert={!open} id={`${id}-list`} role="listbox" aria-label="Component tags" aria-multiselectable="true" className="motion-popover absolute inset-x-0 top-full z-30 mt-1 max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg">
      {options.map((tag, index) => <button type="button" role="option" id={`${id}-option-${index}`} key={tag} aria-selected={selected.some(item => item.toLocaleLowerCase() === tag.toLocaleLowerCase())} onMouseEnter={() => setActive(index)} onClick={() => choose(tag)} className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-xs ${active === index ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}>{tag}{selected.some(item => item.toLocaleLowerCase() === tag.toLocaleLowerCase()) && <Check size={13}/>}</button>)}
      {canCreate && <button type="button" role="option" aria-selected={false} id={`${id}-option-${options.length}`} onMouseEnter={() => setActive(options.length)} onClick={() => choose(query.trim(), true)} className={`flex w-full items-center gap-1 rounded px-3 py-2 text-left text-xs text-blue-700 ${active === options.length ? "bg-blue-50" : "hover:bg-blue-50"}`}><Plus size={13}/>Create “{query.trim()}”</button>}
      {!total && <p className="px-3 py-2 text-xs text-slate-500">Type to create a component tag.</p>}
    </div>
    <FieldError>{error}</FieldError>
  </div>;
}
