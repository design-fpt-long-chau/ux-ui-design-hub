import { DataBackup } from "@/components/settings/data-backup";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { LibraryShell } from "@/components/layout/library-shell";
import { WorkspaceHeader } from "@/components/layout/workspace-header";

export default function Settings() {
  return <LibraryShell><WorkspaceHeader/><div className="library-page">
    <h1 className="text-2xl font-semibold text-slate-950">Settings</h1>
    <section className="mt-6 max-w-2xl rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-semibold text-slate-900">Appearance</h2>
      <p className="mt-2 text-sm text-slate-500">Choose Light, Dark, or System. System follows your device preference.</p>
      <div className="mt-4"><ThemeSwitcher/></div>
    </section>
    <DataBackup/>
  </div></LibraryShell>;
}
