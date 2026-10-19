import { ComingSoonView } from "@/components/availability/coming-soon-view";
import { ContentNavigationBar } from "@/components/layout/content-navigation-bar";
import { LibraryTree } from "@/components/tree/library-tree";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { screens } from "@/data/design-library";

const componentCount = new Set(screens.flatMap((screen) => screen.components.map((component) => component.name))).size;

export default function ComponentsPage() {
  return <div className="flex h-screen overflow-hidden bg-[#f7f8fa]"><LibraryTree/><section className="min-w-0 flex-1 overflow-y-auto"><WorkspaceHeader/><ContentNavigationBar active="components" count={componentCount} noun="components" sortEnabled={false}/><ComingSoonView type="product" itemName="Components" browseHref="/screens"/></section></div>;
}
