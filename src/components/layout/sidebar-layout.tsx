import { HeaderUserControls } from "@/components/layout/header-user-controls";

export function SidebarLayout({ collapsed, dark, children }: { collapsed: boolean; dark: boolean; children: React.ReactNode }) {
  return <aside data-collapsed={collapsed} className={`library-tree sticky top-0 z-30 flex h-dvh min-h-0 shrink-0 flex-col overflow-visible border-r border-slate-200 bg-white py-5 transition-[width,padding] duration-[180ms] ease-out motion-reduce:transition-none ${collapsed ? "w-28 px-3" : "w-[288px] px-4"} ${dark ? "library-tree-dark" : ""}`}>
    {children}
    <footer aria-label="User preferences" className="mt-3 shrink-0 border-t border-slate-200 pt-3">
      <HeaderUserControls collapsed={collapsed}/>
    </footer>
  </aside>;
}
