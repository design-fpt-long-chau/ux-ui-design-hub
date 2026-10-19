import { BusinessUnitOverview } from "@/components/screens/inventory-pages";

export default async function BusinessUnitPage({ params }: { params: Promise<{ businessUnitSlug: string }> }) {
  const { businessUnitSlug } = await params;
  return <BusinessUnitOverview unitSlug={businessUnitSlug}/>;
}
