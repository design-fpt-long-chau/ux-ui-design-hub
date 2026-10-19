import { AddScreenForm } from "@/components/manage/add-screen-form";
import { LibraryTree } from "@/components/tree/library-tree";
import { WorkspaceHeader } from "@/components/layout/workspace-header";

type AddScreenPageProps = {
  searchParams: Promise<{ businessUnitId?: string | string[]; screenGroupId?: string | string[]; flowId?: string | string[] }>;
};

export default async function AddScreenPage({ searchParams }: AddScreenPageProps) {
  const params = await searchParams;
  const businessUnitId = typeof params.businessUnitId === "string" ? params.businessUnitId : undefined;
  const screenGroupId = typeof params.screenGroupId === "string" ? params.screenGroupId : undefined;
  const flowId = typeof params.flowId === "string" ? params.flowId : undefined;
  return <div className="flex h-screen overflow-hidden bg-[#f7f8fa]"><LibraryTree/><section className="min-w-0 flex-1 overflow-y-auto"><WorkspaceHeader/><AddScreenForm context={{ businessUnitId, screenGroupId, flowId }}/></section></div>;
}
