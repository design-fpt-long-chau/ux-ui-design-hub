import Link from "next/link";
import { screenPlatformHref } from "@/lib/screen-platform";
import type { Screen, ScreenPlatform } from "@/types/design-library";

function SegmentedGroup({ label, right, className, children }: { label: string; right: boolean; className: string; children: React.ReactNode }) {
  return <div className={`segmented-control ${className}`} role="group" aria-label={label}>
    <span className={`segmented-indicator ${right ? "is-right" : ""}`} aria-hidden="true" />
    {children}
  </div>;
}

export function DetailControls({ screen, flow, platform }: { screen: Screen; flow: boolean; platform: ScreenPlatform }) {
  return <>
    <SegmentedGroup label="Platform" right={platform === "web"} className="segmented-control-platform">
      <Link scroll={false} href={screenPlatformHref(screen, "mobile", flow)} aria-current={platform === "mobile" ? "page" : undefined}>Mobile</Link>
      <Link scroll={false} href={screenPlatformHref(screen, "web", flow)} aria-current={platform === "web" ? "page" : undefined}>Web</Link>
    </SegmentedGroup>
    <SegmentedGroup label="View" right={flow} className="segmented-control-view">
      <Link scroll={false} href={screenPlatformHref(screen, platform)} aria-current={!flow ? "page" : undefined}>Detail</Link>
      <Link scroll={false} href={screenPlatformHref(screen, platform, true)} aria-current={flow ? "page" : undefined}>Full Flow</Link>
    </SegmentedGroup>
  </>;
}
