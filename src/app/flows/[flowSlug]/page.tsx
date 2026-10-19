import { DynamicFlowDetail } from "@/components/flows/dynamic-flow-detail";

export default async function FlowPage({ params }: { params: Promise<{ flowSlug: string }> }) {
  const { flowSlug } = await params;
  return <DynamicFlowDetail slug={flowSlug}/>;
}
