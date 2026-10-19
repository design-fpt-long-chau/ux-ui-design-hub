import { Suspense } from "react";

import { DynamicScreenDetail } from "@/components/screens/dynamic-screen-detail";

export default async function ScreenPage({ params }: { params: Promise<{ businessUnitSlug: string; groupSlug: string; screenSlug: string }> }) {
  const { businessUnitSlug, groupSlug, screenSlug } = await params;
  return (
    <Suspense fallback={null}>
      <DynamicScreenDetail unitSlug={businessUnitSlug} groupSlug={groupSlug} screenSlug={screenSlug} />
    </Suspense>
  );
}
