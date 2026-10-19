import { FlowsPage } from "@/components/flows/flows-page";

export default async function FlowsIndexPage({ searchParams }: { searchParams: Promise<{ businessUnitId?: string }> }) {
  const { businessUnitId } = await searchParams;
  return <FlowsPage businessUnitId={businessUnitId}/>;
}
