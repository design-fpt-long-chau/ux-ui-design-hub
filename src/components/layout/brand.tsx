import Link from "next/link";

export function Brand({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Long Châu Design Library home"
      className={`flex items-center rounded-md ${compact ? "justify-center" : "gap-3"} ${dark ? "text-white" : "text-slate-950"}`}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-blue-600 text-xs font-black text-white shadow-sm">LC</span>
      {!compact && (
        <span className="text-[13px] font-bold leading-tight tracking-tight">
          LONG CHÂU<br />
          <span className={dark ? "text-slate-400" : "text-slate-500"}>DESIGN LIBRARY</span>
        </span>
      )}
    </Link>
  );
}

