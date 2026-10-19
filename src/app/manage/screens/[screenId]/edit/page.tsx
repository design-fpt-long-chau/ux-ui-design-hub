import { AddScreenForm } from "@/components/manage/add-screen-form";
import { LibraryTree } from "@/components/tree/library-tree";
import { WorkspaceHeader } from "@/components/layout/workspace-header";

export default async function EditScreenPage({ params }: { params: Promise<{ screenId: string }> }) {
  const { screenId } = await params;
  return <div className="flex h-screen overflow-hidden bg-[#f7f8fa]"><LibraryTree/><section className="min-w-0 flex-1 overflow-y-auto"><WorkspaceHeader/><AddScreenForm editScreenId={decodeURIComponent(screenId)}/></section></div>;
}