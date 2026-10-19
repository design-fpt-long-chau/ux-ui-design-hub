import { ScreenGroupGallery } from "@/components/screens/inventory-pages";

export default async function GroupPage({ params }: { params: Promise<{ businessUnitSlug: string; groupSlug: string }> }) {
  const { businessUnitSlug, groupSlug } = await params;
  return <ScreenGroupGallery unitSlug={businessUnitSlug} groupSlug={groupSlug}/>;
}
