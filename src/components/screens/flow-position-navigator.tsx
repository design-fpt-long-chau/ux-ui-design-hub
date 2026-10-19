"use client";
import { useBusinessUnitInventory } from "@/lib/use-business-units";
import Link from "next/link";
import type { Screen } from "@/types/design-library";
import type { ScreenPlatform } from "@/types/design-library";
import { screenPlatformHref } from "@/lib/screen-platform";

export function FlowPositionNavigator({ selected, platform, screens, flowName }: { selected: Screen; platform: ScreenPlatform; screens: Screen[]; flowName: string }) {
  const units = useBusinessUnitInventory();
  const selectedIndex = screens.findIndex((screen) => screen.id === selected.id);

  return (
    <nav aria-label={`Position in flow ${flowName}`} className="flow-position-navigator">
      <p className="text-[10px] font-bold tracking-[.16em] text-slate-500">
        FLOW POSITION · {flowName.toLocaleUpperCase("vi")}
      </p>
      <div className="mt-2.5 min-w-0 overflow-x-auto pb-1">
        <ol className="flow-position-track grid min-w-0 items-start" style={{ gridTemplateColumns: `repeat(${screens.length}, minmax(72px, 1fr))` }}>
          {screens.map((screen, index) => {
            const current = screen.id === selected.id;
            const previous = index < selectedIndex;
            const flowSequence = index + 1;

            return (
              <li key={screen.id} className="flow-position-step relative flex min-w-0 items-start">
                <Link
                  scroll={false}
                  href={screenPlatformHref(screen, platform)}
                  aria-current={current ? "page" : undefined}
                  aria-label={`${String(flowSequence).padStart(2, "0")}. ${screen.name}`}
                  className={`group relative z-[1] flex w-full min-w-0 flex-col items-center rounded-md px-1 pb-1 text-center transition-colors motion-duration-fast ${
                    current
                      ? "text-blue-700"
                      : previous
                        ? "text-slate-700 hover:text-blue-700"
                        : "text-slate-400 hover:text-blue-700"
                  }`}
                >
                  <span
                    className={`flow-position-node grid size-7 place-items-center rounded-full border bg-[#f7f8fa] text-[10px] font-bold transition-colors motion-duration-fast ${
                      current
                        ? "border-blue-700 bg-blue-700 text-white"
                        : previous
                          ? "border-slate-400 text-slate-700 group-hover:border-blue-500 group-hover:text-blue-700"
                          : "border-slate-300 text-slate-500 group-hover:border-blue-400 group-hover:text-blue-700"
                    }`}
                  >
                    {String(flowSequence).padStart(2, "0")}
                  </span>
                  <span className={`flow-position-label mt-1.5 min-w-0 max-w-full px-1 text-[10px] leading-[13px] ${current ? "font-semibold" : "font-medium"}`}>
                    {screen.name}
                  </span>
                  <span className={`mt-0.5 text-[9px] font-semibold ${current ? "text-blue-600" : "invisible"}`}>
                    Current screen
                  </span>
                  <span role="tooltip" className="flow-position-tooltip">
                    <strong>{String(flowSequence).padStart(2, "0")} · {screen.name}</strong>
                    <span>{units.find(unit => unit.id === screen.businessUnitId)?.name ?? "Unknown Business Unit"} · {flowName}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
