export function jiraLink(value: string) {
  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return undefined;
    const searchable = decodeURIComponent(url.pathname) + " " + [...url.searchParams.values()].join(" ");
    const key = searchable.match(/\b[A-Z][A-Z0-9]*-\d+\b/)?.[0];
    return key ? { key, url: value.trim() } : undefined;
  } catch { return undefined; }
}

export function ticketValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(ticketValues);
  return typeof value === "string" ? value.split(/[,\n]+/).map(item => item.trim()).filter(Boolean) : [];
}

export function addTicketUrls(existing: string[], input: string) {
  const incoming = ticketValues(input);
  if (!incoming.length || incoming.some(value => !jiraLink(value))) throw new Error("Paste a valid Jira URL containing a ticket key.");
  const result = [...existing];
  for (const value of incoming) {
    const key = jiraLink(value)!.key;
    if (!result.some(item => item === value || (jiraLink(item)?.key ?? item).toUpperCase() === key)) result.push(value);
  }
  return result;
}

export function componentNames(value: unknown): string[] {
  const source: unknown[] = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  const names = source.flatMap(item => typeof item === "string" ? [item.trim()] : item && typeof item === "object" && "name" in item && typeof item.name === "string" ? [item.name.trim()] : []).filter(Boolean);
  const unique = new Map<string, string>();
  for (const name of names) if (!unique.has(name.toLocaleLowerCase())) unique.set(name.toLocaleLowerCase(), name);
  return [...unique.values()];
}
