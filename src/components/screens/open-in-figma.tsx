import { ExternalLink } from "lucide-react";
import { figmaLink } from "@/lib/figma-source";
import type { Screen } from "@/types/design-library";

export function OpenInFigma({ screen, className }: { screen: Screen; className?: string }) {
  const link = figmaLink(screen.figmaSource);
  if (!link.href) return <span role={screen.figmaSource ? "status" : undefined} className="text-xs text-slate-500">{link.error}</span>;
  return <a href={link.href} target="_blank" rel="noopener noreferrer" className={className}><ExternalLink size={14}/>Open in Figma</a>;
}
