import type { ReactNode } from "react";
import { AppSidebar } from "./app-sidebar";

export function LibraryShell({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen bg-[#f7f8fa]"><AppSidebar/><main className="min-w-0 flex-1">{children}</main></div>;
}
